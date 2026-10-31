import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
let call;
const {POST}=typescriptLoader({
 '@/lib/auth':{requireManager:async()=>({id:'server-actor'})},
 '@/lib/manager-write-api':{withManagerWrite:async(_request,business,work)=>{assert.equal(business,'farm');return work()},managerRpc:async(_db,name,args)=>{call={name,args};return {data:{id:'saved',status:'submitted'}}}},
 '@/lib/supabase/server':{createServerClient:()=>({})},
 '@/lib/manager-read-api':{managerReadResponse:async()=>null},
 '@/lib/farm-v2':{farmErrorResponse:error=>Response.json({error},{status:409})},
})('app/api/farm/daily-reports/submit/route.ts');
const report={report_date:'2026-10-31',sections:{},decision_required:false,request_id:crypto.randomUUID()};
const send=body=>POST(new Request('https://example.invalid/api/farm/daily-reports/submit',{method:'POST',body:JSON.stringify(body)}));
assert.equal((await send(report)).status,201);assert.equal(call.name,'farm_daily_report_submit');assert.equal(call.args.p_actor,'server-actor');assert.equal(call.args.p_request,report.request_id);
assert.equal((await send({...report,actor_id:'spoof'})).status,400);
assert.equal((await send({...report,request_id:'bad'})).status,400);
assert.equal((await send({...report,id:crypto.randomUUID()})).status,400);
assert.equal((await send({...report,report_date:'2026-02-30'})).status,400);
assert.equal((await send({...report,evidence_ids:[crypto.randomUUID()]})).status,201);
assert.equal((await send({...report,id:crypto.randomUUID(),revision:1,reason:'Submit saved draft'})).status,201);
console.log('PASS report API: actor derived on server, guarded atomic delegate, validated retry/evidence/date/revision');
