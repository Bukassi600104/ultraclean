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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmHealth} from './components/manager/FarmHealth';import {FarmPerformance} from './components/manager/FarmPerformance';createRoot(document.getElementById('root')).render(location.search.includes('performance')?<FarmPerformance/>:<FarmHealth admin={location.search.includes('admin')}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:'export const CashPayerSelect=()=>null;',loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
let tasks=[];
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let body={data:[]};
 if(url.pathname==='/api/farm/health'){
 if(req.method()==='POST'){const p=req.postDataJSON();posts.push(p);tasks=[{id,...p.payload,batch_name:'Actual flock',manager_name:'Assigned manager',status:'scheduled',revision:0}];body={data:{id}};}
 else body={tasks,completions:[],batches:[{id,name:'Actual flock'}],managers:[{id,name:'Assigned manager',batch_ids:[id]}]};
 }else if(url.pathname==='/api/farm/performance')body={from:'2026-10-01',to:'2026-10-30',batches:[],pool:{revenue:'0',expenses:'0',allocated_revenue:'0',allocated_expenses:'0',unallocated_revenue:'0',unallocated_expenses:'0'},cost_basis:'No recorded costs'};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');
 await page.getByRole('button',{name:'Schedule health task',exact:true}).click();await page.getByRole('dialog').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
 assert.equal(await page.getByLabel('Task title',{exact:true}).inputValue(),'');await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Schedule health task',exact:true}).click();await page.getByLabel('Named batch',{exact:true}).selectOption(id);await page.getByLabel('Responsible manager',{exact:true}).selectOption(id);await page.getByLabel('Task title',{exact:true}).fill('Actual vet schedule');await page.getByLabel('Approved instructions',{exact:true}).fill('Use the actual veterinary instruction');await page.getByLabel('Due date',{exact:true}).fill('2026-11-02');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('heading',{name:'Actual vet schedule'}).waitFor();assert.equal(posts[0].payload.period_id,id);assert.deepEqual(errors,[]);
 for(const width of [375,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?performance=1');await page.getByText('Complete reporting-period totals').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 console.log('PASS health UI at four widths: centred schedule, real instructions, assigned manager and saved task');
}finally{await browser.close();await new Promise(r=>server.close(r));}
