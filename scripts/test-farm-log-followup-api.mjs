import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';

const actor=randomUUID(),period=randomUUID(),message=randomUUID(),requestId=randomUUID();
const scope={actorId:actor,managerId:actor,periodId:period,mode:'personal'};
let calls=[],denied=false,unconfirmed=false;
const load=typescriptLoader({
 '@/lib/manager-read-api':{
  requestManagerScope:async()=>{if(denied)throw Object.assign(Error('Sign in'),{code:'401'});return scope;},
  managerReadError:e=>Response.json({error:e.message},{status:e.code==='401'?401:403}),
 },
 '@/lib/supabase/server':{createServerClient:()=>({rpc:async(name,args)=>{
  calls.push({name,args});
  if(unconfirmed)return {data:null};
  return {data:name==='farm_log_followups_read'?{total:0,items:[]}:{message_id:args.p_message,completed_at:'2026-11-12T14:00:00Z'}};
 }})},
 '@/lib/farm-v2':{farmErrorResponse:()=>Response.json({error:'Unavailable'},{status:503})},
});
const {GET,POST}=load('app/api/farm/log-followups/route.ts');
const url='https://example.test/api/farm/log-followups';
const payload={message_id:message,request_id:requestId};
const post=(body,owner=actor,expected=period)=>POST(new Request(url,{method:'POST',headers:{'Content-Type':'application/json','X-Manager-Actor':owner,'X-Manager-Period':expected},body:JSON.stringify(body)}));
let res=await GET(new Request(url+'?offset=20'));
assert.deepEqual(await res.json(),{total:0,items:[]});
assert.match(res.headers.get('cache-control'),/private, no-store/);
assert.deepEqual(calls[0],{name:'farm_log_followups_read',args:{p_actor:actor,p_period:period,p_offset:20}});
for(const offset of ['-1','1.5','2147483648'])assert.equal((await GET(new Request(url+'?offset='+offset))).status,400);
assert.equal((await post({...payload,p_actor:randomUUID()})).status,400);
assert.equal((await post(payload,randomUUID())).status,403);
assert.equal((await post(payload,actor,randomUUID())).status,403);
assert.equal(calls.length,1);
res=await post(payload);
assert.equal((await res.json()).data.message_id,message);
assert.deepEqual(calls.at(-1),{name:'farm_log_followup_complete',args:{p_actor:actor,p_period:period,p_message:message,p_request:requestId}});
denied=true;
assert.equal((await GET(new Request(url))).status,401);
assert.equal((await post(payload)).status,401);
assert.equal(calls.length,2);
denied=false;unconfirmed=true;
assert.equal((await GET(new Request(url))).status,503);
assert.equal((await post(payload)).status,503);
console.log('Follow-up API passed scoped reads, pagination, authenticated writes, stale sessions and unconfirmed responses.');
