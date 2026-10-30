import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();
const call=(actor,op,payload,retry)=>scalar(db,'select farm_evidence_write($1,$2,$3::jsonb,$4)',[actor,op,JSON.stringify(payload),retry]);
try{
 assert.ok(await scalar(db,"select to_regprocedure('farm_evidence_write(uuid,text,jsonb,uuid)')"),'Private evidence writer required');
 await periodWrite(db,ids.admin,'activate');
 const retry=crypto.randomUUID(),payload={sha256:'a'.repeat(64),bytes:100,mime:'image/jpeg',activity_date:'2026-10-30',target_resource:'farm_inventory_transactions'};
 const row=await call(ids.farm,'reserve',payload,retry);
 assert.equal(row.status,'pending');assert.equal(row.actor_id,ids.farm);
 assert.deepEqual(await call(ids.farm,'reserve',payload,retry),row);
 await assert.rejects(()=>call(ids.farm,'reserve',{...payload,sha256:'b'.repeat(64)},retry));
 await assert.rejects(()=>call(ids.property,'uploaded',{id:row.id},crypto.randomUUID()),e=>e.code==='42501');
 await assert.rejects(()=>asRole(db,'authenticated',ids.farm,()=>call(ids.admin,'uploaded',{id:row.id},crypto.randomUUID())),e=>e.code==='42501');
 const uploaded=await call(ids.farm,'uploaded',{id:row.id},retry);assert.equal(uploaded.status,'uploaded');
 assert.equal((await scalar(db,'select farm_evidence_read($1,$2)',[ids.admin,row.id])).id,row.id);
 assert.equal((await scalar(db,'select farm_evidence_read($1,$2,$3)',[ids.admin,row.id,row.period_id])).id,row.id);
 await assert.rejects(()=>scalar(db,'select farm_evidence_read($1,$2)',[ids.property,row.id]),e=>e.code==='42501');
 assert.equal(await scalar(db,"select public from storage.buckets where id='farm-evidence'"),false);
 await db.query("insert into storage.objects(id,bucket_id,name) values($1,'farm-evidence',$2)",[crypto.randomUUID(),row.object_path]);
 await db.exec('create policy broad_legacy_storage on storage.objects for all to authenticated using(true) with check(true)');
 assert.equal(await asRole(db,'authenticated',ids.farm,()=>scalar(db,"select count(*)::int from storage.objects where bucket_id='farm-evidence'")),0);
 console.log('PASS private evidence: owned reservations, retries, role isolation, upload state and no direct object access');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
