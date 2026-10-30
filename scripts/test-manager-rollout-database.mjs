import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
import {managerDatabase,ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
const first='20261028120700_manager_periods_and_scope.sql';let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const preflight=await managerDatabase({through:'20261028120659'});try{await preflight.query("select set_config('operations.expected_profiles','[]',false)");await assert.rejects(async()=>preflight.exec(await readFile(new URL('../supabase/migrations/'+first,import.meta.url),'utf8')),e=>e.code==='55000');checks++;await preflight.exec('rollback');eq(await scalar(preflight,"select to_regclass('manager_periods')"),null);eq(await scalar(preflight,'select count(*)::int from profiles'),5);}finally{await preflight.close();}
const db=await managerDatabase({through:first}),ctx=(actor,business)=>scalar(db,'select manager_context($1,$2)',[actor,business]);
try{
 const profiles=await scalar(db,'select jsonb_agg(to_jsonb(t) order by id) from profiles t');
 eq(await scalar(db,'select count(*)::int from manager_periods'),4);eq(await scalar(db,"select count(*)::int from manager_periods where mode='legacy' and created_by is not null"),0);
 eq(await scalar(db,'select business from manager_periods where manager_id=$1',[ids.property]),'property');eq(await scalar(db,'select business from manager_periods where manager_id=$1',[ids.content]),'content');
 const before=await scalar(db,'select jsonb_agg(to_jsonb(t) order by id) from manager_periods t');eq((await ctx(ids.farm,'farm')).featureEnabled,false);eq((await ctx(ids.farm,'farm')).periodId,null);
 const unknown='00000000-0000-4000-8000-000000000097';await db.query('insert into auth.users(id) values($1)',[unknown]);
 await assert.rejects(()=>db.query("insert into profiles(id,role) values($1,'manager')",[unknown]),e=>e.code==='55000');checks++;
 await assert.rejects(()=>db.query("update profiles set role='manager' where id=$1",[ids.admin]),e=>e.code==='55000');checks++;
 await db.exec('begin');await db.query('delete from manager_periods where manager_id=$1',[ids.farm]);await assert.rejects(()=>ctx(ids.farm,'farm'),e=>e.code==='42501');checks++;await db.exec('rollback');
 await db.exec(await readFile(new URL('../docs/superpowers/plans/manager-handover-pause.sql',import.meta.url),'utf8'));await assert.rejects(()=>db.query("insert into farm_inventory(product,current_stock) values('catfish',1)"),e=>e.code==='55000');checks++;
 const names=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>/^2026\d{10}_/.test(n)&&n>first).sort();for(const name of names)await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../docs/superpowers/plans/manager-handover-resume.sql',import.meta.url),'utf8'));eq(await scalar(db,"select count(*)::int from pg_trigger where tgname='bossbimbz_release_pause'"),0);
 const sale={date:'2026-10-28',product:'other',other_product_name:'Genuine new produce',quantity:1,unit_price:20,pricing_basis:'per_unit'};
 await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify({...sale,cash_receiver:{type:'self'}}),crypto.randomUUID()]),e=>e.code==='55000');checks++;
 eq(await scalar(db,'select count(*)::int from farm_sales'),0);eq(await scalar(db,'select count(*)::int from operations_cash_events'),0);
 await assert.rejects(()=>scalar(db,"select farm_feed_activity_write($1,'starting',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify({date:'2026-10-28',feed_type:'fish',feed_source:'local',bags:10}),crypto.randomUUID()]),e=>e.code==='55000');checks++;
 eq(await scalar(db,'select count(*)::int from farm_feed_stock'),0);
 const retry=crypto.randomUUID(),posted=await scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify(sale),retry]);eq(posted.total_amount,20);
 await periodWrite(db,ids.admin,'activate');eq((await ctx(ids.farm,'farm')).featureEnabled,true);eq(await scalar(db,"select jsonb_agg(to_jsonb(t)-'assigned_handover' order by id) from manager_periods t"),before);eq(await scalar(db,'select count(*)::int from manager_periods where assigned_handover is not null'),0);eq(await scalar(db,'select jsonb_agg(to_jsonb(t) order by id) from profiles t'),profiles);
 await periodWrite(db,ids.admin,'activate');eq(await scalar(db,'select count(*)::int from manager_periods'),4);
 const replay=await scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify(sale),retry]);eq(replay.id,posted.id);eq(await scalar(db,'select count(*)::int from farm_sales'),1);
 const legacy=(await ctx(ids.farm,'farm')).periodId;await periodWrite(db,ids.admin,'close',{period_id:legacy,reason:'Explicit isolated period change'});const personal=await periodWrite(db,ids.admin,'provision',{manager_id:ids.farm,business:'farm',starts_on:'2026-10-28'});await db.query("update manager_periods set status='active' where id=$1",[personal.id]);
 await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify(sale),retry]),e=>e.code==='23514');checks++;
 // An inactive compatible rollback cannot resume untracked writes after verified cash exists.
 await db.query('update operations_release_state set enabled=false');await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify(sale),crypto.randomUUID()]),e=>e.code==='55000');checks++;
 eq((await ctx(ids.farm,'farm')).featureEnabled,false);eq((await ctx(ids.farm,'farm')).mode,'personal');eq((await ctx(ids.farm,'farm')).periodId,personal.id);eq(await scalar(db,'select count(*)::int from farm_sales'),1);
 console.log('PASS '+checks+' rollout database checks: first-expansion verified identities, unknown attribution, profile pause, fail-closed missing setup, inactive write guards, legacy compatibility and no source/account reset');
}finally{await db.close();}
