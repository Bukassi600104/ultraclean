import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
let role='content_manager',calls=[],dbError=null;
const cache=new Map();
const query={select(){return this},order(){return this},range(){return Promise.resolve({data:[],error:dbError})}};
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;function resolve(name){if(name==='@/lib/auth')return {requireContentManager:async()=>{if(!['admin','content_manager'].includes(role))throw Error('Unauthorized');return {id:'00000000-0000-4000-8000-000000000001',role}}};if(name==='@/lib/supabase/server')return {createServerClient:()=>({from:()=>query,rpc:async(name,payload)=>{calls.push({name,payload});return {data:{id:'saved',...payload.p_payload},error:dbError}}})};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');return require(name)}new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports}
const route=load('app/api/content/[kind]/route.ts');let checks=0;
const context=kind=>({params:{kind}}),request=body=>new Request('http://localhost/api/content/records',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const valid={request_id:'00000000-0000-4000-8000-000000000002',data:{title:'Real post',platform:'instagram',content_type:'reel',status:'draft'}};
for(const denied of ['manager','property_manager',null]){role=denied;assert.equal((await route.GET(new Request('http://localhost/api/content/records'),context('records'))).status,403);assert.equal((await route.POST(request(valid),context('records'))).status,403);checks+=2}role='content_manager';
assert.equal((await route.POST(request(valid),context('records'))).status,201);checks++;
assert.equal(calls.at(-1).payload.p_actor,'00000000-0000-4000-8000-000000000001');checks++;
for(const body of [{...valid,data:{...valid.data,created_by:'forged'}},{...valid,data:{...valid.data,url:'javascript:alert(1)'}},{...valid,data:{...valid.data,status:'published'}},{...valid,request_id:'invalid'}]){assert.equal((await route.POST(request(body),context('records'))).status,400);checks++}
assert.equal((await route.POST(request({...valid,data:{platform:'instagram',metric_date:'2026-02-30',followers:2}}),context('performance'))).status,400);checks++;
assert.equal((await route.POST(request({...valid,data:{platform:'instagram',metric_date:'2026-10-05',followers:2,source:'official'}}),context('performance'))).status,400);checks++;
assert.equal((await route.POST(request({...valid,data:{sale_type:'affiliate',amount:-5,currency:'NGN',sale_date:'2026-10-05'}}),context('sales'))).status,400);checks++;
assert.equal((await route.GET(new Request('http://localhost/api/content/tokens'),context('tokens'))).status,404);checks++;
assert.equal((await route.POST(request(valid),context('integrations'))).status,405);checks++;
assert.equal((await route.PATCH(request({...valid,id:'00000000-0000-4000-8000-000000000003',expected_revision:0,reason:'Correct title',data:valid.data}),context('records'))).status,200);checks++;
assert.equal(calls.at(-1).payload.p_payload.expected_revision,0);checks++;
dbError={code:'23514',message:'Content platform cannot change while leads or performance records are linked. Create separate content for another platform.'};const linkedPlatform=await route.PATCH(request({...valid,id:'00000000-0000-4000-8000-000000000003',expected_revision:0,reason:'Change platform',data:{...valid.data,platform:'tiktok'}}),context('records'));assert.equal(linkedPlatform.status,400);assert.match((await linkedPlatform.json()).error,/platform.*locked/i);checks+=2;dbError={code:'40001',message:'stale'};assert.equal((await route.POST(request(valid),context('records'))).status,409);checks++;
dbError={code:'08006',message:'private database details'};const failed=await route.GET(new Request('http://localhost/api/content/records'),context('records'));assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private'));checks+=2;
console.log(`PASS: ${checks} actual content route checks; synthetic database only.`);
