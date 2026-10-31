import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const originalTimeout=globalThis.setTimeout;
globalThis.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===18000?30:ms,...args);
const db={from:table=>{const q={select:()=>q,order:()=>q,range:()=>table==='content_records'?new Promise(()=>{}):Promise.resolve({data:[],error:null})};return q;}};
try{
 const {getCeoOverview}=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>db},'@/lib/farm-finance':{getFarmFinance:async()=>({})}})('lib/ceo-overview.ts');
 const result=await getCeoOverview({from:'2026-10-01',to:'2026-10-31'});
 assert.equal(result.content.data,null);assert.match(result.content.error,/CEO_SECTION_UNAVAILABLE/);
 for(const key of ['properties','farm','operations','crm','ultratidy','dba']){assert.equal(result[key].error,null,key);assert.ok(result[key].data,key);}
 console.log('PASS CEO section isolation: hung content query becomes unavailable, six independent business sections still return');
}finally{globalThis.setTimeout=originalTimeout;}
