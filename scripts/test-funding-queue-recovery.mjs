import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const values=new Map();globalThis.localStorage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};globalThis.window={dispatchEvent(){}};
const load=typescriptLoader(),store=load('lib/offline-storage.ts'),{syncManagerPending}=load('lib/manager-offline-sync.ts');
const identity={actorId:'00000000-0000-4000-8000-000000000001',business:'farm',periodId:'00000000-0000-4000-8000-000000000002'},requestId='00000000-0000-4000-8000-000000000003';
const saved=store.savePending('/api/farm/expenses',{amount:4500,request_id:requestId},identity);let phase='first',calls=[];
const send=async(url,options)=>{calls.push({url,options});return phase==='first'?Response.json({status:'pending_funding',id:'review'},{status:202}):Response.json({status:phase});};
await syncManagerPending(identity,{send,isCurrent:()=>true});assert.equal(store.getPendingItems(identity)[0].fundingReview,true);
phase='pending';await syncManagerPending(identity,{send,isCurrent:()=>true});assert.equal(store.getPendingItems(identity).length,1);assert.ok(calls.at(-1).url.includes('funding-status'));assert.equal(calls.at(-1).options.method,undefined);
phase='posted';await syncManagerPending(identity,{send,isCurrent:()=>true});assert.equal(store.getPendingItems(identity).length,0);assert.equal(JSON.parse(values.get('farm_reviewed_'+saved)).data.amount,4500);assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
const rejected=store.savePending('/api/farm/expenses',{amount:100,request_id:crypto.randomUUID()},identity);store.updatePending({...store.getPendingItems(identity)[0],conflict:"Saved for Bimbo's funding review; not yet posted"},identity);phase='declined';await syncManagerPending(identity,{send,isCurrent:()=>true});assert.equal(JSON.parse(values.get('farm_reviewed_'+rejected)).fundingStatus,'declined');
values.set('farm_pending_broken','{bad');assert.equal(store.getQuarantinedCount(),1);assert.deepEqual(store.getPendingItems(identity),[]);assert.equal(values.get('farm_pending_broken'),'{bad');
let scope={...identity,mode:'personal',managerId:identity.actorId,status:'active',featureEnabled:true},queries=[],pendingStatus='posted';
const db={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},in(k,v){filters[k]=v;return q},maybeSingle:async()=>{queries.push({table,filters});return {data:{period_id:identity.periodId,result:{status:'pending_funding',id:'pending-id'}}}},then(resolve){queries.push({table,filters});resolve({data:[{id:'pending-id',status:pendingStatus,posted_record_id:'posted-id'}]});}};return q;}};
const route=typescriptLoader({'@/lib/manager-read-api':{requestManagerScope:async()=>scope,managerReadError:()=>Response.json({error:'Unavailable'},{status:503})},'@/lib/supabase/server':{createServerClient:()=>db}})('app/api/operations/funding-status/route.ts');
const response=await route.GET(new Request('https://isolated.invalid/api/operations/funding-status?business=farm&request_id='+requestId));assert.equal(response.status,200);assert.equal((await response.json()).status,'posted');assert.equal(queries[0].filters.actor_id,identity.actorId);assert.equal(queries[0].filters.period_id,identity.periodId);assert.equal(queries[1].filters.requested_by,identity.actorId);assert.equal(queries[1].filters.period_id,identity.periodId);assert.equal(response.headers.get('cache-control'),'private, no-store');
assert.equal((await route.GET(new Request('https://isolated.invalid?business=farm&request_id=bad'))).status,400);
const purchaseChecks=[];
const purchaseDB={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},in(k,v){filters[k]=v;return q},
 async maybeSingle(){purchaseChecks.push({table,filters});return {data:table==='farm_purchase_receipts'?{result:{id:'linked-funding',status:'pending_funding'}}:null};},
 then(fn){purchaseChecks.push({table,filters});fn({data:filters.period_id==='wrong-period'?[]:[{id:'linked-funding',status:'posted'}]});}};return q;}};
const purchaseStatus=typescriptLoader({'@/lib/manager-read-api':{requestManagerScope:async()=>scope,managerReadError:()=>Response.json({}, {status:503})},'@/lib/supabase/server':{createServerClient:()=>purchaseDB}})('app/api/operations/funding-status/route.ts');
const purchaseRequest=()=>new Request('https://isolated.invalid/api/operations/funding-status?business=farm&request_id='+requestId);
scope={...scope,mode:'admin_all',periodId:null};assert.equal((await (await purchaseStatus.GET(purchaseRequest())).json()).status,'posted');
assert.equal(purchaseChecks[1].filters.actor_id,identity.actorId);assert.equal(purchaseChecks[2].filters.requested_by,identity.actorId);
scope={...scope,mode:'personal',periodId:'wrong-period'};assert.equal((await (await purchaseStatus.GET(purchaseRequest())).json()).status,'unknown');
const {feedSubmissionRejected}=load('lib/feed-submission.ts');assert.equal(feedSubmissionRejected(409,{code:'23514',error:'Record the actual starting bag count first'}),true);assert.equal(feedSubmissionRejected(503,{code:'23514'}),false);assert.equal(feedSubmissionRejected(409,{code:'23514',error:'Retry identifier belongs to a different entry'}),false);
console.log('PASS funding review recovery without reposting, actor/period filters, preserved rejected records, malformed queue visibility and atomic feed rejection handling');
