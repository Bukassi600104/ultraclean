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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmCredit} from './components/manager/FarmCredit';createRoot(document.getElementById('root')).render(<FarmCredit admin={location.search.includes('admin')}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:`import React from 'react';import {farmPaymentReceiver} from '@/lib/farm-payment-receiver';export const selectedCashReceiver=farmPaymentReceiver;export const CashReceiverSelect=p=>React.createElement('label',{},'Actual receiver',React.createElement('select',{'aria-label':'Actual receiver',value:p.value,onChange:e=>p.onChange(e.target.value)},React.createElement('option',{value:''},'Choose'),React.createElement('option',{value:'farm:primefield_account'},'Primefield Account')));`,loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
let receipts=[],invoices=[],readStatus=200,openingConflict='',holdAcknowledgement=false;
const accepted=new Map();
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let body={data:[]};
 if(url.pathname==='/api/farm/credit'){
 if(req.method()==='GET'&&readStatus!==200)return route.fulfill({status:readStatus,json:{error:readStatus===403?'Access ended':'Connection interrupted'}});
 if(req.method()==='POST'){
  const p=req.postDataJSON();posts.push(p);body={data:{id}};
  if(accepted.has(p.request_id)){
   assert.deepEqual(p,accepted.get(p.request_id));
   return holdAcknowledgement?route.abort('failed'):route.fulfill({json:body});
  }
  if(p.operation==='opening_balance'){
   if(openingConflict){const error=openingConflict;openingConflict='';return route.fulfill({status:409,json:{error}});}
   invoices.push({id,number:'PF-OPEN',kind:'opening_balance',reference:p.payload.reference,customer_id:id,customer_name:'Actual customer',sale_id:null,date:p.payload.date,due_date:null,total:p.payload.amount,owed:p.payload.amount,collected:'0',voided_at:null,overdue_days:0});
  }else if(p.operation==='void_opening_balance')invoices=invoices.map(i=>i.id===p.id?{...i,voided_at:new Date().toISOString(),owed:'0'}:i);
  else if(p.operation==='receipt'){
   const open=invoices.find(i=>Number(i.owed)>0&&!i.voided_at);const applied=open?Math.min(Number(p.payload.amount),Number(open.owed)):0;
   if(open){open.owed=String(Number(open.owed)-applied);open.collected=String(Number(open.collected)+applied);}
   receipts=[{id,date:p.payload.date,customer_name:'Actual customer',amount:p.payload.amount,voided_at:null,allocations:open?[{invoice_id:open.id,amount:String(applied)}]:[]}];
  }
  accepted.set(p.request_id,p);
  if(holdAcknowledgement)return route.abort('failed');
 }
 else body={customers:[{id,name:'Actual customer',phone:'Recorded contact',credit_days:30}],invoices,receipts,refunds:[],credit_notes:[],summary:{revenue:'0',collected:receipts.length?'40000':'0',owed:'0',unapplied:'0',refunded:'0'}};
 }else if(url.pathname.includes('fund'))body={accounts:[],sources:[],history:[],receipts:[],pending_expenses:[],ceo_receivers:[],manager_receivers:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();await page.getByRole('dialog').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();await page.getByLabel('Amount paid (NGN)',{exact:true}).fill('40000');await page.getByLabel('Customer',{exact:true}).selectOption(id);await page.getByLabel('Actual receiver',{exact:true}).selectOption('farm:primefield_account');await page.getByLabel('Amount owing after this payment (optional, NGN)').fill('10');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('alert').filter({hasText:'does not match'}).waitFor();assert.equal(posts.length,0);await page.getByLabel('Amount owing after this payment (optional, NGN)').fill('0');await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByRole('region',{name:'Payment history',exact:true}).getByRole('row').filter({hasText:'Actual customer'}).getByText('NGN 40,000.00',{exact:true}).waitFor();assert.equal(posts[0].payload.amount,'40000');assert.equal(posts[0].payload.amount_owing,'0');assert.deepEqual(posts[0].payload.cash_receiver,{type:'farm_destination',destination:'primefield_account'});assert.deepEqual(errors,[]);
 invoices=[{id,number:'PF-PAID',customer_id:id,customer_name:'Actual customer',sale_id:id,date:'2026-10-30',due_date:'2026-11-29',total:'100',owed:'0',voided_at:null,overdue_days:0}];await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');await page.getByRole('button',{name:'Credit invoice',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByLabel('Amount (NGN)',{exact:true}).fill('40');assert.equal(await page.getByRole('heading',{name:'Credit invoice',exact:true}).count(),1);assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Close',exact:true}).click();invoices=[{id,number:'PF-PART',customer_id:id,customer_name:'Actual customer',sale_id:id,date:'2026-10-30',due_date:'2026-11-29',total:'100000',owed:'25000',collected:'75000',credited:'0',voided_at:null,overdue_days:0}];await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');await page.getByText('Part paid',{exact:true}).waitFor();await page.getByText('NGN 75,000.00',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 receipts=[{id,date:'2026-11-02',customer_name:'Actual customer',amount:'35000',voided_at:null,allocations:[{invoice_id:id,amount:'35000'}]},{id:'old-receipt',date:'2026-11-01',customer_name:'Earlier receipt',amount:'1000',voided_at:null,allocations:[{invoice_id:'unknown-invoice',amount:'1000'}]}];
 for(const width of [375,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');const history=page.getByRole('region',{name:'Payment history',exact:true}),row=history.getByRole('row').filter({hasText:'Actual customer'});await row.getByText('PF-PART',{exact:true}).waitFor();for(const label of ['2026-11-02','Actual customer','NGN 35,000.00','NGN 25,000.00'])assert.ok(await row.getByText(label,{exact:true}).isVisible());assert.ok(await history.getByText('Balances show what is owed now, including later payments and credits.',{exact:true}).isVisible());assert.ok(await history.getByRole('row').filter({hasText:'Earlier receipt'}).getByText('Unavailable',{exact:true}).isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.doesNotMatch(await page.locator('body').innerText(),/\uFFFD/);await page.screenshot({path:path.join(folder,`credit-history-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();
 const typed=page.getByLabel('Amount paid (NGN)',{exact:true});await typed.fill('1200');
 const focus=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 receipts=[...receipts,{id:'another-receipt',date:'2026-11-03',customer_name:'Another recorded payment',amount:'800',allocations:[],voided_at:null}];
 await focus();await page.getByText('Another recorded payment',{exact:true}).waitFor({state:'attached'});
 assert.equal(await typed.inputValue(),'1200');
 readStatus=503;await focus();await page.getByText(/Connection interrupted/).waitFor({state:'attached'});
 assert.equal(await typed.inputValue(),'1200');assert.equal(posts.length,1);
 readStatus=403;await focus();await page.getByText(/Access ended/).waitFor();
 assert.equal(await typed.count(),0);assert.equal(await page.getByText('Another recorded payment',{exact:true}).count(),0);
 await page.getByRole('dialog').waitFor({state:'detached'});
 readStatus=200;
 for(const [role,width] of [['supervisor',375],['admin',1440]]){
  receipts=[];invoices=[];
  await page.setViewportSize({width,height:850});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?role='+role+'&period_id='+id);
  const dialog=page.getByRole('dialog');
  await page.getByRole('button',{name:'Record credit owing',exact:true}).click();
  await dialog.getByLabel('Credit owing (NGN)',{exact:true}).waitFor();
  assert.equal(await dialog.getByLabel('Amount paid (NGN)',{exact:true}).count(),0);
  assert.equal(await dialog.getByLabel('Actual receiver',{exact:true}).count(),0);
  await dialog.getByLabel('Customer',{exact:true}).selectOption(id);
  await dialog.getByText('New sale on credit',{exact:true}).click();
  await dialog.getByLabel('Product sold').selectOption('goat');
  const saleLink=new URL(await dialog.getByRole('link',{name:'Continue to sale'}).getAttribute('href'),'https://farm.test');
  assert.equal(saleLink.pathname,(role==='admin'?'/dashboard/farm':'')+'/sales/goat');
  assert.equal(saleLink.searchParams.get('customer_id'),id);assert.equal(saleLink.searchParams.get('payment'),'credit');assert.equal(saleLink.searchParams.get('period_id'),id);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Record payment received',exact:true}).click();
  await dialog.getByLabel('Customer',{exact:true}).selectOption(id);
  await dialog.getByRole('button',{name:'Record credit owing',exact:true}).click();
  await dialog.getByRole('heading',{name:'Record credit owing',exact:true}).waitFor();
  assert.equal(await dialog.getByLabel('Customer',{exact:true}).inputValue(),id);
  await dialog.getByLabel('Credit owing (NGN)',{exact:true}).fill('5000.50');
  await dialog.getByLabel('Original invoice or reference',{exact:true}).fill('Earlier-'+role);
  if(role==='supervisor'){
   openingConflict='This reference is already on the customer account. Open the existing entry.';await dialog.getByRole('button',{name:'Save credit owing'}).click();
   await dialog.getByRole('alert').filter({hasText:'reference is already'}).waitFor();
   assert.equal(await dialog.getByLabel('Credit owing (NGN)',{exact:true}).inputValue(),'5000.50');
   await dialog.getByLabel('Original invoice or reference',{exact:true}).fill('Verified-'+role);
  }else{
   openingConflict='A reason is required for a closed-day correction';
   await dialog.getByRole('button',{name:'Save credit owing'}).click();await dialog.getByRole('alert').filter({hasText:'closed-day correction'}).waitFor();
   await dialog.getByLabel(/Reason/).fill('Verified against the dated customer statement');
  }
  await dialog.getByRole('button',{name:'Save credit owing'}).click();
  const reference=role==='admin'?'Earlier-admin':'Verified-supervisor';
  const entry=page.getByRole('region',{name:'Sales and balances'}).getByRole('row').filter({hasText:'Earlier balance · '+reference});
  await entry.waitFor();assert.equal(await dialog.count(),0);assert.equal(posts.at(-1).operation,'opening_balance');
  assert.deepEqual(Object.keys(posts.at(-1).payload).sort(),role==='admin'?['amount','customer_id','date','reason','reference']:['amount','customer_id','date','reference']);assert.equal(posts.at(-1).payload.reference,reference);assert.equal(posts.at(-1).payload.amount,'5000.50');
  assert.equal(receipts.length,0);assert.equal(await entry.getByRole('button',{name:'Credit invoice'}).count(),0);
  assert.doesNotMatch(await entry.innerText(),/Due |null/i);
  if(role==='admin'){
   await entry.getByRole('button',{name:'Reverse earlier balance'}).click();await dialog.getByLabel('Reason',{exact:true}).fill('Original reference was entered twice');
   await dialog.getByRole('button',{name:'Reverse earlier balance'}).click();await dialog.waitFor({state:'hidden'});
   assert.equal(posts.at(-1).operation,'void_opening_balance');assert.equal(posts.at(-1).id,id);assert.deepEqual(posts.at(-1).payload,{reason:'Original reference was entered twice'});
  }else{
   await page.getByRole('button',{name:'Record payment received',exact:true}).click();
   await dialog.getByLabel('Amount paid (NGN)',{exact:true}).fill('1200.25');
   await dialog.getByLabel('Customer',{exact:true}).selectOption(id);await dialog.getByLabel('Actual receiver',{exact:true}).selectOption('farm:primefield_account');
   await dialog.getByLabel('Amount owing after this payment (optional, NGN)').fill('3800.25');
   await dialog.getByRole('button',{name:'Save entry',exact:true}).click();await dialog.waitFor({state:'hidden'});
   const payment=page.getByRole('region',{name:'Payment history'}).getByRole('row').filter({hasText:reference});
   await payment.getByText('NGN 3,800.25',{exact:true}).waitFor();assert.equal(receipts.length,1);
   assert.equal(posts.at(-1).payload.amount,'1200.25');assert.equal(posts.at(-1).payload.amount_owing,'3800.25');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }
 // A phone can lose the acknowledgement after the ledger committed. Opening either
 // entry point must still display and retry only the saved body and key.
 invoices=[];receipts=[];
 await page.goto('http://127.0.0.1:'+server.address().port+'/?role=supervisor');
 const dialog=page.getByRole('dialog');
 await page.getByRole('button',{name:'Record credit owing',exact:true}).click();
 await dialog.getByLabel('Customer',{exact:true}).selectOption(id);
 await dialog.getByLabel('Credit owing (NGN)',{exact:true}).fill('240.50');
 await dialog.getByLabel('Original invoice or reference',{exact:true}).fill('No acknowledgement');
 holdAcknowledgement=true;
 await dialog.getByRole('button',{name:'Save credit owing'}).click();
 await dialog.getByRole('button',{name:'Retry saved earlier balance'}).waitFor();
 const original=structuredClone(posts.at(-1));assert.equal(original.operation,'opening_balance');assert.equal(invoices.length,1);
 await page.reload();
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();
 await dialog.getByLabel('Customer',{exact:true}).selectOption(id);
 await dialog.getByRole('button',{name:'Record credit owing',exact:true}).click();
 const retry=dialog.getByRole('button',{name:'Retry saved earlier balance'});await retry.waitFor();
 assert.equal(await dialog.getByLabel('Credit owing (NGN)').count(),0);
 holdAcknowledgement=false;await retry.click();
 await dialog.getByText('This earlier balance has already been recorded.',{exact:true}).waitFor();
 assert.deepEqual(posts.at(-1),original);assert.equal(invoices.length,1);
 await dialog.getByRole('button',{name:'Done'}).click();await dialog.waitFor({state:'hidden'});
 // A receipt queued by the earlier app must keep its exact recipient and request ID.
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();
 await dialog.getByLabel('Amount paid (NGN)').fill('40.50');await dialog.getByLabel('Customer',{exact:true}).selectOption(id);
 const legacy=await page.evaluate(id=>{
  const prefix='farm:'+id+':'+id, key='farm-credit-draft:'+prefix+':receipt:';
  const draft=JSON.parse(localStorage.getItem(key));draft.receiver='self';localStorage.setItem(key,JSON.stringify(draft));
  return {prefix,draft};
 },id);
 await page.reload();await page.getByRole('button',{name:'Record payment received',exact:true}).click();
 const priorCount=posts.length;await dialog.getByRole('button',{name:'Save entry',exact:true}).click();assert.equal(posts.length,priorCount);
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 const receipt={operation:'receipt',request_id:legacy.draft.request_id,payload:{date:legacy.draft.date,customer_id:id,amount:'40.50',cash_receiver:{type:'self'},notes:''}};
 holdAcknowledgement=true;
 await page.evaluate(({id,prefix,receipt})=>{
  const key='farm_pending_'+prefix+':'+crypto.randomUUID();
  localStorage.setItem(key,JSON.stringify({id:key,identity:{business:'farm',actorId:id,periodId:id},createdAt:new Date().toISOString(),data:receipt,endpoint:'/api/farm/credit',requestId:receipt.request_id}));
 },{id,prefix:legacy.prefix,receipt});
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();
 const retryPayment=dialog.getByRole('button',{name:'Retry saved payment'});await retryPayment.waitFor();
 assert.equal(await dialog.getByLabel('Actual receiver',{exact:true}).count(),0);
 holdAcknowledgement=false;await retryPayment.click();await dialog.getByText('This payment has already been recorded.',{exact:true}).waitFor();
 assert.deepEqual(posts.at(-1),receipt);assert.equal(receipts.length,1);await dialog.getByRole('button',{name:'Done'}).click();
 console.log('PASS interrupted earlier balance and previously queued receipt replay once with their original keys and payloads');
 console.log('PASS earlier debt and collection from both entry points, duplicate reference recovery, original-reference history, scoped new credit sale links and owner reversal');
 console.log('PASS actual customer UI at four widths: centred forms, actual recipient, dated exact receipt and visible saved result');
}finally{await browser.close();await new Promise(r=>server.close(r));}
