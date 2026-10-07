import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url), ts=require('typescript');
let profile=null, rpcCalls=[], rpcError=null, queryError=null, orders=[];
const rows=[{id:'00000000-0000-4000-8000-000000000002',name:'Actual property',revision:0}];
const query={select(){return this},order(column){orders.push(column);return this},range(){return this},eq(){return this},then(resolve){resolve({data:queryError?null:rows,error:queryError})}};
const db={from(){return {...query}},rpc:async(name,args)=>{rpcCalls.push({name,args});return {data:rows[0],error:rpcError}}};
const cache=new Map();
function load(filename){
 const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 function resolve(name){
  if(name==='next/headers')return {cookies:()=>({getAll:()=>[],set:()=>{}})};
  if(name==='next/server')return {NextResponse:{json:(body,init={})=>({status:init.status??200,json:async()=>body})}};
  if(name==='@supabase/ssr')return {createServerClient:()=>({auth:{getUser:async()=>({data:{user:profile?{id:profile.id}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})})};
  if(name==='@/lib/supabase/server')return {createServerClient:()=>db};
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
  if(name.startsWith('.'))return load(path.join(path.dirname(file),name)+'.ts');
  return require(name);
 }
 new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports;
}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://isolated.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-only';
const route=load('app/api/property/[kind]/route.ts');let checks=0;
const request=(body)=>new Request('http://isolated.invalid/api/property/properties',{method:'POST',body:JSON.stringify(body)});
const params={params:{kind:'properties'}};
for(const role of [null,'manager','content_manager','property_manager','admin']){
 profile=role?{id:'00000000-0000-4000-8000-000000000001',role,suspended:false}:null;
 const result=await route.GET(new Request('http://isolated.invalid/api/property/properties'),params);
 assert.equal(result.status,role==='admin'||role==='property_manager'?200:403);checks++;
}
profile={id:'00000000-0000-4000-8000-000000000001',role:'property_manager',suspended:true};
assert.equal((await route.GET(new Request('http://isolated.invalid'),params)).status,403);checks++;
profile.suspended=false;
assert.equal((await route.GET(new Request('http://isolated.invalid'),{params:{kind:'profiles'}})).status,404);checks++;
let result=await route.POST(request({name:'Oak House',address:'Toronto',status:'active',currency:'CAD',request_id:'00000000-0000-4000-8000-000000000003'}),params);
assert.equal(result.status,200);assert.equal(rpcCalls.at(-1).name,'property_write');assert.equal(rpcCalls.at(-1).args.p_actor,profile.id);assert.equal(rpcCalls.at(-1).args.p_kind,'property');checks+=4;
for(const body of [{created_by:'forged',name:'x'},{name:'x',currency:'bad'},{name:'',address:'x',status:'active',currency:'CAD'},{name:'x',address:'x',status:'active',currency:'CAD',request_id:'bad'}]){assert.equal((await route.POST(request(body),params)).status,400);checks++;}
assert.equal((await route.POST(request({operation:'update',id:rows[0].id,name:'New name',expected_revision:0}),params)).status,400);checks++;
result=await route.POST(request({operation:'update',id:rows[0].id,name:'New name',expected_revision:0,reason:'Correct typo'}),params);
assert.equal(result.status,200);assert.equal(rpcCalls.at(-1).args.p_payload.expected_revision,0);assert.equal(rpcCalls.at(-1).args.p_reason,'Correct typo');checks+=3;
for(const [error,status] of [[{code:'40001',message:'Record changed; refresh'},409],[{code:'23514',message:'Currency must match property'},400],[{code:'42501',message:'Unauthorized'},403],[{code:'XX000',message:'private error'},500]]){rpcError=error;result=await route.POST(request({name:'x',address:'x',status:'active',currency:'CAD'}),params);assert.equal(result.status,status);checks++;}
rpcError=null;queryError={message:'private database detail'};result=await route.GET(new Request('http://isolated.invalid'),params);assert.equal(result.status,500);assert.ok(!(await result.json()).error.includes('private database'));checks+=2;
queryError=null;
await route.GET(new Request('http://isolated.invalid'),{params:{kind:'history'}});assert.equal(orders.at(-2),'happened_at');checks++;
assert.equal((await route.GET(new Request('http://isolated.invalid?page=-1'),params)).status,400);checks++;
const recordId=rows[0].id;
const valid={units:{property_id:recordId,name:'UnitA',status:'vacant'},tenancies:{unit_id:recordId,tenant_name:'Ada',tenant_contact:null,start_date:'2026-10-01',end_date:null,rent_amount:0,currency:'CAD',status:'active'},rent:{tenancy_id:recordId,amount:100,currency:'CAD',payment_date:'2026-10-05',period_start:'2026-10-01',period_end:'2026-10-31',payment_method:'Bank',notes:null},expenses:{property_id:recordId,unit_id:null,category:'Repair',amount:100,currency:'CAD',expense_date:'2026-10-05',notes:null},maintenance:{property_id:recordId,unit_id:null,issue:'Leaking pipe',category:'repair',status:'open',priority:'normal',cost:0,currency:'CAD',resolution:null}};
for(const [kind,body] of Object.entries(valid)){
 const context={params:{kind}};assert.equal((await route.POST(request(body),context)).status,200);assert.equal((await route.POST(request({...body,operation:'update',id:recordId,reason:'Confirmed details',expected_revision:0}),context)).status,200);checks+=2;
 assert.equal((await route.POST(request({...body,actor_id:recordId}),context)).status,400);checks++;
}
for(const body of [{...valid.rent,payment_date:'2026-02-30'},{...valid.rent,amount:-1},{...valid.rent,currency:'cad'}]){assert.equal((await route.POST(request(body),{params:{kind:'rent'}})).status,400);checks++;}
assert.equal((await route.POST(request({...valid.units,status:'occupied'}),{params:{kind:'units'}})).status,400);checks++;
for(const role of ['manager','content_manager']){profile.role=role;const before=rpcCalls.length;assert.equal((await route.POST(request({name:'x',address:'x',currency:'CAD',status:'active'}),params)).status,403);assert.equal(rpcCalls.length,before);checks+=2;}
console.log(`PASS: ${checks} actual property API checks with real session guard; isolated synthetic database.`);
