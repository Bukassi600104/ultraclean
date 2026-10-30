import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const id='00000000-0000-4000-8000-000000000001';let calls=[],pending=false;
const db={rpc:async(name,args)=>{calls.push([name,args]);return {data:pending?{id,status:'pending_funding'}:{id},error:null}}};
const load=typescriptLoader({'@/lib/auth':{requireManager:async()=>({id,role:'manager'})},'@/lib/supabase/server':{createServerClient:()=>db},'@/lib/manager-read-api':{requestManagerScope:async()=>({actorId:id,periodId:id}),managerReadError:()=>Response.json({error:'Forbidden'},{status:403})},'@/lib/manager-write-api':{withManagerWrite:async(r,b,fn)=>fn(),managerRpc:(d,n,a)=>d.rpc(n,a)}});
const api=load('app/api/farm/credit/route.ts');
const request=body=>new Request('http://localhost/api/farm/credit',{method:'POST',body:JSON.stringify(body)});
const body={operation:'receipt',payload:{date:'2026-10-30',customer_id:id,amount:'40000',cash_receiver:{type:'self'}},request_id:id};
assert.equal((await api.POST(request(body))).status,201);assert.equal(calls.at(-1)[1].p_actor,id);
for(const payload of [{...body.payload,actor_id:id},{...body.payload,amount:'-1'},{...body.payload,amount:'1.001'},{...body.payload,date:'2026-02-30'}])assert.equal((await api.POST(request({...body,payload}))).status,400);
assert.equal((await api.GET(new Request('http://localhost/api/farm/credit'))).status,200);assert.equal(calls.at(-1)[0],'farm_credit_read');
console.log('PASS customer API: trusted actor, exact positive amounts, valid dates and read scope');

const sales=load('app/api/farm/sales/route.ts');
const response=await sales.POST(new Request('http://localhost/api/farm/sales',{method:'POST',headers:{'X-Request-ID':id},body:JSON.stringify([{date:'2026-10-30',product:'goat',quantity:3,unit_price:80000,customer_id:id,credit:true}])}));
assert.equal(response.status,201);assert.equal(calls.at(-1)[0],'farm_credit_write');assert.equal(calls.at(-1)[1].p_operation,'invoice_batch');assert.equal(calls.at(-1)[1].p_payload.rows[0].pricing_basis,'per_head');
console.log('PASS existing sale API routes identified credit sales atomically with server pricing basis');
