import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
let actor={id:'manager-a',role:'manager'},checks=0,calls=[];
const auth={requireManager:async()=>actor,requireAdmin:async()=>{if(actor.role!=='admin')throw Error();return actor},requirePropertyManager:async()=>actor,requireContentManager:async()=>actor};
const db={from(){throw Error('Unscoped table access is forbidden for a personal manager')},async rpc(name,args){calls.push([name,args]);if(name==='manager_context'){
 if(args.p_period_id&&actor.role!=='admin'&&args.p_period_id!=='period-a')return {error:{code:'42501',message:'Own manager period only'}};
 return {data:{business:args.p_business,actorId:actor.id,managerId:actor.role==='admin'?null:actor.id,periodId:args.p_period_id||'period-a',mode:'personal',status:'active',startsOn:'2026-10-28'}};
 }if(name==='manager_read_records')return {data:{data:[],total:0,has_more:false}};if(name==='manager_day_read')return {data:null};if(name==='farm_v2_write')return {data:[{id:'saved',total_amount:240000}]};throw Error(name)}};
const load=typescriptLoader({'@/lib/auth':auth,'@/lib/supabase/server':{createServerClient:()=>db}});
const req=(url)=>new Request('http://localhost'+url);
for(const [file,url,context]of[
 ['app/api/farm/sales/route.ts','/api/farm/sales'],['app/api/farm/expenses/route.ts','/api/farm/expenses'],['app/api/farm/feed-purchases/route.ts','/api/farm/feed-purchases'],
 ['app/api/farm/fund-transfers/route.ts','/api/farm/fund-transfers'],['app/api/farm/inventory/route.ts','/api/farm/inventory'],['app/api/farm/daily-feed/route.ts','/api/farm/daily-feed'],
 ['app/api/farm/inventory/transaction/route.ts','/api/farm/inventory/transaction'],['app/api/farm/supplies/route.ts','/api/farm/supplies'],['app/api/farm/supplies/history/route.ts','/api/farm/supplies/history'],
 ['app/api/farm/feed-stock/route.ts','/api/farm/feed-stock'],['app/api/farm/corrections/route.ts','/api/farm/corrections'],['app/api/farm/daily-reports/route.ts','/api/farm/daily-reports'],
 ['app/api/farm/operational-requests/route.ts','/api/farm/operational-requests'],
 ['app/api/property/[kind]/route.ts','/api/property/properties',{params:{kind:'properties'}}],['app/api/content/[kind]/route.ts','/api/content/records',{params:{kind:'records'}}]
]){actor.role=url.includes('property')?'property_manager':url.includes('content')?'content_manager':'manager';const route=load(file);const response=await route.GET(req(url),context);assert.equal(response.status,200,file+': '+await response.clone().text());checks++;const data=await response.json();assert.deepEqual(Array.isArray(data)?data:data.data,[]);checks++;const denied=await route.GET(req(url+'?period_id=foreign'),context);assert.equal(denied.status,403);checks++;}
assert.ok(calls.some(([name])=>name==='manager_read_records'));checks++;
actor.role='manager';
for(const [file,url,key]of[['app/api/farm/daily-record/route.ts','/api/farm/daily-record','record'],['app/api/farm/balance/route.ts','/api/farm/balance?date=2026-10-28','closing_balance']]){
 const response=await load(file).GET(req(url));assert.equal(response.status,200);assert.equal((await response.json())[key],key==='record'?null:0);checks+=2;
}
const sales=load('app/api/farm/sales/route.ts'),body=[{product:'goat',quantity:3,unit_price:80000,date:'2026-10-28'}];
for(const headers of [{},{'X-Manager-Actor':'manager-b','X-Manager-Period':'period-a'},{'X-Manager-Actor':'manager-a','X-Manager-Period':'old-period'}]){
 const before=calls.filter(([name])=>name==='farm_v2_write').length;
 assert.equal((await sales.POST(new Request('http://localhost/api/farm/sales',{method:'POST',headers,body:JSON.stringify(body)}))).status,403);
 assert.equal(calls.filter(([name])=>name==='farm_v2_write').length,before);checks+=2;
}
const posted=await sales.POST(new Request('http://localhost/api/farm/sales',{method:'POST',headers:{'X-Manager-Actor':'manager-a','X-Manager-Period':'period-a'},body:JSON.stringify(body)}));
assert.equal(posted.status,201);assert.equal(calls.at(-1)[1].p_actor,'manager-a');assert.equal(calls.at(-1)[1].p_payload[0].manager_period_id,'period-a');checks+=3;
console.log(`PASS ${checks} scoped manager API checks using actual route/resolver code; no business-wide fallback`);
