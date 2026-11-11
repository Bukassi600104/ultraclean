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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmControl} from './components/dashboard/farm/FarmControl';import {FarmReportingSettings} from './components/dashboard/farm/FarmReportingSettings';import ManagerHome from './app/(manager)/manager/page';import {ManagerSidebar} from './components/manager/ManagerSidebar';function Supervisor(){const [open,setOpen]=React.useState(false);return <div className="flex min-h-screen bg-[#edf2ea]"><ManagerSidebar isOpen={open} onClose={()=>setOpen(false)}/><div className="min-w-0 flex-1 p-2"><button className="min-h-11 lg:hidden" onClick={()=>setOpen(true)}>Open farm menu</button><ManagerHome/></div></div>}createRoot(document.getElementById('root')).render(location.search.includes('supervisor')?<Supervisor/>:location.search.includes('settings')?<FarmReportingSettings/>:<FarmControl compact={location.search.includes("compact")}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'next-link',setup(b){b.onResolve({filter:/^(next\/(link|navigation)|@\/contexts\/(AuthContext|ManagerPeriodContext))$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='next/navigation'?'export const usePathname=()=>"/";':args.path.includes('ManagerPeriod')?'export const useManagerPeriod=()=>({actorId:"supervisor",periodId:"current"});export const useManagerFetch=()=>window.fetch;':args.path.includes('AuthContext')?'export const useAuth=()=>({profile:{name:"Supervisor"}});':'import React from "react";export default function Link(p){return React.createElement("a",p,p.children)}',loader:'js',resolveDir:process.cwd()}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main id="root" class="p-4" style="height:100vh;overflow-y:auto"></main><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
const source=JSON.parse(readFileSync(path.join(os.tmpdir(),'primefield-control-fixture.json'),'utf8'));
const {typescriptLoader}=await import('../tests/helpers/load-typescript.mjs');
const load=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>({rpc:async()=>({data:source,error:null})})}});
const result=await load('lib/farm-control.ts').getFarmControl(source.report.scope,source.report.from,source.report.to);
await page.route('**/api/**',async route=>{const req=route.request();let body=req.url().includes('/api/farm/overview')?{overview:result.overview,alerts:result.alerts.map(a=>a.title==='Review reported expense'?{...a,title:'Awaiting expense approval'}:a)}:result;if(req.method()==='POST'){posts.push(req.postDataJSON());body={data:req.postDataJSON().payload};}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
try{
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('heading',{name:'Needs your attention'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Report must fit viewport');
  assert.match(await page.locator('body').innerText(),/Produce on hand/);
  assert.equal(await page.getByRole('link',{name:'Download Excel'}).getAttribute('href').then(h=>h.startsWith('/api/farm/control/export?')),true);
  if(width===375){await page.evaluate(()=>{document.querySelector('main').scrollTop=500;document.addEventListener('click',e=>e.preventDefault(),{once:true});document.querySelector('a[href^="/dashboard/farm/batches"]').click();});await page.reload();await page.getByRole('heading',{name:'Needs your attention'}).waitFor();await page.waitForFunction(()=>document.querySelector('main').scrollTop===500);}
  await page.goto('http://127.0.0.1:'+server.address().port+'/?settings=1');
  await page.getByLabel('Your timezone (IANA name)').fill('America/Toronto');
  await page.getByLabel('Reason for this change').fill('Actual owner preferences');
  await page.getByRole('button',{name:'Save preferences'}).click();await page.getByRole('status').filter({hasText:'preferences saved'}).waitFor();
  assert.equal(posts.at(-1).payload.exchange_rate,null,'No demo rate is supplied');
  const box=await page.locator('form').boundingBox();assert.ok(box.width<=672&&Math.abs(box.x+box.width/2-width/2)<3,'Settings stay centred');
 }
 await page.goto('http://127.0.0.1:'+server.address().port+'/?compact=1');await page.getByRole('heading',{name:'Needs attention now'}).waitFor();for(const name of ['Sales after credits','Actual collections','Paid operating expenses','Customer debt','Tracked money held'])assert.equal(await page.getByText(name,{exact:true}).count(),1);for(const name of ['Named batches','Eggs recorded','Mortality recorded','Animals currently recorded',"Today's batch records"])assert.equal(await page.getByText(name,{exact:true}).count(),0);assert.ok(await page.getByRole('heading',{name:'Needs attention now'}).locator('..').locator('li').count()<=3);assert.equal(await page.getByRole('link',{name:'Open farm reports and controls'}).count(),1);
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('heading',{name:'Needs your attention'}).waitFor();await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Permission denied');}}}));await page.getByRole('button',{name:'Copy for WhatsApp'}).click();await page.getByText('Copy unavailable. Open the daily summary and select its text to copy it.').waitFor();assert.equal(await page.getByRole('heading',{name:'Needs your attention'}).count(),1);await page.getByText('Read daily summary',{exact:true}).click();assert.ok(await page.locator('pre').isVisible(),'Copy fallback must leave the summary readable');
 result.alerts=[{id:'pending',title:'Review actual count',detail:'Recorded count',href:'/dashboard/farm/stores',priority:1}];result.overview.logs=[{id:'record',title:'Recorded batch',status:'Logged',path:'today?date='+result.today+'&batch_id=batch&record_id=record'}];
 await page.goto('http://127.0.0.1:'+server.address().port+'/?from=2026-10-02&to=2026-10-22&period_id='+id);await page.getByRole('link',{name:/Review actual count/}).waitFor();
 for(const locator of [page.getByRole('link',{name:/Review actual count/}),page.getByRole('link',{name:/Recorded batch/})]){const q=new URL(await locator.getAttribute('href'),'http://localhost').searchParams;assert.equal(q.get('from'),'2026-10-02');assert.equal(q.get('to'),'2026-10-22');assert.equal(q.get('period_id'),id);}
 result.overview.produce=[{label:'Catfish',amount:1510,unit:'fish'},{label:'Crops',amount:8,unit:'units'}];
 result.overview.feedTypesComplete=true;result.overview.feed=[{label:'fish (local)',amount:5,unit:'bags',usableKg:null},{label:'fish (foreign)',amount:null,unit:'bags',usableKg:null}];
 result.overview.dailyReports=[{id,area:'farm1_pond2',status:'Reviewed'}];result.overview.todayReportsAvailable=true;
 result.alerts=[{id:'emergency',title:'Review reported expense',detail:'Isolated electrician',href:'/dashboard/farm/purchases#expense-emergency',priority:1}];
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const supervisor of [false,true]){
   await page.goto('http://127.0.0.1:'+server.address().port+(supervisor?'/?supervisor=1':'/?period_id='+id));
   await page.getByRole('heading',{name:'Produce on hand'}).waitFor();
   const board=page.getByRole('region',{name:'Farm at a glance'});
   for(const text of ['Catfish','1,510 fish','8 units','5 bags','Count needed','Customer debt','Farm 1 · Pond 2','Offers','Details to follow'])assert.ok((await board.innerText()).toLowerCase().includes(text.toLowerCase()),text);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const expense=await board.getByRole('link',{name:supervisor?/Awaiting expense approval/:/Review reported expense/}).getAttribute('href');
   assert.ok(expense.endsWith('#expense-emergency'));assert.ok(supervisor?expense.startsWith('/purchases#'):expense.includes('period_id='+id));
   const daily=await board.getByRole('link',{name:/Farm 1 · Pond 2/}).getAttribute('href');
   assert.ok(daily.startsWith(supervisor?'/daily-report/history?report_id=':'/dashboard/farm/daily-reports?report_id='));
   if(supervisor){assert.equal(await page.getByRole('link',{name:'Record Today’s Expenses'}).getAttribute('href'),'/expenses');await page.getByRole('button',{name:'Hide balance'}).click();assert.ok(await page.getByText('••••••',{exact:true}).isVisible());}
   if(supervisor&&width===375){const opener=page.getByRole('button',{name:'Open farm menu'});await opener.click();const menu=page.getByRole('dialog',{name:'Farm navigation'});await menu.waitFor();assert.equal(await menu.getByRole('link',{name:'Health tasks'}).getAttribute('href'),'/health');assert.equal(await menu.locator('[aria-current=page]').innerText(),'Overview');await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.equal(await opener.evaluate(el=>el===document.activeElement),true);}await page.evaluate(()=>{document.querySelector('main').scrollTop=0;window.scrollTo(0,0);});await page.screenshot({path:path.join(folder,(supervisor?'supervisor':'ceo')+'-'+width+'.png')});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS CEO and supervisor overview, scoped links, quantities, unknown counts, emergency follow-up, report areas and configuration at four widths. Screenshots: '+folder);
}finally{await browser.close();await new Promise(r=>server.close(r));}
