import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import ts from 'typescript';
const source=readFileSync('lib/farm-offline-media.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const storage=ts.transpileModule(readFileSync('lib/offline-storage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const server=createServer((req,res)=>res.end('<!doctype html><title>Isolated offline test</title>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async({compiled,storage})=>{
  const original={exports:{}};new Function('exports',storage)(original.exports);
  const module={exports:{}};new Function('require','exports',compiled)(()=>original.exports,module.exports);
  const media=module.exports,a={actorId:'A',business:'farm',periodId:'one'},b={...a,actorId:'B'};
  const draft=await media.saveFarmMedia(a,new Blob(['photo'],{type:'image/jpeg'}),{activity_date:'2026-10-30',target_resource:'farm_inventory_transactions'});
  const originalPut=IDBObjectStore.prototype.put;let quotaRejected=false;
  IDBObjectStore.prototype.put=function(){throw new DOMException('Storage full','QuotaExceededError');};
  try{await media.saveFarmMedia(a,new Blob(['second']),{activity_date:'2026-10-30',target_resource:'farm_inventory_transactions'});}catch{quotaRejected=true;}finally{IDBObjectStore.prototype.put=originalPut;}
  const own=(await media.getFarmMedia(a)).length,foreign=(await media.getFarmMedia(b)).length;
  await media.syncFarmMedia(a,{isCurrent:()=>true,send:async()=>new Response('{}',{status:503})});
  const failed=(await media.getFarmMedia(a))[0];
  let current=true;
  await media.syncFarmMedia(a,{isCurrent:()=>current,send:async()=>{current=false;return Response.json({data:{id:'server-photo',status:'uploaded'}});}});
  const switched=(await media.getFarmMedia(a))[0];
  await media.syncFarmMedia(a,{isCurrent:()=>true,send:async(url,options)=>{
   if(options.headers['X-Manager-Actor']!=='A')throw Error('Wrong actor');
   return Response.json({data:{id:'server-photo',status:'uploaded'}});
  }});
  const uploaded=(await media.getFarmMedia(a))[0];
  await media.removeFarmMedia(draft.id,b);
  const preserved=(await media.getFarmMedia(a)).length;
  await media.removeFarmMedia(draft.id,a);
  return {quotaRejected,own,foreign,failed:failed.status,switched:switched.evidenceId,uploaded:uploaded.evidenceId,blob:await uploaded.blob.text(),preserved,remaining:(await media.getFarmMedia(a)).length};
 },{compiled,storage});
 assert.deepEqual(result,{quotaRejected:true,own:1,foreign:0,failed:'pending',switched:undefined,uploaded:'server-photo',blob:'photo',preserved:1,remaining:0});
 console.log('PASS real IndexedDB: durable photo bytes, account isolation, failed upload retention, mid-flight account switch and safe removal');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
