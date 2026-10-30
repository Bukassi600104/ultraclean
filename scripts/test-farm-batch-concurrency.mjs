// Explicit local PostgreSQL only; creates an isolated synthetic database and retains it for diagnosis.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
assert.ok(process.env.FARM_TEST_PG_CONFIG,'Provide the private local test connection file');
const config=JSON.parse(await readFile(process.env.FARM_TEST_PG_CONFIG,'utf8'));
assert.equal(config.host,'127.0.0.1');assert.equal(config.port,55454);assert.match(config.database,/^pulse_restore_[a-f0-9]+$/);
const database='pulse_test_'+crypto.randomUUID().replaceAll('-',''),bootstrap=new pg.Client(config);await bootstrap.connect();
await bootstrap.query(`create database "${database}"`);await bootstrap.end();
const db=new pg.Client({...config,database}),other=new pg.Client({...config,database});await db.connect();await other.connect();db.exec=sql=>db.query(sql);
try{
 let fixture=await readFile('tests/fixtures/farm-v2-schema.sql','utf8');fixture=fixture.replace('create role anon; create role authenticated; create role service_role bypassrls;','');await db.query(fixture);
 await db.query("alter table profiles add constraint profiles_role_check check(role in ('admin','manager'))");
 for(const [name,id] of Object.entries(ids)){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into profiles(id,role,name,suspended) values($1,$2,$3,$4)',[id,name==='admin'?'admin':'manager',name,name==='suspended']);}
 const migrations=(await readdir('supabase/migrations')).filter(n=>n==='012_primefield_v2.sql'||n==='013_primefield_v2_write_boundary.sql'||/^2026\d{10}_/.test(n)).sort();
 for(const name of migrations){if(name==='20261028120700_manager_periods_and_scope.sql'){const catalog=await scalar(db,"select jsonb_agg(jsonb_build_object('id',id,'role',role) order by id) from profiles");await db.query("select set_config('operations.expected_profiles',$1,false)",[JSON.stringify(catalog)]);}await db.query(await readFile('supabase/migrations/'+name,'utf8'));if(name==='20261005113523_bossbimbz_operations.sql'){await db.query("update profiles set role='property_manager' where id=$1",[ids.property]);await db.query("update profiles set role='content_manager' where id=$1",[ids.content]);}}
 await periodWrite(db,ids.admin,'activate');
 const configure=(operation,payload)=>scalar(db,'select farm_batch_write($1,$2,$3::jsonb,$4)',[ids.admin,operation,JSON.stringify(payload),crypto.randomUUID()]);
 const site=await configure('site',{name:'Isolated concurrent site'}),batch=await configure('batch',{site_id:site.id,name:'Pond',product:'catfish',kind:'pond'}),period=await scalar(db,"select id from manager_periods where manager_id=$1 and business='farm'",[ids.farm]);
 await periodWrite(db,ids.admin,'assign',{period_id:period,assets:[{resource:'farm_batches',record_id:batch.id}]});
 const write=(client,payload,retry)=>scalar(client,"select farm_batch_record_write($1,'submit',$2::jsonb,null,$3)",[ids.farm,JSON.stringify(payload),retry]);
 const payload={batch_id:batch.id,date:'2026-10-30',deaths:0},retry=crypto.randomUUID();
 await db.query('begin');const first=await write(db,payload,retry);let settled=false;const second=write(other,payload,retry).finally(()=>{settled=true;});
 await new Promise(r=>setTimeout(r,150));assert.equal(settled,false,'Concurrent retry waits for the original transaction');await db.query('commit');assert.deepEqual(await second,first);assert.equal(await scalar(db,'select count(*)::int from farm_batch_records'),1);
 await db.query('begin');await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-31\"}')",[ids.farm]);settled=false;
 const blocked=write(other,{...payload,date:'2026-10-31'},crypto.randomUUID()).then(()=>null,e=>e).finally(()=>{settled=true;});await new Promise(r=>setTimeout(r,150));assert.equal(settled,false);await db.query('commit');assert.equal((await blocked)?.code,'23514');assert.equal(await scalar(db,'select count(*)::int from farm_batch_records'),1);
 const purchase=(client,op,values,id=null,request=crypto.randomUUID())=>scalar(client,'select farm_purchase_write($1,$2,$3::jsonb,$4,$5)',[ids.admin,op,JSON.stringify(values),id,request]);
 await scalar(db,"select farm_feed_stock_write($1,'starting',$2::jsonb,null,null,$3)",[ids.admin,JSON.stringify({date:'2026-10-30',feed_type:'fish',feed_source:'local',bags:0}),crypto.randomUUID()]);
 const order=await purchase(db,'request',{date:'2026-10-30',supplier:'Concurrent supplier',category:'feed',description:'Actual order',lines:[{description:'Feed',quantity:'10',unit_price:'2',unit:'bags',destination:'feed',feed_type:'fish',feed_source:'local'}]});
 await purchase(db,'approve',{expected_revision:0,reason:'Verified order'},order.id);
 const line=await scalar(db,'select id from farm_purchase_lines where purchase_id=$1',[order.id]);
 const delivery={date:'2026-10-30',line_id:line,quantity:'7',included_in_starting_count:false};
 await db.query('begin');await purchase(db,'delivery',delivery,order.id);settled=false;
 const overflow=purchase(other,'delivery',delivery,order.id).then(()=>null,e=>e).finally(()=>{settled=true;});await new Promise(r=>setTimeout(r,150));assert.equal(settled,false);await db.query('commit');assert.equal((await overflow)?.code,'23514');
 assert.equal(await scalar(db,'select sum(quantity)::text from farm_purchase_deliveries'),'7');
 const funding=await scalar(db,"select operations_cash_write($1,'fund',$2::jsonb,$3)",[ids.admin,JSON.stringify({business:'farm',currency:'NGN',date:'2026-10-30',amount:'1000',recipient:{type:'ceo'},confirmed_receipt:true}),crypto.randomUUID()]);
 const cost={date:'2026-10-30',amount:'15',recipient:'Concurrent supplier',cash_payer_account_id:funding.data.target_account_id};
 await db.query('begin');await purchase(db,'payment',cost,order.id);settled=false;
 const overpay=purchase(other,'payment',cost,order.id).then(()=>null,e=>e).finally(()=>{settled=true;});await new Promise(r=>setTimeout(r,150));assert.equal(settled,false);await db.query('commit');assert.equal((await overpay)?.code,'23514');
 assert.equal(await scalar(db,'select sum(amount)::text from farm_purchase_payments'),'15');
 console.log('PASS PostgreSQL 17 concurrent retry, closing/write, partial delivery and payment limits; synthetic database '+database);
}finally{await db.query('rollback').catch(()=>{});await db.end();await other.end();}
