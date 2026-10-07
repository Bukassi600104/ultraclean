import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url), ts=require('typescript');
let role=null, calls=[], filters=[], rpcError=null;
const actor='00000000-0000-4000-8000-000000000001';
const auth={requireManager:async()=>{if(!['manager','admin'].includes(role))throw Error();return {id:actor,role};},requireAdmin:async()=>{if(role!=='admin')throw Error();return {id:actor,role};}};
const db={rpc:async(name,args)=>{calls.push({name,args});return {data:{id:actor,daily_feed:{id:actor}},error:rpcError};},from:()=>{const query={select:()=>query,eq:(key,value)=>{filters.push([key,value]);return query;},order:()=>query,range:()=>Promise.resolve({data:[],count:0,error:null})};return query;}};
const cache=new Map();
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(name=>name==='next/server'?{NextResponse:{json:(value,init)=>Response.json(value,init)}}:name==='@/lib/auth'?auth:name==='@/lib/supabase/server'?{createServerClient:()=>db}:name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),module,module.exports);return module.exports;}
const api=load('app/api/farm/daily-feed/route.ts');let checks=0;
const body={date:'2026-10-07',feed_type:'fish',feed_source:'local',num_bags:0.5,bags_opened:1};
const request=(body,id=actor)=>new Request('http://localhost/api/farm/daily-feed',{method:'POST',body:JSON.stringify(body),headers:id?{'X-Request-ID':id}:{}});
role='manager';assert.equal((await api.POST(request(body))).status,201);assert.equal(calls.at(-1).name,'farm_feed_stock_write');assert.equal(calls.at(-1).args.p_payload.num_bags,0.5);assert.equal(calls.at(-1).args.p_payload.bags_opened,1);assert.equal(calls.at(-1).args.p_request_id,actor);checks+=5;
assert.equal((await api.POST(request({...body,bags_opened:0}))).status,201);assert.equal(calls.at(-1).args.p_payload.bags_opened,0);assert.equal((await api.POST(request({...body,bags_opened:0.5}))).status,400);assert.equal((await api.POST(request({...body,bags_opened:-1}))).status,400);assert.equal((await api.POST(request(body,null))).status,400);assert.equal((await api.POST(request({...body,created_by:'forged'}))).status,400);checks+=6;
for(const denied of [null,'property_manager','content_manager']){role=denied;const before=calls.length;assert.equal((await api.POST(request(body))).status,401);assert.equal(calls.length,before);checks+=2;}
role='manager';rpcError={code:'40001',message:'Closed or conflicting date'};assert.equal((await api.POST(request(body))).status,409);checks++;
console.log(`PASS: ${checks} daily-feed actual API checks: trusted actor, atomic stock RPC, partial feeding vs whole opened bags, stable retry identifier, forged fields and cross-role rejection, conflict propagation.`);
