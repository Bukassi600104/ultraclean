import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {readFileSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const id='00000000-0000-4000-8000-000000000001';
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmStores} from './components/manager/FarmStores';createRoot(document.getElementById('root')).render(<FarmStores admin={location.search.includes('admin')}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:'export const CashPayerSelect=()=>null;',loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
const asset={id,resource:'eggs',label:'Assigned layers',quantity:50,unit:'eggs',pack_size:null,opening_verified:false};
await page.route('**/api/**',async route=>{const request=route.request(),url=new URL(request.url());let body={data:[]};
 if(url.pathname==='/api/farm/stores'){
  if(request.method()==='POST'){const p=request.postDataJSON();posts.push(p);if(p.operation==='count')counts=[{id,...p.payload,asset_id:id,label:asset.label,system_quantity:50,created_at:new Date().toISOString(),decision:null}];else counts[0].decision={...p.payload,created_at:new Date().toISOString()};body={data:{id}};}
  else body={assets:[asset],counts,egg_movements:[],egg_sales:[],cost_basis:'Verified receipts only'};
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'Record physical count',exact:true}).click();await page.getByRole('dialog').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
  assert.equal(await page.getByLabel('Physical count (eggs)',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Record physical count',exact:true}).click();await page.getByLabel('Physical count (eggs)',{exact:true}).fill('49');await page.getByLabel('Notes',{exact:true}).fill('Verified trays');await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByText(/Counted 49 eggs/).waitFor();assert.equal(posts[0].payload.quantity,49);assert.equal(asset.quantity,50,'Observation does not replace book stock');
 await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');await page.getByRole('button',{name:'Review count',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByLabel('Physical count (eggs)',{exact:true}).count(),0);await page.getByLabel('Reason',{exact:true}).fill('Verified actual count');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByText('Verified actual count',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS stores actual UI: all four widths, blank unknown count, dated observation, immutable manager count and CEO decision without re-entry');
}catch(e){console.error(await page.locator('body').innerText(),errors);throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
