import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
let call,admin=true,scoped=null;const actor='00000000-0000-4000-8000-000000000001';
const db={from:table=>({select:()=>({in:()=>table==='farm_purchases'?Promise.resolve({data:[{id:'purchase',request_id:'request',total:'100.00',supplier:'Supplier'}]}):{eq:async()=>({data:[]})}})})};
const load=typescriptLoader({
 '@/lib/auth':{requireManager:async()=>({id:actor}),requireAdmin:async()=>{if(!admin)throw Error('forbidden');return {id:actor}}},
 '@/lib/manager-write-api':{withManagerWrite:async(_request,business,work)=>{assert.equal(business,'farm');return work()},managerRpc:async(_db,name,args)=>{call={name,args};return {data:{id:'saved',status:'pending'}}}},
 '@/lib/supabase/server':{createServerClient:()=>db},
 '@/lib/manager-read-api':{managerReadResponse:async()=>scoped},
 '@/lib/farm-v2':{farmErrorResponse:error=>Response.json({error:error.message},{status:error.code==='42501'?403:409})},
});
const {writeFarmOperation,listFarmOperations}=load('lib/farm-reports.ts');
const retry=crypto.randomUUID(),payload={request_date:'2026-10-31',category:'repair',description:'Pump repair',request_id:retry,evidence_ids:[crypto.randomUUID()]};
const send=(body,id)=>writeFarmOperation(new Request('https://example.invalid/api/farm/operational-requests',{method:id?'PUT':'POST',headers:{'X-Request-ID':retry},body:JSON.stringify(body)}),'request',id);
assert.equal((await send(payload)).status,201);assert.equal(call.name,'farm_operational_request_write');assert.equal(call.args.p_actor,actor);assert.equal(call.args.p_request_id,retry);assert.equal(call.args.p_kind,undefined);assert.equal(call.args.p_payload.request_id,undefined);assert.deepEqual(call.args.p_payload.evidence_ids,payload.evidence_ids);
assert.equal((await send({...payload,request_id:crypto.randomUUID()})).status,400);assert.equal((await send({...payload,evidence_ids:['bad']})).status,400);assert.equal((await send({...payload,actor_id:'spoof'})).status,400);
const decision={operation:'approve',revision:0,reason:'Quote checked',ceo_response:'Quote checked'},id=crypto.randomUUID();assert.equal((await send(decision,id)).status,200);assert.equal(call.args.p_payload.expected_revision,0);admin=false;assert.equal((await send(decision,id)).status,403);
scoped=Response.json({data:[{id:'request'}],total:1});const result=await listFarmOperations(new Request('https://example.invalid/api/farm/operational-requests'),'request');assert.equal((await result.json()).data[0].linked_purchase.id,'purchase');
console.log('PASS request API: server actor, atomic dispatcher, evidence/date/retry validation, admin decisions and scoped purchase context');
