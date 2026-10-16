import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';import os from 'node:os';
let db,native=null;
if(process.env.LIVESTOCK_TEST_PORT){const port=Number(process.env.LIVESTOCK_TEST_PORT);assert.ok(port>=55000&&port<=55999);const pg=(await import('pg')).default,{randomUUID}=await import('node:crypto'),database='livestock_test_'+randomUUID().replaceAll('-',''),settings={host:'127.0.0.1',port,user:'postgres'};const control=new pg.Client({...settings,database:'postgres'});await control.connect();await control.query('create database '+database);const client=new pg.Client({...settings,database});await client.connect();native={pg,settings:{...settings,database},client};db={query:(...args)=>client.query(...args),exec:sql=>client.query(sql.replace('create role anon; create role authenticated; create role service_role bypassrls;','')),close:async()=>{await client.end();await control.query('drop database '+database);await control.end();}};}else{const {PGlite}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')));db=new PGlite();}
const admin='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002';let checks=0;
const q=async(s,p=[])=>Object.values((await db.query(s,p)).rows[0])[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++},deny=async(f)=>{await assert.rejects(f);checks++};
const write=(kind,op,payload,id=null,reason=null,retry=null)=>q('select farm_v2_write($1::uuid,$2,$3,$4::jsonb,$5::uuid,$6,$7::uuid)',[manager,kind,op,JSON.stringify(payload),id,reason,retry]);
const change=(op,payload,retry='00000000-0000-4000-8000-000000000099',actor=admin)=>q('select farm_livestock_group_write($1::uuid,$2,$3::jsonb,$4,$5::uuid)',[actor,op,JSON.stringify(payload),'Verified physical category count',retry]);
const c=(growth_stage,sex='unknown',chicken_type='')=>({growth_stage,sex,chicken_type});const stock=async()=>Number(await q("select current_stock from farm_inventory where product='goat'"));
try{
 await db.exec(await readFile('tests/fixtures/farm-v2-schema.sql','utf8'));await db.query('insert into auth.users(id) values($1),($2)',[admin,manager]);await db.query("insert into profiles(id,role,suspended) values($1,'admin',false),($2,'manager',false)",[admin,manager]);
 for(const file of ['012_primefield_v2.sql','013_primefield_v2_write_boundary.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 const legacyRetry='00000000-0000-4000-8000-000000000010';const legacyArrival=await write('inventory_transaction','create',{product:'goat',action:'add',quantity:10,date:'2026-10-16'},null,null,legacyRetry);const old=await q('select jsonb_agg(to_jsonb(t)) from farm_inventory_transactions t');
 const migration=(await readdir('supabase/migrations')).find(f=>f.endsWith('_farm_livestock_categories.sql'));assert.ok(migration,'Forward livestock migration exists');await db.exec(await readFile('supabase/migrations/'+migration,'utf8'));
 eq(await q("select jsonb_agg(to_jsonb(t)-'stock_group_id') from farm_inventory_transactions t"),old);eq(await stock(),10);eq((await write('inventory_transaction','create',{product:'goat',action:'add',quantity:10,date:'2026-10-16'},null,null,legacyRetry)).id,legacyArrival.id);
 const retry='00000000-0000-4000-8000-000000000011';const arrival=await write('inventory_transaction','create',{product:'goat',action:'add',quantity:10,date:'2026-10-16',classification:c('weaner')},null,null,retry);eq(await stock(),20);eq((await write('inventory_transaction','create',{product:'goat',action:'add',quantity:10,date:'2026-10-16',classification:c('weaner')},null,null,retry)).id,arrival.id);eq(await stock(),20);assert.ok(arrival.stock_group_id);checks++;
 const sale=await write('sale','create',{product:'goat',quantity:3,unit_price:80000,pricing_basis:'per_head',date:'2026-10-16',stock_group_id:arrival.stock_group_id});eq(sale.total_amount,240000);eq(await stock(),17);
 await write('inventory_transaction','create',{product:'goat',action:'mortality',quantity:1,date:'2026-10-16',stock_group_id:arrival.stock_group_id});eq(await stock(),16);
 await change('transfer',{product:'goat',from_group_id:arrival.stock_group_id,classification:c('adolescent'),quantity:4,date:'2026-10-16'});eq(await stock(),16);
 let groups=await q('select farm_livestock_balances()');eq(groups.find(g=>g.id===arrival.stock_group_id).quantity,2);eq(groups.find(g=>g.product==='goat'&&g.id===null).quantity,10);
 await deny(()=>write('inventory_transaction','create',{product:'goat',action:'mortality',quantity:3,date:'2026-10-16',stock_group_id:arrival.stock_group_id}));eq(await stock(),16);
 await deny(()=>write('inventory_transaction','create',{product:'goat',action:'mortality',quantity:11,date:'2026-10-16'}));
 await deny(()=>write('inventory_transaction','create',{product:'chicken',action:'add',quantity:5,date:'2026-10-16',classification:c('point_of_lay','unknown','broiler')}));
 await deny(()=>change('allocate',{product:'goat',classification:c('adult'),quantity:1,date:'2026-10-16'},'00000000-0000-4000-8000-000000000012',manager));
 await change('allocate',{product:'goat',classification:c('adult'),quantity:3,date:'2026-10-16'},'00000000-0000-4000-8000-000000000013');eq(await stock(),16);
 const adultGroup=(await q('select farm_livestock_balances()')).find(g=>g.product==='goat'&&g.growth_stage==='adult');
 await q("select farm_v2_write($1::uuid,'sale','update',$2::jsonb,$3::uuid,'Correct sale category')",[admin,JSON.stringify({expected_revision:0,stock_group_id:adultGroup.id}),sale.id]);eq(await stock(),16);
 eq((await q('select farm_livestock_balances()')).find(g=>g.id===adultGroup.id).quantity,0);
 await q("select farm_v2_write($1::uuid,'sale','void','{\"expected_revision\":1}'::jsonb,$2::uuid,'Correct mistaken sale')",[admin,sale.id]);eq(await stock(),19);
 groups=await q('select farm_livestock_balances()');eq(groups.find(g=>g.id===arrival.stock_group_id).quantity,5);eq(groups.find(g=>g.id===adultGroup.id).quantity,3);
 await write('inventory_transaction','create',{product:'catfish',action:'add',quantity:40,date:'2026-10-16',classification:c('fingerlings')});groups=await q('select farm_livestock_balances()');const fish=groups.find(g=>g.product==='catfish'&&g.id);
 const fishSale=await write('sale','create',{product:'catfish',quantity:40,weight_kg:72,unit_price:3000,pricing_basis:'per_kg',date:'2026-10-16',stock_group_id:fish.id});eq(fishSale.total_amount,216000);eq((await q('select farm_livestock_balances()')).find(g=>g.id===fish.id).quantity,0);
 for(const sex of ['male','female'])for(const stage of ['poult','grower','juvenile','finisher']){await write('inventory_transaction','create',{product:'turkey',action:'add',quantity:1,date:'2026-10-16',classification:c(stage,sex)});checks++}

 // A spent stock addition may be corrected through an intermediate reversal, provided final balances are valid.
 await q("select farm_v2_write($1::uuid,'inventory_transaction','update',$2::jsonb,$3::uuid,'Correct original arrival')",[admin,JSON.stringify({quantity:9}),arrival.id]);eq(await stock(),18);
 const retryCorrection='00000000-0000-4000-8000-000000000077';
 const second=await write('sale','create',{product:'goat',quantity:1,unit_price:100,pricing_basis:'per_head',date:'2026-10-16',stock_group_id:adultGroup.id});
 const partial={stock_group_id:arrival.stock_group_id,expected_revision:0};
 const saved=await q("select farm_v2_write($1::uuid,'sale','update',$2::jsonb,$3::uuid,'Correct category',$4::uuid)",[admin,JSON.stringify(partial),second.id,retryCorrection]);
 const turkey=(await q('select farm_livestock_balances()')).find(g=>g.product==='turkey'&&g.sex==='male'&&g.growth_stage==='poult');
 await q("select farm_v2_write($1::uuid,'sale','update',$2::jsonb,$3::uuid,'Correct animal')",[admin,JSON.stringify({product:'turkey',stock_group_id:turkey.id,expected_revision:1}),second.id]);
 eq(await q("select farm_v2_write($1::uuid,'sale','update',$2::jsonb,$3::uuid,'Correct category',$4::uuid)",[admin,JSON.stringify(partial),second.id,retryCorrection]),saved);
 await deny(()=>q("select farm_v2_write($1::uuid,'sale','update',$2::jsonb,$3::uuid,'Correct category',$4::uuid)",[admin,JSON.stringify({...partial,stock_group_id:adultGroup.id}),second.id,retryCorrection]));
 // Batches and correction requests recurse through the public wrapper, not around category guards.
 const batch=await write('sale','create',[{product:'turkey',quantity:1,unit_price:100,pricing_basis:'per_head',date:'2026-10-16',stock_group_id:(await q('select farm_livestock_balances()')).find(g=>g.product==='turkey'&&g.sex==='female'&&g.growth_stage==='poult').id}]);eq(batch.length,1);
 const request=await write('request','request',{record_type:'sale',record_id:batch[0].id,reason:'Review wrong category'});
 const alternate=(await q('select farm_livestock_balances()')).find(g=>g.product==='turkey'&&g.sex==='female'&&g.growth_stage==='grower');
 await q("select farm_v2_write($1::uuid,'request','apply',$2::jsonb,$3::uuid,'Verified category')",[admin,JSON.stringify({operation:'update',changes:{expected_revision:0,stock_group_id:alternate.id}}),request.id]);eq(await q('select stock_group_id::text from farm_sales where id=$1',[batch[0].id]),alternate.id);
 await q("select farm_v2_write($1::uuid,'day','close','{\"date\":\"2026-10-17\"}'::jsonb)",[manager]);await deny(()=>write('inventory_transaction','create',{product:'goat',action:'add',quantity:1,date:'2026-10-17',classification:c('adult')}));
 eq(await q("select has_table_privilege('service_role','farm_livestock_events','INSERT')"),false);eq(await q("select has_function_privilege('service_role','farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)','EXECUTE')"),false);eq(await q("select has_function_privilege('authenticated','farm_livestock_group_write(uuid,text,jsonb,text,uuid)','EXECUTE')"),false);

 if(native){const a=new native.pg.Client(native.settings),b=new native.pg.Client(native.settings);await a.connect();await b.connect();try{
  const base={product:'pig',action:'add',quantity:1,date:'2026-10-18',classification:c('weaner')};const pig=await write('inventory_transaction','create',base);
  const call=(client,payload,retry=null)=>qClient(client,'inventory_transaction','create',payload,retry);
  async function qClient(client,kind,op,payload,retry=null){return (await client.query('select farm_v2_write($1::uuid,$2,$3,$4::jsonb,null,null,$5::uuid) result',[manager,kind,op,JSON.stringify(payload),retry])).rows[0].result}
  const pidB=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
  const blocked=async()=>{for(let i=0;i<40;i++){const r=await native.client.query('select wait_event_type from pg_stat_activity where pid=$1',[pidB]);if(r.rows[0].wait_event_type==='Lock')return;await new Promise(r=>setTimeout(r,50));}throw Error('Competing write did not wait on the shared lock')};
  await a.query('begin');await call(a,{product:'pig',action:'mortality',quantity:1,date:'2026-10-18',stock_group_id:pig.stock_group_id});await b.query('begin');const second=call(b,{product:'pig',action:'mortality',quantity:1,date:'2026-10-18',stock_group_id:pig.stock_group_id}).then(value=>({value}),error=>({error}));await blocked();await a.query('commit');eq((await second).error.code,'23514');await b.query('rollback');eq((await q('select farm_livestock_balances()')).find(g=>g.id===pig.stock_group_id).quantity,0);
  const retryId='00000000-0000-4000-8000-000000000088';await a.query('begin');const first=await call(a,base,retryId);await b.query('begin');const duplicate=call(b,base,retryId);await blocked();await a.query('commit');eq((await duplicate).id,first.id);await b.query('commit');eq((await q('select farm_livestock_balances()')).find(g=>g.id===pig.stock_group_id).quantity,1);
  await a.query('begin');await qClient(a,'day','close',{date:'2026-10-19'});const afterClose=call(b,{...base,date:'2026-10-19'}).then(value=>({value}),error=>({error}));await blocked();await a.query('commit');eq((await afterClose).error.code,'23514');
 }finally{await a.query('rollback');await b.query('rollback');await a.end();await b.end();}}
 console.log(`PASS ${checks} isolated livestock SQL checks: legacy totals, classification, allocation/transfer, exact deductions, retries, reversals, permissions and catfish pricing.`);
}catch(error){console.error({message:error.message,code:error.code,where:error.where});process.exitCode=1;}finally{await db.close()}
