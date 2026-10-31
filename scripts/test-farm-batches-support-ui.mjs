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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmPhotoPicker} from './components/manager/FarmPhotoPicker';function PhotoDraft(){const [date,setDate]=React.useState('2026-10-30'),[ids,setIds]=React.useState(['saved-photo']);return <><button onClick={()=>setDate('2026-10-29')}>Change actual date</button><output aria-label='Selected photos'>{ids.length}</output><FarmPhotoPicker date={date} resource='farm_customer_receipts' value={ids} onChange={setIds}/></>;}import {FarmBatches} from './components/dashboard/farm/FarmBatches';import {FarmSupportAccess} from './components/dashboard/farm/FarmSupportAccess';createRoot(document.getElementById('root')).render(location.search.includes('photo')?<PhotoDraft/>:location.search.includes('support')?<FarmSupportAccess/>:<FarmBatches/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:'export const CashPayerSelect=()=>null;',loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let body={data:[],has_more:false};
 if(req.method()==='POST'){posts.push(req.postDataJSON());body={data:{id}};}
 else if(url.pathname==='/api/farm/batches')body={data:url.searchParams.get('resource')==='farm_sites'?[{id,name:'Actual site'}]:[{id,name:'Actual flock',site_id:id,product:'chicken',kind:'flock',stock_group_id:null,archived_at:null}],has_more:false};
 else if(url.pathname==='/api/farm/batch-records')body={batches:[{id,quantity_exact:'20'}]};
 else if(url.pathname==='/api/farm/support-access')body={accounts:[{id,name:'Assigned accountant',role:'farm_accountant',suspended:false}],grants:[],batches:[],periods:[{id,name:'Actual manager',starts_on:'2026-10-30'}],recommendations:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('heading',{name:'Actual flock'}).waitFor();
 await page.getByRole('button',{name:'Allocate existing stock',exact:true}).click();await page.getByRole('dialog').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
 await page.getByLabel('Number of animals').fill('5');await page.getByLabel('Reason',{exact:true}).fill('Assign existing actual stock');await page.getByRole('button',{name:'Save change',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(posts.at(-1).operation,'allocate');assert.equal(posts.at(-1).payload.quantity,5);
 await page.goto('http://127.0.0.1:'+server.address().port+'/?support=1');await page.getByText('No support access assigned.').waitFor();
 await page.getByRole('button',{name:'Assign limited access',exact:true}).click();await page.getByLabel('Support account').selectOption(id);assert.equal(await page.getByLabel('Allowed scope').inputValue(),'');
 await page.getByLabel('Allowed scope').selectOption(id);await page.getByLabel('Reason',{exact:true}).fill('Review only assigned manager');await page.getByRole('button',{name:'Confirm access decision'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(posts.at(-1).payload.period_id,id);
 }
 await page.goto('http://127.0.0.1:'+server.address().port+'/?photo=1');assert.equal(await page.getByLabel('Selected photos').textContent(),'1');await page.getByRole('button',{name:'Change actual date'}).click();await page.getByText('The record date or batch changed.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Selected photos').textContent(),'0');
 assert.deepEqual(errors,[]);console.log('PASS batch allocation and explicit support scope dialogs at four widths, no stock recreation or default whole-farm access');
}finally{await browser.close();await new Promise(r=>server.close(r));}
