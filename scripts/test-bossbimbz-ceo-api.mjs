import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
let profile=null,failTable=null;const reads=[];
const rows={property_rent_payments:Array.from({length:501},(_,i)=>({id:String(i),payment_date:'2026-10-01',amount:2,currency:'NGN'})),content_performance:[],farm_inventory_transactions:[]};
const db={from:table=>{const q={select:()=>q,order:()=>q,lte:()=>q,range:async(a,b)=>{reads.push([table,a,b]);return {data:(rows[table]??[]).slice(a,b+1),error:failTable===table?{message:'isolated query failure'}:null};}};return q;}};
const cache=new Map();
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const src=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
new Function('require','module','exports',src)(name=>{
 if(name==='next/server')return {NextResponse:{json:(data,init)=>Response.json(data,init)}};
 if(name==='next/headers')return {cookies:()=>({getAll:()=>[],set:()=>{}})};
 if(name==='@supabase/ssr')return {createServerClient:()=>({auth:{getUser:async()=>({data:{user:profile?{id:profile.id}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})})};
 if(name==='@/lib/supabase/server')return {createServerClient:()=>db};
 if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
 if(name.startsWith('.'))return load(path.join(path.dirname(file),name)+'.ts');return require(name);
},mod,mod.exports);return mod.exports;}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://isolated.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic';
const api=load('app/api/ceo/overview/route.ts'),req=(query='')=>({nextUrl:new URL('http://localhost/api/ceo/overview'+query)});let checks=0;
for(const role of [null,'manager','property_manager','content_manager']){profile=role?{id:'synthetic',role}:null;reads.length=0;assert.equal((await api.GET(req())).status,403);assert.equal(reads.length,0);checks+=2;}
profile={id:'synthetic',role:'admin',suspended:true};assert.equal((await api.GET(req())).status,403);checks++;
profile.suspended=false;assert.equal((await api.GET(req('?from=2026-02-30&to=2026-10-05'))).status,400);assert.equal((await api.GET(req('?from=2026-10-06&to=2026-10-05'))).status,400);checks+=2;
const response=await api.GET(req('?from=2026-10-01&to=2026-10-05')),result=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(result.properties.data.finances[0].rent,1002);assert.ok(reads.some(([table,start])=>table==='property_rent_payments'&&start===500));assert.equal(result.farm.data.productionCost.available,false);checks+=5;
failTable='property_expenses';const partial=await (await api.GET(req('?from=2026-10-01&to=2026-10-05'))).json();assert.equal(partial.properties.data,null);assert.ok(partial.properties.error);assert.equal(partial.content.error,null);checks+=3;
console.log(`PASS: ${checks} CEO actual handler/real guard checks; full pagination, invalid dates, partial errors and unavailable production allocation.`);
