import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();
const call=(actor,payload,retry=crypto.randomUUID())=>scalar(db,'select farm_daily_report_submit($1,$2::jsonb,$3)',[actor,JSON.stringify(payload),retry]);
const sections={farm1:{pond1:'Checked',pond2:'',pond3:'',pond4:'',water_issue:''},farm2:{vat1:'',vat2:'',vat3:'',mortality:'',water_issue:'',pump_status:''},livestock:{goats:'',ram:'',cattle:'',piggery:'',poultry:'',mortality:'',sick_animals:'',feed:'',water:''},crops:{report:''},people:{supervisor:'',tasks_completed:''},problems:{issues:'Feed requested',action_taken:'Reported',request_category:'feed'}};
try{
 await periodWrite(db,ids.admin,'activate');
 const payload={report_date:'2026-10-30',sections,decision_required:true},retry=crypto.randomUUID();
 const proofRequest=crypto.randomUUID();
 const proof=await scalar(db,"select farm_evidence_write($1,'reserve',$2::jsonb,$3)",[ids.farm,JSON.stringify({sha256:'c'.repeat(64),bytes:100,mime:'image/jpeg',activity_date:payload.report_date,target_resource:'farm_daily_reports'}),proofRequest]);
 await scalar(db,"select farm_evidence_write($1,'uploaded',$2::jsonb,$3)",[ids.farm,JSON.stringify({id:proof.id}),proofRequest]);
 const row=await call(ids.farm,{...payload,evidence_ids:[proof.id]},retry);
 assert.equal(row.status,'submitted');assert.equal(await scalar(db,'select record_id from farm_evidence where id=$1',[proof.id]),row.id);
 assert.deepEqual(await call(ids.farm,{...payload,evidence_ids:[proof.id]},retry),row);
 assert.equal(await scalar(db,'select count(*)::int from farm_daily_reports'),1);assert.equal(await scalar(db,'select count(*)::int from farm_operational_requests'),1);
 await assert.rejects(()=>call(ids.farm,{...payload,decision_required:false},retry));
 await assert.rejects(()=>call(ids.farm,{...payload,id:row.id,revision:row.revision,reason:'Cannot rewrite sent report'}));
 const before=await scalar(db,'select count(*)::int from farm_operation_events');
 await assert.rejects(()=>call(ids.farm,{...payload,report_date:'2026-10-29',evidence_ids:[crypto.randomUUID()]}));
 assert.equal(await scalar(db,'select count(*)::int from farm_daily_reports'),1);assert.equal(await scalar(db,'select count(*)::int from farm_operation_events'),before,'Invalid photo must roll back report and linked request/audit together');
 await assert.rejects(()=>call(ids.property,payload),e=>e.code==='42501');
 await assert.rejects(()=>asRole(db,'authenticated',ids.farm,()=>call(ids.farm,payload)),e=>e.code==='42501');
 const draft=await scalar(db,"select farm_operations_write($1,'report','create',$2::jsonb,null,null,$3)",[ids.farm,JSON.stringify({...payload,report_date:'2026-10-31',decision_required:false}),crypto.randomUUID()]);
 const submitted=await call(ids.farm,{...payload,report_date:'2026-10-31',decision_required:false,id:draft.id,revision:draft.revision,reason:'Confirm saved draft'});assert.equal(submitted.id,draft.id);assert.equal(submitted.status,'submitted');
 const location=(area,observations)=>({report_date:payload.report_date,decision_required:false,sections:{template_version:3,area,observations}});
 const observations={feed_kg:5,deaths:0,eggs:17,notes:'Supervisor checked this pen'};
 const locationRetry=crypto.randomUUID(),pen=await call(ids.farm,location('poultry_a',observations),locationRetry);
 assert.equal(pen.sections.observations.eggs,17);assert.equal(pen.manager_id,ids.farm);
 assert.equal((await call(ids.farm,location('poultry_a',observations),locationRetry)).id,pen.id);
 await assert.rejects(()=>call(ids.farm,location('poultry_a',observations)),e=>e.code==='23505');
 for(const [area,values] of [['poultry_d',{eggs:0}],['farm1_pond4',{water_quality:'Clear'}],['farm2_vat3',{sample_count:40,sample_weight_kg:72}],['piggery_4',{feed_kg:3}],['goats',{notes:'Hooves checked'}]])assert.equal((await call(ids.farm,location(area,values))).sections.area,area);
 for(const [area,values] of [['farm2_vat4',{feed_kg:1}],['piggery_4',{eggs:2}],['farm2_vat3',{sample_count:2}],['goats',{notes:'   '}],['poultry_b',{deaths:-1}],['crops',{deaths:0}]]){
   await assert.rejects(()=>call(ids.farm,location(area,values)),e=>e.code==='22023');
 }
 await assert.rejects(()=>call(ids.farm,{...location('poultry_b',observations),decision_required:true}),e=>e.code==='22023');
 const reviewed=await scalar(db,"select farm_operations_write($1,'report','review',$2::jsonb,$3,'Daily log reviewed',$4)",[ids.admin,JSON.stringify({expected_revision:pen.revision,review_note:'Reviewed'}),pen.id,crypto.randomUUID()]);
 assert.equal(reviewed.reviewed_by,ids.admin);assert.equal(reviewed.sections.observations.eggs,17);
 assert.deepEqual(await scalar(db,'select sections from farm_daily_reports where id=$1',[row.id]),sections);
 assert.equal(await scalar(db,'select count(*)::int from farm_inventory_transactions'),0);
 assert.equal(await scalar(db,'select count(*)::int from farm_operational_requests'),1);
 await scalar(db,"select farm_v2_write($1,'day','close',$2::jsonb,null,null,$3)",[ids.farm,JSON.stringify({date:'2026-10-29'}),crypto.randomUUID()]);
 await assert.rejects(()=>call(ids.farm,{...payload,report_date:'2026-10-29'}),e=>e.code==='23514');
 console.log('PASS atomic Daily Report submission: retry, evidence linkage/rollback, linked request once, saved draft, closure and role boundary');
}catch(error){console.error(error.message,error.code);process.exitCode=1;}finally{await db.close();}
