import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const call=(actor=ids.admin,target=ids.farm,reason='Same person returning')=>scalar(db,'select staff_restoration_audit($1,$2,$3)',[actor,target,reason]);
const snapshot=()=>scalar(db,"select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p),'auth',(select jsonb_agg(to_jsonb(u) order by id) from auth.users u),'periods',(select jsonb_agg(to_jsonb(p) order by id) from manager_periods p))");
try {
 await periodWrite(db,ids.admin,'activate');
 const before=await snapshot();
 for(const role of ['anon','authenticated']){
  eq(await scalar(db,"select has_function_privilege($1,'staff_restoration_audit(uuid,uuid,text)','EXECUTE')",[role]),false);
  await assert.rejects(()=>asRole(db,role,ids.admin,()=>call()),error=>error.code==='42501');checks++;
 }
 eq(await scalar(db,"select has_function_privilege('service_role','staff_restoration_audit(uuid,uuid,text)','EXECUTE')"),true);
 for(const actor of [ids.farm,ids.property,ids.content,ids.suspended]){await assert.rejects(()=>call(actor),error=>error.code==='42501');checks++;}
 await assert.rejects(()=>call(ids.admin,ids.admin),error=>error.code==='42501');checks++;
 for(const reason of ['',null,'x'.repeat(501)]){await assert.rejects(()=>call(ids.admin,ids.farm,reason),error=>error.code==='22023');checks++;}
 const audit=await asRole(db,'service_role',null,()=>call());
 const row=(await db.query('select * from farm_activity where id=$1',[audit])).rows[0];
 eq(row.operation,'restore_requested');eq(row.record_type,'staff_account');eq(row.actor_id,ids.admin);eq(row.record_id,ids.farm);eq(row.after_value,null);eq(row.reason,'Same person returning');
 await assert.rejects(()=>db.query('delete from farm_activity where id=$1',[audit]),error=>error.code==='42501');checks++;
 await assert.rejects(()=>db.query("update farm_activity set reason='changed' where id=$1",[audit]),error=>error.code==='42501');checks++;
 eq(await snapshot(),before);
 eq(await scalar(db,'select count(*)::int from farm_sales'),0);
 console.log(`PASS: ${checks} restoration database checks with guarded operations active; original identities and periods unchanged.`);
} finally {await db.close();}
