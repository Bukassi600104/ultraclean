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
 console.log('PASS PostgreSQL 17 concurrent retry and closing/write lock: one record, original result, closed date rejected; synthetic database '+database);
}finally{await db.query('rollback').catch(()=>{});await db.end();await other.end();}
