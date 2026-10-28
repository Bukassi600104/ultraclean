import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const deny=async fn=>{await assert.rejects(fn,e=>e.code==='42501');checks++};
const context=(actor,business,period=null)=>scalar(db,'select manager_context($1::uuid,$2,$3::uuid)',[actor,business,period]);
const read=(actor,business,resource,period=null,filters={})=>scalar(db,'select manager_read_records($1::uuid,$2,$3,$4::uuid,$5::jsonb)',[actor,business,resource,period,JSON.stringify(filters)]);
try{
 assert.ok(await scalar(db,"select to_regprocedure('manager_context(uuid,text,uuid)')"),'Manager ownership routines must exist');checks++;
 const original=await scalar(db,"select jsonb_agg(to_jsonb(t) order by id) from profiles t");
 await db.exec("insert into farm_inventory(product,current_stock) values('catfish',40)");
 const old=await scalar(db,"select farm_v2_write($1,'expense','create','{\"date\":\"2026-08-01\",\"category\":\"labor\",\"amount\":25}')",[ids.farm]);
 const historical=await scalar(db,'select to_jsonb(t) from farm_expenses t where id=$1',[old.id]);
 await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-26\"}')",[ids.farm]);
 const closedDay=await scalar(db,"select to_jsonb(t) from farm_daily_records t where date='2026-10-26'");
 eq((await context(ids.farm,'farm')).mode,'legacy');await periodWrite(db,ids.admin,'activate');
 eq(await scalar(db,'select jsonb_agg(to_jsonb(t) order by id) from profiles t'),original);eq(await scalar(db,'select to_jsonb(t) from farm_expenses t where id=$1',[old.id]),historical);
 const a='00000000-0000-4000-8000-000000000011',b='00000000-0000-4000-8000-000000000012';
 for(const id of[a,b]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into profiles(id,role,name) values($1,'property_manager','New manager')",[id]);}
 await deny(()=>context(a,'property'));const pa=await periodWrite(db,ids.admin,'provision',{manager_id:a,business:'property',starts_on:'2026-10-28'}),pb=await periodWrite(db,ids.admin,'provision',{manager_id:b,business:'property',starts_on:'2026-10-28'});
 eq((await context(a,'property')).mode,'personal');eq((await read(a,'property','property_properties')).data,[]);
 await assert.rejects(()=>periodWrite(db,ids.admin,'assign',{period_id:pa.id,assets:[{resource:'property_properties',record_id:'00000000-0000-4000-8000-000000000099'}]}),e=>e.code==='P0002');checks++;
 const property=await scalar(db,"select property_write($1,'property','create','{\"name\":\"Private A\",\"address\":\"A address\",\"currency\":\"CAD\"}')",[a]);
 eq((await read(a,'property','property_properties')).data.map(r=>r.id),[property.id]);eq((await read(b,'property','property_properties')).data,[]);
 await deny(()=>context(b,'property',pa.id));await deny(()=>read(b,'property','property_properties',pa.id));await deny(()=>read(a,'farm','farm_sales'));
 eq((await read(ids.admin,'property','property_properties',pa.id)).data[0].name,'Private A');eq((await read(ids.admin,'property','property_properties',pb.id)).total,0);
 await db.exec('create policy historical_broad_all on property_properties for all to authenticated using (true) with check (true)');
 eq(await asRole(db,'authenticated',b,()=>scalar(db,'select count(*)::int from property_properties')),0);eq(await asRole(db,'authenticated',a,()=>scalar(db,'select count(*)::int from property_properties')),1);
 await deny(()=>asRole(db,'authenticated',b,()=>context(ids.admin,'property')));await deny(()=>asRole(db,'anon',null,()=>read(a,'property','property_properties')));
 await db.query('update profiles set suspended=true where id=$1',[a]);await deny(()=>context(a,'property'));
 eq(await scalar(db,"select current_stock::int from farm_inventory where product='catfish'"),40);eq(await scalar(db,'select to_jsonb(t) from farm_expenses t where id=$1',[old.id]),historical);
 eq(await scalar(db,"select to_jsonb(t) from farm_daily_records t where date='2026-10-26'"),closedDay);
 console.log(`PASS ${checks} manager-period database checks: private scope, forged actor/period denial, provisioning, direct RLS and preserved original records`);
}finally{await db.close();}
