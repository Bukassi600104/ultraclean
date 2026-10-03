// Actual React page components with synthetic API responses. No auth/session or
// live Supabase connection: API and database behavior have separate isolated tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const source=`import React from 'react';import {createRoot} from 'react-dom/client';
import Inventory from './app/(manager)/manager/inventory/page';import Stock from './app/(manager)/manager/stock/page';import Mortality from './app/(manager)/manager/mortality/page';import Sale from './app/(manager)/manager/sales/[product]/page';import Supplies from './app/(dashboard)/dashboard/farm/supplies/page';import {FarmActivityPanel} from './components/dashboard/farm/FarmActivityPanel';
const pages={inventory:Inventory,stock:Stock,mortality:Mortality,sale:Sale,supplies:Supplies,activity:FarmActivityPanel};const Page=pages[new URL(location.href).searchParams.get('screen')]||Inventory;createRoot(document.getElementById('root')).render(<Page/>);`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-next-navigation',setup(builder){builder.onResolve({filter:/^next\/(navigation|link)$/},args=>({path:args.path,namespace:'farm-mocks'}));builder.onLoad({filter:/.*/,namespace:'farm-mocks'},args=>({contents:args.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`:`export const useParams=()=>({product:'catfish'});export const useRouter=()=>({push:()=>{},refresh:()=>{}});export const usePathname=()=>'/manager/inventory';`,loader:'js',resolveDir:process.cwd()}));}}]});
const server=http.createServer((req,res)=>{if(req.url.startsWith('/bundle.js')){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else{res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const faults=[];page.on('pageerror',error=>faults.push(error.message));
const id='00000000-0000-4000-8000-000000000001', now='2026-10-03T10:00:00Z';
const item={id,item_name:'Feed bags',category:'feed',unit:'bags',current_quantity:10,restock_threshold:2,notes:null,updated_at:now,revision:0};
const requests=[];let resolved=false;
await page.route('**/api/farm/**',async route=>{const req=route.request(),url=new URL(req.url());const method=req.method();let body={};try{body=req.postDataJSON()??{};}catch{}requests.push({path:url.pathname,method,body});let data;
if(method==='POST'&&url.pathname.endsWith('/sales'))data={data:[{id,total_amount:216000}]};
else if(method==='POST'&&url.pathname.endsWith('/corrections'))data={id};
else if(method==='PUT'&&url.pathname.includes('/corrections/')){resolved=true;data={status:'applied'};}
else if(url.pathname.endsWith('/inventory'))data=[{id,product:'cattle',current_stock:5},{id:'00000000-0000-4000-8000-000000000002',product:'pig',current_stock:7}];
else if(url.pathname.endsWith('/supplies/history'))data={data:[],total:0};
else if(url.pathname.endsWith('/supplies'))data=[item];
else if(url.pathname.endsWith('/inventory/transaction'))data={data:[]};
else if(url.pathname.endsWith('/daily-record'))data={record:{status:'open'}};
else if(url.pathname.endsWith('/corrections'))data={data:[{id,record_type:'sale',record_id:id,status:resolved?'applied':'pending',reason:'Wrong quantity',requested_change:{description:'Correct fish quantity'},requested_at:now,requester_name:'Test Manager',current_record:{id,date:'2026-10-03',product:'catfish',quantity:40,weight_kg:72,unit_price:3000,pricing_basis:'per_kg',payment_method:'cash',revision:0}}],total:1};
else if(url.pathname.endsWith('/activity'))data={data:[],total:0};
else data={};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
let checks=0;
try{
  await page.goto(`http://127.0.0.1:${port}/?screen=inventory`);await page.getByText('Cattle',{exact:true}).waitFor();assert.equal(await page.getByText('Pig',{exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:/Add Stock|Record Mortality/}).count(),0);checks+=3;
  await page.getByRole('button',{name:'Request correction'}).first().click();await page.locator('textarea').nth(0).fill('Count should be six cattle');await page.locator('textarea').nth(1).fill('Physical count verified');await page.getByRole('button',{name:'Send request'}).click();await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));assert.equal(requests.find(r=>r.method==='POST'&&r.path.endsWith('/corrections')).body.record_type,'inventory');checks++;
  for(const screen of ['stock','mortality']){await page.goto(`http://127.0.0.1:${port}/?screen=${screen}`);await page.getByRole('button',{name:'Cattle',exact:true}).waitFor();checks++;}
  await page.goto(`http://127.0.0.1:${port}/?screen=sale`);await page.locator('input[type=date]').waitFor();await page.locator('input[type=number]').nth(0).fill('40');await page.locator('input[type=number]').nth(1).fill('72');await page.locator('input[type=number]').nth(2).fill('3000');await page.getByRole('button',{name:/Save Sale/}).click();await page.getByRole('button',{name:'Edit',exact:true}).waitFor();assert.equal(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/sales')).length,0);await page.getByRole('button',{name:'Confirm Save',exact:true}).click();await page.getByText('1 sale recorded',{exact:true}).waitFor();const sale=requests.find(r=>r.method==='POST'&&r.path.endsWith('/sales')).body[0];assert.equal(sale.quantity,40);assert.equal(sale.weight_kg,72);assert.equal(sale.pricing_basis,'per_kg');assert.ok(sale.request_id);assert.ok((await page.locator('body').innerText()).includes('216,000'));checks+=6;
  await page.goto(`http://127.0.0.1:${port}/?screen=supplies`);await page.getByText('Feed bags',{exact:true}).waitFor();assert.equal(await page.getByText('Transaction History',{exact:true}).count(),0);await page.getByRole('button',{name:'View History',exact:true}).click();await page.getByRole('button',{name:'Hide History',exact:true}).waitFor();await page.getByTitle('Edit supply').click();await page.getByRole('heading',{name:'Edit Supply',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Remove from active supplies'}).count(),1);checks+=3;
  await page.goto(`http://127.0.0.1:${port}/?screen=activity`);await page.getByRole('button',{name:'View Activity'}).click();await page.getByRole('button',{name:'Review and apply'}).click();await page.locator('#correct-quantity').fill('35');await page.locator('textarea').fill('Reviewed against farm record');await page.getByRole('button',{name:'Save correction'}).click();await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));assert.ok(resolved);const correction=requests.find(r=>r.method==='PUT'&&r.path.includes('/corrections/')).body;assert.equal(correction.changes.quantity,35);assert.equal(correction.changes.expected_revision,0);checks+=3;
  assert.deepEqual(faults,[]);checks++;console.log(`PASS: ${checks} mobile browser component checks; inventory, cattle, requests, sale confirmation, saved total, secondary supply history and admin correction.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
