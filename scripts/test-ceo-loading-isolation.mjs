import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const originalTimeout=globalThis.setTimeout;
globalThis.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===18000?30:ms,...args);
const expenses = [
 {business:'farm',currency:'NGN',status:'pending',activity_date:'2026-10-01',amount_exact:'10.10'},
 {business:'farm',currency:'NGN',status:'pending',activity_date:'2026-10-31',amount_exact:'0.20'},
 {business:'farm',currency:'NGN',status:'posted',activity_date:'2026-10-06',amount_exact:'50'},
 {business:'farm',currency:'NGN',status:'pending',activity_date:'2026-09-30',amount_exact:'40'},
 {business:'farm',currency:'CAD',status:'pending',activity_date:'2026-10-05',amount_exact:'60'},
 {business:'property',currency:'NGN',status:'pending',activity_date:'2026-10-06',amount_exact:'70'},
];
const records = {
 manager_pending_expenses:expenses,
 farm_purchase_exceptions:[
  {id:'open',date:'2026-10-12',amount_exact:'5.01'},
  {id:'in-funding',date:'2026-10-10',amount_exact:'10.10'},
  {id:'declined',date:'2026-10-06',amount_exact:'11.11'},
  {id:'old',date:'2026-09-12',amount_exact:'4.04'},
 ],
 farm_exception_postings:[{exception_id:'in-funding'}],
 farm_operation_events:[
  {record_type:'purchase_exception',operation:'resolve',record_id:'declined'},
  {record_type:'purchase_exception',operation:'approve_awaiting_funding',record_id:'in-funding'},
 ],
};
let fundingFailure = false;
const db = {from(table) {
 let rows=records[table]??[];
 const query={
  select:()=>query,
  eq:(column,value)=>{rows=rows.filter(row=>row[column]===value);return query;},
  order:()=>query,
  range:(start,end)=>table==='content_records'?new Promise(()=>{}):Promise.resolve(
   fundingFailure&&table==='manager_pending_expenses'?{data:null,error:'Unavailable'}:{data:rows.slice(start,end+1),error:null}),
 };
 return query;
}};
try{
 const {getCeoOverview}=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>db},'@/lib/farm-finance':{getFarmFinance:async()=>({})}})('lib/ceo-overview.ts');
 const result=await getCeoOverview({from:'2026-10-01',to:'2026-10-31'});
 assert.equal(result.content.data,null);assert.match(result.content.error,/CEO_SECTION_UNAVAILABLE/);
 for(const key of ['properties','farm','operations','crm','ultratidy','dba']){assert.equal(result[key].error,null,key);assert.ok(result[key].data,key);}
 assert.deepEqual(result.funding,{data:{pending:{count:2,amount:10.3},emergency:{count:1,amount:5.01}},error:null});
 fundingFailure=true;
 const missing=await getCeoOverview({from:'2026-10-01',to:'2026-10-31'});
 assert.match(missing.funding.error,/CEO_SECTION_UNAVAILABLE/);
 assert.ok(missing.farm.data);
 console.log('PASS CEO section isolation, exact pending spending, resolved reports, date scope and independent funding failure');
}finally{globalThis.setTimeout=originalTimeout;}
