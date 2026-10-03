import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
let role = null;
let calls = [];
const manager = { id:'00000000-0000-4000-8000-000000000002',role:'manager' };
const admin = { ...manager,id:'00000000-0000-4000-8000-000000000001',role:'admin' };
const auth = {
  requireManager:async()=>{if(!role)throw Error('Unauthorized');return role==='admin'?admin:manager;},
  requireAdmin:async()=>{if(role!=='admin')throw Error('Unauthorized');return admin;},
};
const db = {rpc:async(name,payload)=>{calls.push({name,payload});return {data:[{id:manager.id,total_amount:216000}],error:null};}};
const cache = new Map();
function load(filename) {
  const file=path.resolve(filename);
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  function mockedRequire(name){
    if(name==='next/server')return {NextResponse:{json:(value,init)=>Response.json(value,init)}};
    if(name==='@/lib/auth')return auth;
    if(name==='@/lib/supabase/server')return {createServerClient:()=>db};
    if(name==='@/lib/farm-finance')return {getFarmFinance:async()=>({closing_balance:1})};
    if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
    return require(name);
  }
  new Function('require','module','exports',source)(mockedRequire,module,module.exports);
  return module.exports;
}
function request(url,body){const req=new Request('http://localhost'+url,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})});req.nextUrl=new URL(req.url);return req;}
let checks=0;
const routes=[
  ['supplies','GET'],['supplies','POST'],['supplies/history','GET'],['supplies/transaction','POST'],['supplies/[id]','PUT'],['supplies/[id]','DELETE'],
  ['sales','POST'],['sales/[id]','PUT'],['sales/[id]','DELETE'],['expenses/[id]','PUT'],['expenses/[id]','DELETE'],['fund-transfers','POST'],['fund-transfers/[id]','PUT'],['fund-transfers/[id]','DELETE'],
  ['inventory/transaction','POST'],['daily-record','POST'],['daily-record/close','POST'],['feed-purchases','POST'],['daily-feed','POST'],['corrections','POST'],['corrections/admin','POST'],['corrections/[id]','PUT'],['activity','GET'],
];
for(const [route,method] of routes){role=null;calls=[];const api=load(`app/api/farm/${route}/route.ts`);const result=await api[method](request(`/api/farm/${route}`,method==='GET'?undefined:{}),{params:{id:manager.id}});assert.ok([401,403].includes(result.status),`${route} ${method} anonymous status ${result.status}`);assert.equal(calls.length,0);checks++;}
for(const [route,method] of routes.filter(([route,method])=>route.includes('[id]')&&!route.startsWith('corrections')||route==='fund-transfers'&&method==='POST'||route==='corrections/admin')){role='manager';calls=[];const result=await load(`app/api/farm/${route}/route.ts`)[method](request(`/api/farm/${route}`,{}),{params:{id:manager.id}});assert.equal(result.status,403,`${route} manager correction`);assert.equal(calls.length,0);checks++;}
role='manager';calls=[];
const payload=[{date:'2026-10-03',product:'catfish',quantity:40,weight_kg:72,unit_price:3000,pricing_basis:'per_kg',created_by:admin.id,request_id:'00000000-0000-4000-8000-000000000101'}];
const response=await load('app/api/farm/sales/route.ts').POST(request('/api/farm/sales',payload));
assert.equal(response.status,201);assert.equal((await response.json()).data[0].total_amount,216000);assert.equal(calls[0].payload.p_actor,manager.id);assert.equal(calls[0].payload.p_request_id,payload[0].request_id);assert.equal(calls[0].payload.p_payload[0].created_by,undefined);checks+=5;
console.log(`PASS: ${checks} farm API checks; unauthenticated access, manager correction denial, trusted actor and persisted sale response.`);
