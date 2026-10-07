// Real multi-connection PostgreSQL checks. Dedicated loopback test cluster only;
// never loads .env or connects to Supabase. Start the isolated cluster separately.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const port=Number(process.env.BOSSBIMBZ_TEST_PORT);
assert.ok(Number.isInteger(port)&&port>=55000&&port<=55999,'Explicit isolated loopback test port required');
const database='bossbimbz_test_'+randomUUID().replaceAll('-','');
const settings={host:'127.0.0.1',port,user:'postgres'};
const control=new pg.Client({...settings,database:'postgres'});await control.connect();
const clients=[];let created=false,checks=0;
const admin='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002';
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
async function scalar(client,sql,args=[]){return Object.values((await client.query(sql,args)).rows[0])[0];}
const stock=(client,actor,operation,payload,reason=null,retry=randomUUID())=>scalar(client,'select farm_feed_stock_write($1::uuid,$2,$3::jsonb,null,$4,$5::uuid)',[actor,operation,JSON.stringify(payload),reason,retry]);
async function waiting(observer,pid){for(let i=0;i<30;i++){const row=(await observer.query('select wait_event_type,wait_event from pg_stat_activity where pid=$1',[pid])).rows[0];if(row?.wait_event_type==='Lock')return row;await new Promise(r=>setTimeout(r,50));}throw Error('Competing transaction did not wait on the shared write lock');}
try{
 await control.query(`create database ${database}`);created=true;
 const owner=new pg.Client({...settings,database});await owner.connect();clients.push(owner);
 await owner.query(await readFile(new URL('../tests/fixtures/farm-v2-schema.sql',import.meta.url),'utf8'));
 await owner.query("alter table profiles add constraint profiles_role_check check(role in ('admin','manager'))");
 await owner.query('insert into auth.users(id) values($1),($2)',[admin,manager]);
 await owner.query("insert into profiles(id,role,suspended) values($1,'admin',false),($2,'manager',false)",[admin,manager]);
 for(const filename of ['012_primefield_v2.sql','013_primefield_v2_write_boundary.sql'])await owner.query(await readFile(new URL('../supabase/migrations/'+filename,import.meta.url),'utf8'));
 const before=await scalar(owner,"select pg_get_functiondef('farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure)");
 for(const filename of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>/^20261005.*operations.sql$/.test(n)).sort())await owner.query(await readFile(new URL('../supabase/migrations/'+filename,import.meta.url),'utf8'));
 await owner.query(await readFile(new URL('../supabase/migrations/20261007061920_bossbimbz_feed_addendum.sql',import.meta.url),'utf8'));
 eq(await scalar(owner,"select pg_get_functiondef('farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure)"),before);
 const a=new pg.Client({...settings,database}),b=new pg.Client({...settings,database});await a.connect();await b.connect();clients.push(a,b);
 await a.query('set role service_role');await b.query('set role service_role');
 const pidB=await scalar(b,'select pg_backend_pid()');
 const opening=await stock(a,admin,'opening',{date:'2026-10-07',feed_type:'fish',feed_source:'local',bags_available:10},'Verified synthetic physical count');
 const use={date:'2026-10-07',feed_type:'fish',feed_source:'local',num_bags:1,bags_opened:1},retry=randomUUID();
 const same=await Promise.all([stock(a,manager,'create_daily_feed',use,null,retry),stock(b,manager,'create_daily_feed',use,null,retry)]);
 eq(same[0].daily_feed.id,same[1].daily_feed.id);eq(await scalar(owner,'select current_bags from farm_feed_stock where id=$1',[opening.id]),9);
 eq(await scalar(owner,'select count(*)::int from farm_feed_stock_movements where daily_feed_id=$1',[same[0].daily_feed.id]),1);
 const receipt={date:'2026-10-07',feed_type:'fish',feed_source:'local',weight_amount:25,num_bags:5,cost:100,notes:'Concurrent synthetic receipt'},receiptRetry=randomUUID();
 const buy=client=>scalar(client,"select farm_v2_write($1,'feed','create',$2::jsonb,null,null,$3::uuid)",[manager,JSON.stringify(receipt),receiptRetry]);
 const received=await Promise.all([buy(a),buy(b)]);eq(received[0].id,received[1].id);eq(await scalar(owner,'select current_bags from farm_feed_stock where id=$1',[opening.id]),14);eq(await scalar(owner,'select count(*)::int from farm_feed_stock_movements where purchase_id=$1',[received[0].id]),1);
 await stock(a,admin,'opening',{date:'2026-10-07',feed_type:'goat',feed_source:'local',bags_available:1},'Verified synthetic physical count');
 const lastBag={...use,feed_type:'goat'};
 const competing=await Promise.allSettled([stock(a,manager,'create_daily_feed',lastBag),stock(b,manager,'create_daily_feed',lastBag)]);
 eq(competing.filter(r=>r.status==='fulfilled').length,1);eq(competing.find(r=>r.status==='rejected').reason.code,'23514');
 eq(await scalar(owner,"select current_bags from farm_feed_stock where feed_type='goat'"),0);eq(await scalar(owner,"select count(*)::int from farm_daily_feed where feed_type='goat'"),1);
 await stock(a,admin,'opening',{date:'2026-10-08',feed_type:'cattle',feed_source:'local',bags_available:1},'Verified synthetic physical count');
 await a.query('begin');await scalar(a,"select farm_v2_write($1,'day','close',$2::jsonb)",[manager,JSON.stringify({date:'2026-10-08'})]);
 const blocked=stock(b,manager,'create_daily_feed',{...use,date:'2026-10-08',feed_type:'cattle'}).then(value=>({value}),error=>({error}));
 const lock=await waiting(owner,pidB);eq(lock.wait_event_type,'Lock');await a.query('commit');eq((await blocked).error.code,'23514');
 eq(await scalar(owner,"select current_bags from farm_feed_stock where feed_type='cattle'"),1);eq(await scalar(owner,"select count(*)::int from farm_daily_feed where date='2026-10-08'"),0);
 await assert.rejects(()=>a.query("insert into farm_feed_stock(feed_type,feed_source) values('other','local')"),e=>e.code==='42501');checks++;
 console.log(`PASS: ${checks} real PostgreSQL multi-connection checks: same UUID once, atomic receipt, last-bag race, closing/write lock and rollback. Isolated loopback cluster only.`);
}finally{
 for(const client of clients){try{await client.query('rollback');}catch{}await client.end();}
 if(created)await control.query(`drop database ${database}`);await control.end();
}
