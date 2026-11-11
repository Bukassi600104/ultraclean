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

const partial={date:'2026-10-30',product:'goat',quantity:3,unit_price:80000,customer_id:id,credit:true,amount_received:'40000.50',payment_date:'2026-10-30',cash_receiver:{type:'self'}};
const saleRequest=row=>new Request('http://localhost/api/farm/sales',{method:'POST',headers:{'X-Request-ID':id},body:JSON.stringify([row])});
assert.equal((await sales.POST(saleRequest(partial))).status,201);assert.equal(calls.at(-1)[1].p_payload.rows[0].amount_received,'40000.50');assert.equal(calls.at(-1)[1].p_payload.rows[0].payment_date,'2026-10-30');
for(const row of [{...partial,amount_received:'1.001'},{...partial,amount_received:'-1'},{...partial,payment_date:'2026-02-30'},{...partial,customer_id:undefined}])assert.equal((await sales.POST(saleRequest(row))).status,400);

const visibleSale = {id, invoice_id:id, total_amount:100000, payment_method:'transfer'};
const earlySale = {id:'legacy-sale',invoice_id:null,total_amount:1000,payment_method:'cash'};
const invoice = {id, sale_id:id, number:'PF-EXAMPLE',credit_days:30,owed:'25000',collected:'75000',total:'100000',overdue_days:0,voided_at:null};
const scopedSales=typescriptLoader({
 '@/lib/manager-read-api':{managerReadResponse:async()=>Response.json({data:[visibleSale,earlySale],total:2}),requestManagerScope:async()=>({actorId:id,periodId:id}),managerReadError:()=>Response.json({error:'Unavailable'},{status:503})},
 '@/lib/supabase/server':{createServerClient:()=>({rpc:async(name,args)=>{assert.equal(name,'farm_credit_read');assert.equal(args.p_period,id);return {data:{invoices:[invoice]}};}})}
})('app/api/farm/sales/route.ts');
const ledger=await (await scopedSales.GET(new Request('http://localhost/api/farm/sales?with_payment=1'))).json();
assert.equal(ledger.data[0].invoice.owed,'25000');assert.equal(ledger.data[1].invoice,null);
const {invoiceStatus}=load('lib/farm-credit.ts');
assert.match(invoiceStatus(invoice),/Credit sale.*Part paid/);assert.match(invoiceStatus({...invoice,collected:'0'}),/On credit/);
assert.match(invoiceStatus({...invoice,owed:'0',collected:'100000'}),/Credit sale.*Paid in full/);
assert.equal(invoiceStatus({...invoice,owed:'0',collected:'75000',credited:'25000'}),'Credit sale · Settled');
console.log('PASS scoped sales history retains credit status, actual paid amount, outstanding debt and historical sales');
