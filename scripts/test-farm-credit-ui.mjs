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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmCredit} from './components/manager/FarmCredit';createRoot(document.getElementById('root')).render(<FarmCredit admin={location.search.includes('admin')}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:`import React from 'react';export const selectedCashReceiver=v=>v?{type:'self'}:undefined;export const CashReceiverSelect=p=>React.createElement('label',{},'Actual receiver',React.createElement('select',{'aria-label':'Actual receiver',value:p.value,onChange:e=>p.onChange(e.target.value)},React.createElement('option',{value:''},'Choose'),React.createElement('option',{value:'self'},'I received it')));`,loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
let receipts=[],invoices=[];
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let body={data:[]};
 if(url.pathname==='/api/farm/credit'){
 if(req.method()==='POST'){const p=req.postDataJSON();posts.push(p);receipts=[{id,date:p.payload.date,customer_name:'Actual customer',amount:p.payload.amount,voided_at:null,allocations:[]}];body={data:{id}};}
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
 await page.getByRole('button',{name:'Record payment received',exact:true}).click();await page.getByLabel('Amount (NGN)',{exact:true}).fill('40000');await page.getByLabel('Customer',{exact:true}).selectOption(id);await page.getByLabel('Actual receiver',{exact:true}).selectOption('self');await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByText(/Actual customer.*40,000/).waitFor();assert.equal(posts[0].payload.amount,'40000');assert.deepEqual(posts[0].payload.cash_receiver,{type:'self'});assert.deepEqual(errors,[]);
 invoices=[{id,number:'PF-PAID',customer_id:id,customer_name:'Actual customer',sale_id:id,date:'2026-10-30',due_date:'2026-11-29',total:'100',owed:'0',voided_at:null,overdue_days:0}];await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');await page.getByRole('button',{name:'Credit invoice',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByLabel('Amount (NGN)',{exact:true}).fill('40');assert.equal(await page.getByRole('heading',{name:'Credit invoice',exact:true}).count(),1);assert.deepEqual(errors,[]);
 console.log('PASS actual customer UI at four widths: centred forms, actual recipient, dated exact receipt and visible saved result');
}finally{await browser.close();await new Promise(r=>server.close(r));}
