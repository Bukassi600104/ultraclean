import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const manager='00000000-0000-4000-8000-000000000031',period='00000000-0000-4000-8000-000000000041',session='00000000-0000-4000-8000-000000000051';
let role='manager',calls=[],conflict=false,failure=null,checks=0;
const actor={id:manager,role:'manager'},auth={requireManager:async()=>{if(!['manager','admin'].includes(role))throw Error('Unauthorized');return {...actor,role}}};
const db={async rpc(name,args){calls.push([name,args]);if(name==='manager_context')return {data:{actorId:manager,managerId:manager,business:'farm',periodId:period,status:'awaiting_handover',mode:'personal'}};if(name==='handover_write')return failure?{error:failure}:{data:{sessionId:session,periodId:period,status:'awaiting_handover',steps:[],issues:[],...(conflict?{conflict:'inventory_changed'}:{})}};throw Error(name)}};
const api=typescriptLoader({'@/lib/auth':auth,'@/lib/supabase/server':{createServerClient:()=>db}})('app/api/operations/handover/route.ts');
const body={sessionId:session,operation:'save',requestId:'00000000-0000-4000-8000-000000000061',items:[{itemId:'00000000-0000-4000-8000-000000000071',status:'confirmed',version:'1'.repeat(32)}]};
const request=(body,headers={'X-Manager-Actor':manager,'X-Manager-Period':period})=>new Request('http://localhost/api/operations/handover',{method:'POST',headers,body:JSON.stringify(body)});
for(const denied of[null,'property_manager','content_manager']){role=denied;const before=calls.length;assert.equal((await api.GET()).status,403);assert.equal((await api.POST(request(body))).status,401);assert.equal(calls.length,before);checks+=3;}role='manager';
assert.equal((await api.GET()).status,200);checks++;
for(const invalid of[{...body,actor_id:'forged'},{...body,operation:'activate'},{...body,items:[{...body.items[0],quantity:999}]},{...body,items:[{...body.items[0],version:'stale'}]}]){assert.equal((await api.POST(request(invalid))).status,400);checks++;}
assert.equal((await api.POST(request(body,{}))).status,403);checks++;
assert.equal((await api.POST(request(body))).status,200);assert.equal(calls.at(-1)[1].p_actor,manager);assert.equal(calls.at(-1)[1].p_operation,'save');assert.deepEqual(calls.at(-1)[1].p_items,body.items);checks+=4;
conflict=true;const stale=await api.POST(request({...body,operation:'finalize'}));assert.equal(stale.status,409);assert.equal((await stale.json()).conflict,'inventory_changed');checks+=2;
failure={code:'22023',message:'Record the real starting feed count first'};const unknown=await api.POST(request(body));assert.equal(unknown.status,400);assert.match((await unknown.json()).error,/starting feed count/);checks+=2;
console.log('PASS '+checks+' handover API checks: trusted actor, roles, explicit confirmations, retained conflict state and forbidden forged fields');
