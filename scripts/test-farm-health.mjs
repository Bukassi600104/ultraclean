import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase(),write=(actor,op,payload,id=null,retry=crypto.randomUUID())=>scalar(db,'select farm_health_write($1,$2,$3::jsonb,$4,$5)',[actor,op,JSON.stringify(payload),id,retry]);
try{
 await periodWrite(db,ids.admin,'activate');
 const config=(op,p)=>scalar(db,'select farm_batch_write($1,$2,$3::jsonb,$4)',[ids.admin,op,JSON.stringify(p),crypto.randomUUID()]);
 const site=await config('site',{name:'Actual health site'}),batch=await config('batch',{site_id:site.id,name:'Actual flock',kind:'flock',product:'chicken'}),period=await scalar(db,"select id from manager_periods where manager_id=$1 and business='farm'",[ids.farm]);
 await periodWrite(db,ids.admin,'assign',{period_id:period,assets:[{resource:'farm_batches',record_id:batch.id}]});
 const task=await write(ids.admin,'schedule',{batch_id:batch.id,period_id:period,title:'Vet prescribed vaccination',instructions:'Use the actual vet instruction',due_date:'2026-10-29'});
 let read=await scalar(db,'select farm_health_read($1,null,$2::date)',[ids.farm,'2026-10-30']);assert.equal(read.tasks[0].status,'overdue');
 await assert.rejects(()=>write(ids.farm,'complete',{date:'2026-10-30',notes:'Done'},task.id),e=>e.code==='23514');
 const photoKey=crypto.randomUUID(),photo=await scalar(db,"select farm_evidence_write($1,'reserve',$2::jsonb,$3)",[ids.farm,JSON.stringify({sha256:'e'.repeat(64),bytes:100,mime:'image/jpeg',activity_date:'2026-10-30',batch_id:batch.id,target_resource:'farm_health_completions'}),photoKey]);
 await scalar(db,"select farm_evidence_write($1,'uploaded',$2::jsonb,$3)",[ids.farm,JSON.stringify({id:photo.id}),photoKey]);
 const retry=crypto.randomUUID(),payload={date:'2026-10-30',notes:'Actual product and task proof',evidence_ids:[photo.id]},done=await write(ids.farm,'complete',payload,task.id,retry);
 assert.deepEqual(await write(ids.farm,'complete',payload,task.id,retry),done);
 read=await scalar(db,'select farm_health_read($1,null,$2::date)',[ids.farm,'2026-10-30']);assert.equal(read.tasks[0].status,'completed');
 await write(ids.admin,'retract',{reason:'Proof belongs to a different treatment'},done.id);
 read=await scalar(db,'select farm_health_read($1,null,$2::date)',[ids.farm,'2026-10-30']);assert.equal(read.tasks[0].status,'overdue');assert.equal(read.completions.length,2);
 const expense=await scalar(db,"select farm_v2_write($1,'expense','create',$2::jsonb,null,null,$3)",[ids.farm,JSON.stringify({date:'2026-10-30',category:'veterinary',amount:20,batch_id:batch.id}),crypto.randomUUID()]);
 assert.equal(expense.batch_id,batch.id);
 const report=await scalar(db,'select farm_performance_read($1,null,$2::date,$3::date)',[ids.admin,'2026-10-01','2026-10-30']);assert.equal(report.expenses[0].batch_id,batch.id);assert.equal(Number(report.expenses[0].amount),20);
 console.log('PASS scoped health tasks, due state, required actual product proof, retry and audited retraction');
}catch(e){console.error(e.message,e.code,e.where);process.exitCode=1;}finally{await db.close();}
