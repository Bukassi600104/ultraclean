import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

// Isolated WASM PostgreSQL only: never reads .env or opens a network database.
const runtime=process.env.FARM_V2_PGLITE_PATH||path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/@electric-sql/pglite/dist/index.js');
const {PGlite}=await import(pathToFileURL(runtime));
const db=new PGlite();
const ids=['admin','manager','property_manager','content_manager','suspended'].map((_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const [admin,farm,property,content,suspended]=ids;
let checks=0;
const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
function equal(a,b){assert.deepEqual(a,b);checks++;}
async function deny(fn,code){await assert.rejects(fn,e=>{assert.equal(e.code,code,e.message);return true;});checks++;}
async function write(domain,actor,kind,operation,payload={},id=null,reason=null,request=null){return scalar(`select public.${domain}_write($1::uuid,$2,$3,$4::jsonb,$5::uuid,$6,$7::uuid)`,[actor,kind,operation,JSON.stringify(payload),id,reason,request]);}
async function role(role,actor,fn){await db.exec(`set role ${role}`);try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor||'']);return await fn();}finally{await db.exec('reset role');}}
const report={farm1:{pond1:'Good',pond2:'Good',pond3:'Good',pond4:'Good',water_issue:''},farm2:{vat1:'Good',vat2:'Good',vat3:'Good',mortality:'0',water_issue:'',pump_status:'Working'},livestock:{goats:'Good',ram:'Good',cattle:'Good',piggery:'Good',poultry:'Good',mortality:'0',sick_animals:'None',feed:'Adequate',water:'Adequate'},crops:{report:'Checked'},people:{workers_present:2,supervisor:'Test',tasks_completed:'Inspection'},problems:{issues:'Pump repair needed',action_taken:'Isolated',request_category:'repair'}};
const date='2026-10-05';
try{
 await db.exec(await readFile(new URL('../tests/fixtures/farm-v2-schema.sql',import.meta.url),'utf8'));
 // Fixture intentionally omits this production constraint; add the captured prerequisite.
 await db.exec("alter table profiles add constraint profiles_role_check check(role in ('admin','manager'))");
 await db.query('insert into auth.users(id) values($1),($2),($3),($4),($5)',ids);
 await db.query("insert into profiles(id,role,name,suspended) values($1,'admin','Admin',false),($2,'manager','Farm',false),($3,'manager','Property fixture',false),($4,'manager','Content fixture',false),($5,'manager','Suspended',true)",ids);
 await db.exec("insert into farm_inventory(product,current_stock) values('catfish',100);insert into farm_sales(date,customer_name,product,quantity,unit_price,created_by) select '2026-01-01','Legacy','catfish',2,100,id from profiles where name='Farm';");
 for(const name of ['012_primefield_v2.sql','013_primefield_v2_write_boundary.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const functions=await scalar("select string_agg(pg_get_functiondef(oid),'|' order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('farm_v2_write','farm_v2_lock_date','is_admin','is_manager')");
 const legacy=await scalar('select jsonb_agg(to_jsonb(s)) from farm_sales s');
 const profiles=await scalar('select jsonb_agg(to_jsonb(p) order by id) from profiles p');
 const oldTables=(await db.query("select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' order by relname")).rows.map(r=>r.relname);
 const beforeCounts={};for(const t of oldTables)beforeCounts[t]=await scalar(`select count(*)::int from ${t}`);
 const newMigrations=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>/^20261005.*bossbimbz_operations.sql$/.test(n)).sort();
 equal(newMigrations.length,3);
 for(const name of newMigrations)await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 equal(await scalar("select string_agg(pg_get_functiondef(oid),'|' order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('farm_v2_write','farm_v2_lock_date','is_admin','is_manager')"),functions);
 equal(await scalar('select jsonb_agg(to_jsonb(s)) from farm_sales s'),legacy);
 equal(await scalar('select jsonb_agg(to_jsonb(p) order by id) from profiles p'),profiles);
 for(const t of oldTables)equal(await scalar(`select count(*)::int from ${t}`),beforeCounts[t]);
 await db.query("update profiles set role='property_manager' where id=$1",[property]);await db.query("update profiles set role='content_manager' where id=$1",[content]);
 for(const [d,actor] of [['property',farm],['property',content],['content',farm],['content',property],['farm_operations',property],['farm_operations',content],['property',suspended],['content',suspended],['farm_operations',suspended]])await deny(()=>write(d,actor,'invalid','create',{}),'42501');
 for(const actor of [property,content])await deny(()=>scalar("select farm_v2_write($1,'expense','create','{\"date\":\"2026-10-05\",\"category\":\"labor\",\"amount\":1}')",[actor]),'42501');
 const retry='00000000-0000-4000-8000-000000000100';
 const payload={report_date:date,sections:report,decision_required:true};
 const draft=await write('farm_operations',farm,'report','create',payload,null,null,retry);
 equal((await write('farm_operations',farm,'report','create',payload,null,null,retry)).id,draft.id);
 await deny(()=>write('farm_operations',farm,'report','create',{...payload,decision_required:false},null,null,retry),'23514');
 await deny(()=>write('farm_operations',farm,'report','update',{expected_revision:1,sections:report},draft.id),'40001');
 await deny(()=>write('farm_operations',farm,'report','update',{expected_revision:0,sections:{...report,foreign:{}}},draft.id),'22023');
 const submitted=await write('farm_operations',farm,'report','submit',{expected_revision:0},draft.id);
 equal(submitted.status,'submitted');
 const linked=await scalar('select to_jsonb(t) from farm_operational_requests t where report_id=$1',[draft.id]);equal(linked.category,'repair');equal(linked.requested_by,farm);
 await deny(()=>write('farm_operations',farm,'report','update',{expected_revision:1,sections:report},draft.id),'23514');
 await deny(()=>write('farm_operations',farm,'request','approve',{expected_revision:0,ceo_response:'Approved'},linked.id),'42501');
 const approval=await write('farm_operations',admin,'request','approve',{expected_revision:0,ceo_response:'Approved'},linked.id,'Reviewed');equal(approval.status,'approved');
 await deny(()=>write('farm_operations',admin,'request','decline',{expected_revision:0,ceo_response:'Declined'},linked.id,'Reviewed'),'40001');
 equal((await write('farm_operations',admin,'request','resolve',{expected_revision:1,ceo_response:'Completed',resolution:'Pump repaired'},linked.id,'Verified')).status,'resolved');
 equal((await write('farm_operations',admin,'report','review',{expected_revision:1,review_note:'Reviewed'},draft.id)).reviewed_by,admin);
 await scalar("select farm_v2_write($1,'day','close',jsonb_build_object('date',$2::text))",[farm,'2026-10-06']);
 await deny(()=>write('farm_operations',farm,'report','create',{...payload,report_date:'2026-10-06'}),'23514');
 await deny(()=>write('farm_operations',admin,'report','create',{...payload,report_date:'2026-10-06'}),'22023');
 const invalid={...report,problems:{...report.problems,request_category:'invalid'}};
 const second=await write('farm_operations',farm,'report','create',{report_date:'2026-10-07',sections:invalid,decision_required:true});
 await deny(()=>write('farm_operations',farm,'report','submit',{expected_revision:0},second.id),'23514');
 equal(await scalar('select status from farm_daily_reports where id=$1',[second.id]),'draft');equal(await scalar('select count(*)::int from farm_operational_requests where report_id=$1',[second.id]),0);
 const p=await write('property',property,'property','create',{name:'Test property',address:'Test address',currency:'CAD'});
 const unit=await write('property',property,'unit','create',{property_id:p.id,name:'1'});equal(unit.status,'vacant');
 await deny(()=>write('property',property,'unit','update',{expected_revision:0,status:'occupied'},unit.id,'Test'),'23514');
 const tenancyPayload={unit_id:unit.id,tenant_name:'Test tenant',start_date:'2026-10-01',rent_amount:1000,currency:'CAD'};
 const tenancy=await write('property',property,'tenancy','create',tenancyPayload);equal(await scalar('select status from property_units where id=$1',[unit.id]),'occupied');
 await deny(()=>write('property',property,'tenancy','create',tenancyPayload),'23505');
 await deny(()=>write('property',property,'unit','update',{expected_revision:1,status:'vacant'},unit.id,'Test'),'23514');
 const payment={tenancy_id:tenancy.id,amount:1000,currency:'CAD',payment_date:date,period_start:'2026-10-01',period_end:'2026-10-31',payment_method:'bank'};
 await deny(()=>write('property',property,'rent_payment','create',{...payment,currency:'NGN'}),'23514');
 await deny(()=>write('property',property,'rent_payment','create',{...payment,period_end:'2026-09-01'}),'23514');
 await deny(()=>write('property',property,'rent_payment','create',{...payment,payment_date:'2026-02-30'}),'22008');
 const rent=await write('property',property,'rent_payment','create',payment,null,null,'00000000-0000-4000-8000-000000000101');equal(rent.amount,1000);
 const another=await write('property',admin,'property','create',{name:'Second property',address:'Another address',currency:'NGN'});
 await deny(()=>write('property',property,'expense','create',{property_id:another.id,unit_id:unit.id,category:'repair',amount:100,currency:'NGN',expense_date:date}),'23503');
 await deny(()=>write('property',property,'tenancy','update',{expected_revision:0,status:'ended',end_date:date},tenancy.id,'Ended too early'),'23514');
 await write('property',property,'tenancy','update',{expected_revision:0,status:'ended',end_date:'2026-10-31'},tenancy.id,'Ended');equal(await scalar('select status from property_units where id=$1',[unit.id]),'vacant');
 const unavailableUnit=await write('property',property,'unit','create',{property_id:p.id,name:'Unavailable unit',status:'unavailable'});
 const historicalTenancy=await write('property',property,'tenancy','create',{...tenancyPayload,unit_id:unavailableUnit.id,status:'ended',end_date:'2026-10-31'});
 equal(await scalar('select status from property_units where id=$1',[unavailableUnit.id]),'unavailable');
 await write('property',property,'tenancy','update',{expected_revision:0,tenant_name:'Correct historical name'},historicalTenancy.id,'Correct historical name');
 equal(await scalar('select status from property_units where id=$1',[unavailableUnit.id]),'unavailable');
 await deny(()=>write('property',property,'property','update',{expected_revision:0,currency:'USD'},p.id,'Change'),'23514');
 await deny(()=>write('property',property,'property','update',{expected_revision:0,created_by:farm},p.id,'Tamper'),'22023');
 const record=await write('content',content,'record','create',{title:'Test content',platform:'instagram',content_type:'reel'});equal(record.status,'draft');
 await deny(()=>write('content',content,'record','update',{expected_revision:0,status:'published'},record.id,'Publish'),'23514');
 await deny(()=>write('content',content,'record','update',{expected_revision:0,status:'scheduled'},record.id,'Schedule'),'23514');
 await deny(()=>write('content',content,'record','update',{expected_revision:0,url:'javascript:alert(1)'},record.id,'Link'),'23514');
 const published=await write('content',content,'record','update',{expected_revision:0,status:'published',published_at:'2026-10-05T10:00:00Z',url:'https://example.com/content'},record.id,'Published');equal(published.status,'published');
 const snapshot={platform:'instagram',metric_date:date,followers:100,reach:200};
 await write('content',content,'performance','create',snapshot);
 await deny(()=>write('content',content,'performance','create',snapshot),'23505');
 await deny(()=>write('content',content,'performance','create',{...snapshot,metric_date:'2026-10-06',source:'official'}),'42501');
 await deny(()=>write('content',content,'performance','create',{content_id:record.id,platform:'tiktok',metric_date:date,reach:5}),'23514');
 await deny(()=>write('content',content,'integration','create',{platform:'instagram'}),'42501');
 const integration=await write('content',admin,'integration','create',{platform:'instagram',account_id:'test_account',account_name:'CEO',status:'connected'});equal(integration.authorized_by,admin);
 await deny(()=>write('content',content,'token','create',{integration_id:integration.id,ciphertext:'Encrypted ciphertext test value 12345'}),'42501');
 const secret='Encrypted ciphertext test value 12345';
 const token=await write('content',admin,'token','create',{integration_id:integration.id,ciphertext:secret});equal(token.ciphertext,undefined);
 equal((await scalar('select content_social_token_read($1,$2)',[admin,integration.id])).ciphertext,secret);
 const metadata=await scalar('select content_social_token_metadata($1,$2)',[admin,integration.id]);equal(metadata.id,token.id);equal(metadata.revision,0);equal(metadata.ciphertext,undefined);
 await deny(()=>scalar('select content_social_token_metadata($1,$2)',[content,integration.id]),'42501');
 await role('authenticated',admin,()=>deny(()=>scalar('select content_social_token_metadata($1,$2)',[admin,integration.id]),'42501'));
 await deny(()=>scalar('select content_social_token_read($1,$2)',[content,integration.id]),'42501');
 equal(await scalar("select count(*)::int from content_audit where after_value::text like '%Encrypted ciphertext%'"),0);
 const tables=(await db.query("select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and (relname like 'property_%' or relname like 'content_%' or relname in ('farm_daily_reports','farm_operational_requests','farm_operation_events','farm_operation_receipts'))")).rows.map(r=>r.relname);
 for(const table of tables){
  equal(await scalar('select relrowsecurity from pg_class where oid=$1::regclass',[table]),true);
  for(const r of ['anon','authenticated','service_role'])for(const privilege of ['INSERT','UPDATE','DELETE'])equal(await scalar('select has_table_privilege($1,$2,$3)',[r,table,privilege]),false);
 }
 for(const domain of ['farm_operations','property','content'])for(const r of ['anon','authenticated'])await role(r,farm,()=>deny(()=>write(domain,farm,'invalid','create',{}),'42501'));
 for(const actor of [farm,property,content]){
  await role('authenticated',actor,async()=>{
   equal(await scalar('select count(*)::int from property_properties'),actor===property?2:0);
   equal(await scalar('select count(*)::int from content_records'),actor===content?1:0);
   equal(await scalar('select count(*)::int from farm_daily_reports'),actor===farm?2:0);
   await deny(()=>scalar('select count(*) from content_social_tokens'),'42501');
  });
 }
 await role('authenticated',admin,async()=>{equal(await scalar('select count(*)::int from property_properties'),2);equal(await scalar('select count(*)::int from content_records'),1);});
 for(const table of ['farm_operation_events','property_events','content_audit'])await deny(()=>db.exec(`update ${table} set reason='tampered'`),'42501');
 // Original V2 still stores its authoritative amount and inventory movement together.
 const sale=await scalar("select farm_v2_write($1,'sale','create','{\"date\":\"2026-10-05\",\"customer_name\":\"V2 preserved\",\"product\":\"catfish\",\"quantity\":2,\"unit_price\":50,\"weight_kg\":3,\"pricing_basis\":\"per_kg\"}')",[farm]);equal(sale.total_amount,150);equal(await scalar("select current_stock::int from farm_inventory where product='catfish'"),98);
 console.log(`BossBimbz database: ${checks} assertions passed in isolated PostgreSQL; production untouched.`);
}finally{await db.close();}
