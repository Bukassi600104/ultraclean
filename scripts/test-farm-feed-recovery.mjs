import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=fs.readFileSync('components/manager/DailyFeed.tsx','utf8');
const helpers=source.slice(source.indexOf('const FEED_TYPES'),source.indexOf('export default function'));
const handler=source.slice(source.indexOf('  async function handleSave()'),source.indexOf('\n  const feedLabel'));
const js=ts.transpileModule(helpers+'\n'+handler+'\nglobalThis.run=handleSave;globalThis.checkPending=validPending;globalThis.checkDraft=validDraft;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const key='saved-feed',date='2026-11-10';
function fixture({foreign=false,failAfterAck=false,failSource='',malformedSuccess=false}={}){
 const disk=new Map(),calls=[],receipts=new Map(),errors=[];let bagDeductions=0,fail=failAfterAck;
 const ctx={console,crypto:globalThis.crypto,Date,Map,Set,JSON,Number,Error,localStorage:{getItem:k=>disk.get(k)??null,setItem(k,v){if(k===key&&v==='[]'&&fail){fail=false;throw Error('Storage unavailable after server acceptance');}disk.set(k,v);}},storageKey:key,restoredKey:key,storageFault:false,lock:{current:false},pending:{current:[]},enabled:true,openings:[],date,feedType:'fish',notes:'Actual feeding',localBags:'0.5',foreignBags:foreign?'0.75':'',localOpened:'1',foreignOpened:foreign?'1':'0',localOpening:'',foreignOpening:'',uncertain:false,feedSubmissionRejected:()=>false,loadRecords:async()=>{},setTimeout:()=>0,toast:{error:m=>errors.push(m),success:()=>{}},managerFetch:async(url,init)=>{const id=init.headers['X-Request-ID'],payload=JSON.parse(init.body);calls.push({id,payload});if(!receipts.has(id)){receipts.set(id,{data:{id:crypto.randomUUID()}});bagDeductions+=payload.bags_opened||0;}if(failSource===payload.feed_source){failSource='';throw Error('Response lost');}if(malformedSuccess){malformedSuccess=false;return {ok:true,json:async()=>({})};}return {ok:true,json:async()=>receipts.get(id)};}};
 for(const [name,field] of Object.entries({setSaving:'saving',setSaveError:'saveError',setUncertain:'uncertain',setDirty:'dirty',setLocalBags:'localBags',setForeignBags:'foreignBags',setLocalOpened:'localOpened',setForeignOpened:'foreignOpened',setLocalOpening:'localOpening',setForeignOpening:'foreignOpening',setNotes:'notes',setShowSuccess:'showSuccess'}))ctx[name]=value=>ctx[field]=value;
 vm.createContext(ctx);vm.runInContext(js,ctx);return {ctx,disk,calls,receipts,errors,deductions:()=>bagDeductions};
}
let checks=0;
for(const reload of [false,true]){
 const f=fixture({failAfterAck:true});await f.ctx.run();assert.equal(f.calls.length,1);assert.equal(f.ctx.pending.current.length,1);assert.equal(f.ctx.uncertain,true);assert.equal(f.deductions(),1);
 const first=f.calls[0];if(reload)f.ctx.pending.current=JSON.parse(f.disk.get(key));await f.ctx.run();assert.equal(f.calls.length,2);assert.equal(f.calls[1].id,first.id);assert.deepEqual(f.calls[1].payload,first.payload);assert.equal(f.receipts.size,1);assert.equal(f.deductions(),1);assert.equal(f.disk.get(key),'[]');assert.equal(JSON.parse(f.disk.get(key+':draft')).localBags,'');checks+=11;
}
{
 const f=fixture({foreign:true,failSource:'foreign'});await f.ctx.run();assert.equal(f.calls.length,2);assert.equal(f.ctx.pending.current.length,1);assert.equal(f.ctx.pending.current[0].payload.feed_source,'foreign');const original=f.calls[1];f.ctx.pending.current=JSON.parse(f.disk.get(key));await f.ctx.run();assert.equal(f.calls.length,3);assert.equal(f.calls[2].id,original.id);assert.deepEqual(f.calls[2].payload,original.payload);assert.equal(f.receipts.size,2);assert.equal(f.deductions(),2);checks+=8;
}
{
 const f=fixture({malformedSuccess:true});await f.ctx.run();const original=f.calls[0];assert.equal(f.ctx.pending.current.length,1);await f.ctx.run();assert.equal(f.calls[1].id,original.id);assert.equal(f.receipts.size,1);checks+=3;
}
{
 const f=fixture(),p={date,feed_type:'fish',num_bags:0.25},row={id:crypto.randomUUID(),payload:p};
 for(const v of [null,{},[null],[{...row,id:'bad'}],[{...row,payload:{...p,date:'2026-02-31'}}],[{...row,payload:{...p,num_bags:'1'}}],[{...row,payload:{...p,bags_opened:-1}}],[{...row,payload:{...p,opening_activity_id:'bad'}}],[row,row]]){assert.equal(f.ctx.checkPending(v),false);checks++;}
 assert.equal(f.ctx.checkPending([row]),true);assert.equal(f.ctx.checkPending([{...row,payload:{...p,notes:null}}]),true);assert.equal(f.ctx.checkPending([]),true);checks+=3;
 const draft={date,feedType:'fish',notes:'',localBags:'0.25',foreignBags:''};assert.equal(f.ctx.checkDraft(draft),true);checks++;
 for(const v of [{},null,{...draft,date:'2026-02-31'},{...draft,notes:[]},{...draft,localOpening:{}},{...draft,feedType:'unknown'}]){assert.equal(f.ctx.checkDraft(v),false);checks++;}
}
console.log(`PASS: ${checks} exact-source feed recovery assertions; idempotent retry after acknowledgement storage failure, partial sources, malformed success and saved data, and legacy compatibility. No live network/database calls.`);
