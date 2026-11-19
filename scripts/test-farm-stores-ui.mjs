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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmStores} from './components/manager/FarmStores';import Inventory from './app/(dashboard)/dashboard/farm/inventory/page';createRoot(document.getElementById('root')).render(location.search.includes('tab=mortality')?<Inventory/>:<FarmStores admin={location.search.includes('admin')}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/DashboardHeader$/},()=>({path:'dashboard-header',namespace:'header'}));b.onLoad({filter:/.*/,namespace:'header'},()=>({contents:'export const DashboardHeader=()=>null,DashboardReadError=()=>null;'}));b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:'export const CashPayerSelect=()=>null,CashReceiverSelect=()=>null,selectedCashReceiver=()=>null;',loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage({timezoneId:'America/Toronto'});page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
const animal={id:'00000000-0000-4000-8000-000000000002',resource:'animals',label:'Catfish',product:'catfish',quantity:334,unit:'head'};
const penReading={id:'00000000-0000-4000-8000-000000000003',date:'2026-11-12',area:'poultry_a',actor_name:'Supervisor',observations:{animal_count:0,eggs:17}};
const asset={id,resource:'eggs',label:'Assigned layers',quantity:50,unit:'eggs',pack_size:null,opening_verified:false};
const death={id:'00000000-0000-4000-8000-000000000010',product:'turkey',action:'mortality',quantity:4,date:'2026-11-09',created_at:'2026-11-09T12:00:00Z',reason:'Recorded loss'};
const batched={...death,id:'00000000-0000-4000-8000-000000000011',batch_id:'00000000-0000-4000-8000-000000000012',quantity:1,date:null,created_at:'2026-11-09T23:30:00Z'};
let deathReversed=false;
await page.route('**/api/**',async route=>{const request=route.request(),url=new URL(request.url());let body={data:[]};
 if(url.pathname==='/api/farm/inventory')body=[{id:animal.id,product:'catfish',current_stock:334,last_updated:'2026-11-09T12:00:00Z'}];
 if(url.pathname==='/api/farm/inventory/transaction')body={data:deathReversed?[death,batched,{...death,id:'reversed',action:'add',date:'2026-11-12',correction_of:death.id,correction_role:'reversal'}]:[death,batched]};
 if(url.pathname==='/api/farm/batch-records')body={records:[{id:'00000000-0000-4000-8000-000000000013',batch_id:batched.batch_id,mortality_id:batched.id,period_id:id}]};
 if(url.pathname==='/api/farm/corrections/admin'){
  const payload=request.postDataJSON();
  posts.push(payload);
  if(payload.record_type==='inventory_transaction')deathReversed=true;
  body={id:payload.record_id};
 }
 if(url.pathname==='/api/farm/stores'){
  if(request.method()==='POST'){const p=request.postDataJSON();posts.push(p);if(p.operation==='count')counts=[{id,...p.payload,asset_id:id,label:asset.label,system_quantity:50,created_at:new Date().toISOString(),decision:null}];else counts[0].decision={...p.payload,created_at:new Date().toISOString()};body={data:{id}};}
  else body={assets:[asset,animal],area_observations:[penReading],counts,egg_movements:[],egg_sales:[],cost_basis:'Verified receipts only'};
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('article').filter({has:page.getByRole('heading',{name:asset.label})}).getByRole('button',{name:'Record physical count',exact:true}).click();await page.getByRole('dialog').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
  assert.equal(await page.getByLabel('Physical count (eggs)',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.locator('article').filter({has:page.getByRole('heading',{name:asset.label})}).getByRole('button',{name:'Record physical count',exact:true}).click();await page.getByLabel('Physical count (eggs)',{exact:true}).fill('49');await page.getByLabel('Notes',{exact:true}).fill('Verified trays');await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByText(/Counted 49 eggs/).waitFor();assert.equal(posts[0].payload.quantity,49);assert.equal(asset.quantity,50,'Observation does not replace book stock');
 await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');await page.getByRole('button',{name:'Review count',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByLabel('Physical count (eggs)',{exact:true}).count(),0);await page.getByLabel('Reason',{exact:true}).fill('Verified actual count');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByText('Verified actual count',{exact:true}).waitFor();
 const log=page.locator('section').filter({has:page.getByRole('heading',{name:'Eggs reported from pens'})});
 assert.match(await log.innerText(),/Eggs collected\s+17/);
 assert.match(await log.innerText(),/Birds counted\s+0/);
 await page.getByLabel('Show stock').selectOption('animals');
 const correction=page.locator('article').filter({has:page.getByRole('heading',{name:'Catfish',exact:true})});
 await correction.getByRole('button',{name:'Record count for review',exact:true}).click();
 const count=page.getByLabel('Physical count (head)',{exact:true});await count.fill('0');
 assert.equal(await count.inputValue(),'0');assert.equal(await count.getAttribute('step'),'1');
 assert.equal(await page.getByRole('button',{name:'Save entry',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/?admin=1&view=animals#stock-'+animal.id);
 await page.waitForFunction(id=>document.activeElement?.id==='stock-'+id,animal.id);
 await page.getByRole('button',{name:'Correct Catfish stock'}).click();
 const stockDialog=page.getByRole('dialog');
 await stockDialog.getByLabel('Correct current quantity').fill('0');await stockDialog.getByLabel('Reason',{exact:true}).fill('Checked physical count');
 await stockDialog.getByRole('button',{name:'Save correction'}).click();await stockDialog.waitFor({state:'hidden'});
 assert.equal(posts.at(-1).record_id,animal.id);assert.equal(posts.at(-1).changes.expected_current_stock,334);assert.equal(posts.at(-1).changes.target_quantity,0);
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/?admin=1&tab=mortality&from=2026-11-01&to=2026-11-17&period_id='+id);
  const losses=page.getByRole('table').filter({has:page.getByRole('columnheader',{name:'Deaths',exact:true})});
  const correct=losses.getByRole('button',{name:'Correct deaths'}).first();
  await correct.waitFor();const correctBounds=await correct.boundingBox();assert.ok(correctBounds.x>=0&&correctBounds.x+correctBounds.width<=width,'Visible correction without horizontal scrolling');
  assert.match(await losses.locator('tbody tr').first().innerText(),/09 Nov 2026/,'The farm record keeps its date on a Toronto phone');
  assert.match(await losses.locator('tbody tr').last().innerText(),/10 Nov 2026/,'A historical timestamp uses the day in Nigeria');
  await correct.click();
  const correctionDialog=page.getByRole('dialog');
  await correctionDialog.getByRole('heading',{name:'Correct recorded deaths'}).waitFor();
  await correctionDialog.getByLabel('Correct quantity').fill('0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===1440){
   await correctionDialog.getByLabel('Reason',{exact:true}).fill('No deaths on this date');
   await correctionDialog.getByRole('button',{name:'Save correction'}).click();
   await correctionDialog.waitFor({state:'hidden'});
   assert.equal(posts.at(-1).record_id,death.id);assert.equal(posts.at(-1).changes.quantity,0);
   await page.waitForFunction(()=>document.body.querySelectorAll('[role=tabpanel][data-state=active] tbody tr').length===1);
  }else await correctionDialog.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Correct deaths'}).click();
 const batchTarget=new URL(await page.getByRole('link',{name:'Open the daily record to correct deaths'}).getAttribute('href'),origin);
 assert.equal(batchTarget.pathname,'/dashboard/farm/today');assert.equal(batchTarget.searchParams.get('date'),'2026-11-10');
 assert.equal(batchTarget.searchParams.get('batch_id'),batched.batch_id);assert.equal(batchTarget.searchParams.get('record_id'),'00000000-0000-4000-8000-000000000013');
 assert.equal(batchTarget.searchParams.get('period_id'),id);assert.equal(posts.filter(p=>p.record_type==='inventory_transaction').length,1);
 await page.goto(origin+'/?admin=1&tab=mortality&from=2026-11-09&to=2026-11-09');
 await page.getByText('No mortality records yet',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'All Transactions'}).click();
 const oldDeath=page.getByRole('row').filter({hasText:'09 Nov 2026'});
 await oldDeath.getByText('Corrected',{exact:true}).waitFor();
 assert.match(await oldDeath.innerText(),/Turkey|turkey/);
 assert.equal(await oldDeath.getByRole('button',{name:'Correct',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS four widths, physical stock, standalone and linked death corrections, historical cutoffs and visible audit history');
}catch(e){console.error(await page.locator('body').innerText(),errors);throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
