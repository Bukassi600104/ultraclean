import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const contents=`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmOfflineWorkspace} from './components/offline/FarmOfflineWorkspace';import {saveFarmMedia,getFarmMedia} from './lib/farm-offline-media';window.media={saveFarmMedia,getFarmMedia};createRoot(document.getElementById('root')).render(<FarmOfflineWorkspace/>);`;
const boundary=`export function createClient(){return {auth:{getSession:async()=>({data:{session:{user:{id:sessionStorage.getItem('actor')||'alice'}}}}),onAuthStateChange:callback=>{window.authEvent=callback;return {data:{subscription:{unsubscribe(){}}}}}}}}`;
const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'boundaries',setup(builder){builder.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:'auth',namespace:'boundary'}));builder.onResolve({filter:/^next\/(image|link)$/},args=>({path:args.path,namespace:'boundary'}));builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:args.path==='auth'?boundary:`import React from 'react';export default function Element({unoptimized,children,...props}){return React.createElement('${args.path.endsWith('image')?'img':'a'}',props,children)}`,loader:'jsx',resolveDir:process.cwd()}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/bundle.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true}),page=await browser.newPage();const url='http://127.0.0.1:'+server.address().port,identity={actorId:'alice',business:'farm',periodId:'p1'},pointer='primefield-prepared-workspace-v1',key='primefield-report-draft:alice:period:p1';let checks=0;
await page.route('**/api/**',route=>route.abort('failed'));
try{
 await page.goto(url);await page.getByText('This workspace is locked.',{exact:false}).waitFor();checks++;
 await page.evaluate(async({identity,pointer,key})=>{
  const photo=await window.media.saveFarmMedia(identity,new Blob(['saved photo'],{type:'image/jpeg'}),{activity_date:'2026-10-31',target_resource:'farm_daily_reports'});
  localStorage.setItem(pointer,JSON.stringify({version:1,identity,preparedAt:'2026-10-31T09:00:00Z'}));
  localStorage.setItem(key,JSON.stringify({form:{report_date:'2026-10-31',decision_required:false,sections:{farm1:{pond1:'Initial pond',pond2:'',pond3:'',pond4:'',water_issue:''},farm2:{vat1:'',vat2:'',vat3:'',mortality:'',water_issue:'',pump_status:''},livestock:{goats:'',ram:'',cattle:'',piggery:'',poultry:'',mortality:'',sick_animals:'',feed:'',water:''},crops:{report:''},people:{supervisor:'',tasks_completed:''},problems:{issues:'',action_taken:'',request_category:'other'}}},mediaIds:[photo.id],oldUnsentField:'preserve'}));
 },{identity,pointer,key});
 await page.reload();await page.getByText('Saved photos',{exact:true}).waitFor();await page.getByLabel('Pond 1',{exact:true}).fill('Checked pond');checks++;
 await page.reload();await page.getByLabel('Pond 1',{exact:true}).waitFor();assert.equal(await page.getByLabel('Pond 1',{exact:true}).inputValue(),'Checked pond');checks++;
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).oldUnsentField,key),'preserve');checks++;
 await page.getByRole('button',{name:'Save report to send',exact:true}).click();await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('farm_pending_')).length),1);checks++;
 await page.reload();await page.getByLabel('Pond 1',{exact:true}).waitFor();assert.equal(await page.getByLabel('Pond 1',{exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Save report to send',exact:true}).count(),0);checks+=2;
 assert.equal(await page.evaluate(identity=>window.media.getFarmMedia(identity).then(rows=>rows.length),identity),1);checks++;
 await page.evaluate(()=>sessionStorage.setItem('actor','bob'));await page.reload();await page.getByText('This workspace is locked.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Pond 1',{exact:true}).count(),0);checks++;
 assert.ok(await page.evaluate(key=>localStorage.getItem(key),key));assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('farm_pending_')).length),1);checks+=2;
 assert.equal(await page.evaluate(identity=>window.media.getFarmMedia(identity).then(rows=>rows.length),identity),1);checks++;
 console.log('PASS '+checks+' actual browser offline workspace checks: identity lock, preserved legacy fields, editing/reload, retained photos, queue persistence, no duplicate and account mismatch');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
