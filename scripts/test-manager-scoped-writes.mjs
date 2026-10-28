import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++},deny=async fn=>{await assert.rejects(fn,e=>e.code==='42501');checks++};
const write=(actor,kind,operation,payload={},id=null,reason=null,request=null)=>scalar(db,'select property_write($1,$2,$3,$4::jsonb,$5::uuid,$6,$7::uuid)',[actor,kind,operation,JSON.stringify(payload),id,reason,request]);
try{
 const legacyProperty=await write(ids.property,'property','create',{name:'Legacy asset',address:'Address',currency:'CAD'});
 await periodWrite(db,ids.admin,'activate');
 eq((await write(ids.property,'unit','create',{property_id:legacyProperty.id,name:'Legacy unit'})).property_id,legacyProperty.id);
 const a='00000000-0000-4000-8000-000000000021',b='00000000-0000-4000-8000-000000000022';
 for(const id of[a,b]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into profiles(id,role) values($1,'property_manager')",[id]);await periodWrite(db,ids.admin,'provision',{manager_id:id,business:'property',starts_on:'2026-10-28'});}
 const property=await write(a,'property','create',{name:'A property',address:'Real address',currency:'CAD'});
 await deny(()=>write(b,'property','update',{name:'Stolen',expected_revision:0},property.id,'Attempted foreign edit'));
 await deny(()=>write(b,'property','update',{name:'Stolen',expected_revision:99},property.id,'Foreign stale edit'));
 await deny(()=>write(b,'unit','create',{property_id:property.id,name:'Foreign unit'}));
 eq(await scalar(db,'select name from property_properties where id=$1',[property.id]),'A property');
 const unit=await write(a,'unit','create',{property_id:property.id,name:'A unit'});
 await deny(()=>write(a,'tenancy','create',{unit_id:unit.id,tenant_name:'Tenant',start_date:'2026-10-27',rent_amount:200,currency:'CAD'}));
 const period=await scalar(db,"select id from manager_periods where manager_id=$1 and ended_at is null",[a]);
 const onBehalf=await write(ids.admin,'property','create',{name:'Assigned to A',address:'Address',currency:'CAD',manager_period_id:period});
 eq(await scalar(db,"select period_id from manager_record_links where resource='property_properties' and record_id=$1",[onBehalf.id]),period);
 eq(onBehalf.created_by,ids.admin);
 const request='00000000-0000-4000-8000-000000000099';
 const first=await write(a,'property','create',{name:'Retry property',address:'Address',currency:'CAD'},null,null,request);
 eq((await write(a,'property','create',{name:'Retry property',address:'Address',currency:'CAD'},null,null,request)).id,first.id);
 await db.query("update manager_periods set ended_at=now(),status='closed' where id=$1",[period]);
 await periodWrite(db,ids.admin,'provision',{manager_id:a,business:'property',starts_on:'2026-10-28'});
 await assert.rejects(()=>write(a,'property','create',{name:'Retry property',address:'Address',currency:'CAD'},null,null,request),e=>e.code==='23514');checks++;
 await write(ids.admin,'property','update',{name:'Audited correction',expected_revision:0},property.id,'Correct previous manager period');
 eq(await scalar(db,"select l.period_id from manager_record_links l join property_events e on e.id=l.record_id where l.resource='property_events' and e.record_id=$1 and e.operation='update'",[property.id]),period);
 const farm='00000000-0000-4000-8000-000000000023';await db.query('insert into auth.users(id) values($1)',[farm]);await db.query("insert into profiles(id,role) values($1,'manager')",[farm]);const fp=await periodWrite(db,ids.admin,'provision',{manager_id:farm,business:'farm',starts_on:'2026-10-28'});
 await deny(()=>scalar(db,"select farm_v2_write($1,'expense','create','{\"date\":\"2026-10-28\",\"category\":\"labor\",\"amount\":10}')",[farm]));
 // Simulate accepted handover only inside this isolated database; the real routine owns it later.
 await db.query("update manager_periods set status='active' where id=$1",[fp.id]);
 await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-28\"}')",[ids.farm]);
 const day=await scalar(db,"select farm_v2_write($1,'day','open','{\"date\":\"2026-10-28\"}')",[farm]);eq(day.status,'open');
 const closed=await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-28\"}')",[farm]);eq(closed.status,'closed');
 eq(await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-28\"}')",[farm]),closed);
 await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'expense','create','{\"date\":\"2026-10-28\",\"category\":\"labor\",\"amount\":10}')",[farm]),e=>e.code==='23514');checks++;
 eq(await scalar(db,"select status from farm_daily_records where date='2026-10-28'"),'closed');
 console.log(`PASS ${checks} manager scoped-write checks: foreign edits/references, start dates, admin responsibility, pending handover and independent closed days`);
}finally{await db.close();}
