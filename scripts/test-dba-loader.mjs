import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const js=ts.transpileModule(readFileSync('app/(dashboard)/dashboard/dba/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const tree=ts.createSourceFile('page.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let body;
function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='loadData')body=node.body.getText(tree).slice(1,-1);else ts.forEachChild(node,find);}find(tree);assert.ok(body);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const failures=[];
for(const hadSummary of [false,true]){
 const state={summary:hadSummary?{revenue:99}:null,products:[],sales:[],financeError:false,recordsError:false};
 const bindings={window:{location:{search:''}},farmDateToday:()=> '2026-10-27',setFinanceLoading:()=>{},setPeriod:()=>{},setIsLoading:()=>{},setProducts:value=>state.products=value,setSales:value=>state.sales=value,setSummary:value=>state.summary=value,setFinanceError:value=>state.financeError=value,setRecordsError:value=>state.recordsError=value,fetch:async url=>url.includes('/overview')?Response.json({error:'Synthetic aggregate unavailable'},{status:503}):Response.json(url.includes('/products')?[{id:'product',name:'Existing product'}]:{data:[{id:'sale',amount:99}]})};
 await new AsyncFunction(...Object.keys(bindings),body)(...Object.values(bindings));
 for(const [pass,message] of [[state.products.length===1,'Products unavailable'],[state.sales.length===1,'History unavailable'],[state.summary===null,'Stale summary not cleared'],[state.financeError===true,'Missing explicit finance error'],[state.recordsError===false,'Records incorrectly marked failed']])if(!pass)failures.push(`${hadSummary?'refresh':'initial'}: ${message}`);
}
assert.deepEqual(failures,[]);
console.log('PASS actual DBA loader: operational reads survive analytics failure, stale summary cleared on refresh');
