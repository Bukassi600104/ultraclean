import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const id='00000000-0000-4000-8000-000000000001';let calls=[],pending=false;
const db={rpc:async(name,args)=>{calls.push([name,args]);return {data:pending?{id,status:'pending_funding'}:{id},error:null}}};
const load=typescriptLoader({'@/lib/auth':{requireManager:async()=>({id,role:'manager'})},'@/lib/supabase/server':{createServerClient:()=>db},'@/lib/manager-read-api':{requestManagerScope:async()=>({actorId:id,periodId:id}),managerReadError:()=>Response.json({error:'Forbidden'},{status:403})},'@/lib/manager-write-api':{withManagerWrite:async(r,b,fn)=>fn(),managerRpc:(d,n,a)=>d.rpc(n,a)}});
const api=load('app/api/farm/health/route.ts');
const request=body=>new Request('http://localhost/api/farm/health',{method:'POST',body:JSON.stringify(body)});
const body={operation:'complete',id,payload:{date:'2026-10-30',notes:'Actual product',evidence_ids:[id]},request_id:id};
assert.equal((await api.POST(request(body))).status,201);assert.equal(calls.at(-1)[1].p_actor,id);
for(const payload of [{...body.payload,actor_id:id},{...body.payload,evidence_ids:[]},{...body.payload,date:'2026-02-30'}])assert.equal((await api.POST(request({...body,payload}))).status,400);
assert.equal((await api.GET(new Request('http://localhost/api/farm/health'))).status,200);assert.equal(calls.at(-1)[0],'farm_health_read');
console.log('PASS health API: trusted actor, required proof, actual date validation and scoped read');

const noPhoto=await api.POST(request({...body,payload:{...body.payload,evidence_ids:[]}}));
assert.match((await noPhoto.json()).error,/Add a photo to confirm this task/);
const {healthSchema,healthValidationMessage}=load('lib/farm-health.ts');
for(const [field,value,text] of [['date','2026-02-30','actual completion date'],['notes','a'.repeat(4001),'4,000 characters'],['evidence_ids',[],'Add a photo']]){
 const result=healthSchema.safeParse({...body,payload:{...body.payload,[field]:value}});assert.equal(result.success,false);assert.match(healthValidationMessage(result.error),new RegExp(text));assert.doesNotMatch(healthValidationMessage(result.error),/Array|UUID|Invalid input|expected/);
}
console.log('PASS health field errors use plain language in the UI contract and API');
