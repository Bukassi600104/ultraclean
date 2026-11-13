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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmHealth} from './components/manager/FarmHealth';import {FarmPerformance} from './components/manager/FarmPerformance';import {farmPerformanceBackLink} from './lib/dashboard-navigation';import {useOfflineSync} from './hooks/useOfflineSync';function ManagerShellSync(){useOfflineSync();return null;}const back=farmPerformanceBackLink(location.pathname,location.search);createRoot(document.getElementById('root')).render(<><ManagerShellSync/>{location.pathname.endsWith('/today')?<a href={back?.href}>{back?.label}</a>:location.pathname.endsWith('/performance')||new URLSearchParams(location.search).has('performance')?<FarmPerformance/>:<FarmHealth admin={location.search.includes('admin')}/>}</>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/CashPartySelect$/},a=>({path:a.path,namespace:'cash-mock'}));b.onLoad({filter:/.*/,namespace:'cash-mock'},()=>({contents:'export const CashPayerSelect=()=>null;',loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const identity={actorId:'${id}',business:'farm',periodId:'${id}'};export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({status:'active'});export const useOperationsFeature=()=>({enabled:false});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(30000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',route=>route.abort());
await page.route('https://fonts.gstatic.com/**',route=>route.abort());
let tasks=[],healthNotes=[],completions=[],performanceBatches=[],photoUploads=0;const evidenceId='00000000-0000-4000-8000-000000000002';
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let body={data:[]};
 if(url.pathname==='/api/farm/health'){
 if(req.method()==='POST'){const p=req.postDataJSON();posts.push(p);if(p.operation==='complete'){assert.equal(photoUploads,1);assert.deepEqual(p.payload.evidence_ids,[evidenceId]);const completion={id:'00000000-0000-4000-8000-000000000003',task_id:p.id,batch_id:id,date:p.payload.date,notes:p.payload.notes,actor_name:'Supervisor',state:'completed',created_at:new Date().toISOString(),supersedes_id:null};
 completions.push(completion);tasks=tasks.map(task=>task.id===p.id?{...task,status:'completed',completion_id:completion.id}:task);}else if(p.operation==='note'){healthNotes.push({id,...p.payload,actor_name:'Supervisor',manager_name:'Supervisor'});}else tasks=[{id,...p.payload,batch_name:'Actual flock',manager_name:'Assigned manager',status:'scheduled',revision:0}];body={data:{id}};}
 else body={tasks,notes:healthNotes,completions,recommendations:[{id:evidenceId,task_id:id,body:'Review the recorded observation.',actor_name:'Assigned vet',created_at:'2026-11-01T09:00:00Z'}],batches:[{id,name:'Actual flock'}],managers:[{id,name:'Assigned manager',batch_ids:[id]}]};
 }else if(url.pathname==='/api/farm/evidence'&&req.method()==='POST'){photoUploads++;body={data:{id:evidenceId,status:'uploaded'}};}
 else if(url.pathname==='/api/farm/performance')body={from:'2026-10-01',to:'2026-10-30',batches:performanceBatches,pool:{revenue:'0',expenses:'0',allocated_revenue:'0',allocated_expenses:'0',unallocated_revenue:'0',unallocated_expenses:'0'},cost_basis:'No recorded costs'};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 for(const width of [375,390,768,1440]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');
 assert.equal(await page.getByRole('link',{name:'Batch performance',exact:true}).count(),0);await page.getByRole('button',{name:'Add to schedule',exact:true}).click();await page.getByRole('dialog').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
 assert.equal(await page.getByLabel('Task title',{exact:true}).inputValue(),'');await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Add to schedule',exact:true}).click();await page.getByLabel('Named batch',{exact:true}).selectOption(id);await page.getByLabel('Responsible manager',{exact:true}).selectOption(id);await page.getByLabel('Task title',{exact:true}).fill('Actual vet schedule');await page.getByLabel('Approved instructions',{exact:true}).fill('Use the actual veterinary instruction');await page.getByLabel('Due date',{exact:true}).fill('2026-11-02');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('heading',{name:'Actual vet schedule'}).waitFor();assert.equal(posts[0].payload.period_id,id);assert.deepEqual(errors,[]);
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');
  const schedule=page.getByRole('table',{name:'Farm health schedule'});
  await schedule.getByText('Actual vet schedule',{exact:true}).waitFor();
  assert.equal(await schedule.getByRole('columnheader',{name:'Due',exact:true}).count(),1,'The schedule must have visible column headings at '+width+'px');
  assert.equal(await schedule.locator('tbody tr').first().evaluate(el=>getComputedStyle(el).display),'table-row');
  assert.equal(await schedule.getByRole('button',{name:'Mark done',exact:true}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(folder,'health-'+width+'.png'),fullPage:true});
  await schedule.getByText('Task details',{exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByText('Use the actual veterinary instruction').waitFor();
  await dialog.getByText(/Vet recommendation .* Review the recorded observation/).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Correct schedule',exact:true}).isVisible(),true);
  await dialog.getByRole('button',{name:'Questions & replies',exact:true}).click();
  await dialog.getByRole('heading',{name:'Questions and replies',exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.goto('http://127.0.0.1:'+server.address().port+'/?manager=1');await page.getByRole('button',{name:'Mark done',exact:true}).filter({visible:true}).click();await page.getByRole('button',{name:'Confirm done',exact:true}).click();await page.getByRole('alert').filter({hasText:'Add a photo to confirm this task'}).waitFor();assert.equal(posts.length,1,'No completion without a photo reaches the API');await page.getByRole('button',{name:'Close',exact:true}).click();
 // Select a real file through the picker, retain its scoped local ID offline, then upload and complete.
 await page.getByRole('button',{name:'Mark done',exact:true}).filter({visible:true}).click();
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;const context=canvas.getContext('2d');context.fillStyle='#166534';context.fillRect(0,0,8,8);return canvas.toDataURL('image/png').split(',')[1];});
 await page.getByLabel('Add a photo',{exact:true}).setInputFiles({name:'completion-proof.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByRole('img',{name:'Supporting photo 1',exact:true}).waitFor();
 await page.getByText('Photo 1 · Saved on phone',{exact:true}).waitFor();
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});
 await page.getByRole('button',{name:'Confirm done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const queued=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('farm_pending_')).map(key=>JSON.parse(localStorage.getItem(key))).find(row=>row.endpoint==='/api/farm/health'&&row.data.operation==='complete'));
 assert.ok(queued,'Completion with a real local photo must enter the offline queue');
 assert.equal(queued.mediaIds.length,1);assert.ok(queued.mediaIds[0].startsWith(`farm:${id}:${id}:`));assert.deepEqual(queued.data.payload.evidence_ids,queued.mediaIds);assert.equal(photoUploads,0);assert.equal(posts.length,1);
 await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});window.dispatchEvent(new Event('online'));});
 await page.waitForFunction(()=>!Object.keys(localStorage).some(key=>key.startsWith('farm_pending_')));
 assert.equal(posts.length,2);assert.equal(posts[1].request_id,queued.requestId);assert.equal(posts[1].operation,'complete');assert.deepEqual(posts[1].payload.evidence_ids,[evidenceId]);assert.equal(photoUploads,1);assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Record health details',exact:true}).click();
 await page.getByLabel('Task name',{exact:true}).fill('Pen inspection');
 await page.getByLabel('Animal or area (optional)',{exact:true}).fill('Pen A');
 await page.getByLabel('What was observed or done?',{exact:true}).fill('Pen checked by supervisor');
 await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByText('Pen checked by supervisor',{exact:true}).waitFor();assert.equal(posts.at(-1).operation,'note');
 await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');
 await page.getByText('Pen checked by supervisor',{exact:true}).waitFor();
 assert.equal(healthNotes.length,1);
 for(const role of ['manager','admin'])for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?'+role+'=1');
  const details=page.getByRole('table',{name:'Recorded health details',exact:true});
  const history=page.getByRole('table',{name:'Completion history',exact:true});
  await details.getByText('Pen checked by supervisor',{exact:true}).waitFor();
  assert.equal(await details.getByRole('columnheader',{name:'Observation',exact:true}).isVisible(),true);
  assert.equal(await details.getByRole('rowheader').count(),1);
  await page.locator('summary',{hasText:'Completion history'}).click();
  await history.getByRole('rowheader',{name:/Actual vet schedule/}).waitFor();
  assert.equal(await history.getByRole('columnheader',{name:'Status',exact:true}).isVisible(),true);
  assert.equal(await history.getByText('Completed',{exact:true}).isVisible(),true);
  await history.getByText('Entry details',{exact:true}).click();
  assert.equal(await history.getByRole('button',{name:'Retract incorrect completion'}).count(),role==='admin'?1:0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const proof=history.getByRole('button',{name:'View proof',exact:true});
  await proof.click();await page.getByRole('dialog').getByRole('heading',{name:'Questions and replies',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 // A correction keeps both history entries readable and the original evidence accessible.
 const prior=completions[0],withdrawn={...prior,id:'00000000-0000-4000-8000-000000000004',state:'retracted',supersedes_id:prior.id,notes:null,reason:'The original completion was entered for the wrong batch.'};
 completions=[withdrawn,prior];tasks=[{...tasks[0],status:'overdue',completion_id:withdrawn.id}];
 await page.goto('http://127.0.0.1:'+server.address().port+'/?manager=1');
 const schedule=page.getByRole('table',{name:'Farm health schedule'});
 await schedule.getByRole('button',{name:'Mark done',exact:true}).waitFor();
 await schedule.getByRole('button',{name:'View entry',exact:true}).click();
 await page.getByRole('dialog',{name:'Completion entry'}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('summary',{hasText:'Completion history'}).click();
 const changedHistory=page.getByRole('table',{name:'Completion history',exact:true});
 assert.equal(await changedHistory.getByRole('rowheader').count(),2);
 await changedHistory.getByRole('row').filter({hasText:'Retracted'}).getByText('Entry details',{exact:true}).click();
 await changedHistory.getByText(withdrawn.reason,{exact:true}).waitFor();
 assert.equal(await changedHistory.getByRole('button',{name:'View proof',exact:true}).count(),1);
 // Farms with only free-form health observations must still see a populated table.
 tasks=[];completions=[];
 await page.setViewportSize({width:375,height:700});await page.goto('http://127.0.0.1:'+server.address().port+'/?admin=1');
 await page.getByRole('table',{name:'Recorded health details'}).getByText('Pen checked by supervisor').waitFor();
 assert.equal(await page.getByRole('table',{name:'Farm health schedule'}).count(),0);
 await page.getByText('No health tasks scheduled yet.').waitFor();
 console.log('Health screenshot artifacts: '+folder);
 for(const width of [375,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?performance=1');await page.getByText('All groups: recorded money').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 performanceBatches=['11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002'].map((site_id,i)=>({id:site_id,site_id,site_name:'Same site name',name:'Flock '+i,product:'chicken',head_count:'0',recorded_days:0,expected_days:30,egg_days:0,deaths:'0',eggs:'0',feed_kg:null,sample_average_kg:null,feed_conversion_estimate:null,feed_cost_estimate:null,revenue:i?'200':'100',paid_expenses:i?'20':'10',recorded_result:i?'180':'90',trend:[],completeness:'Measurements unavailable'}));await page.goto('http://127.0.0.1:'+server.address().port+'/?performance=1');await page.getByRole('button',{name:'View Flock 1',exact:true}).filter({visible:true}).waitFor();await page.getByLabel('Site',{exact:true}).selectOption(performanceBatches[0].site_id);assert.equal(await page.getByRole('button',{name:'View Flock 0',exact:true}).filter({visible:true}).count(),1);assert.equal(await page.getByRole('button',{name:'View Flock 1',exact:true}).count(),0);assert.equal(await page.getByLabel('Site',{exact:true}).locator('option').count(),3);await page.getByRole('heading',{name:'Selected groups: recorded money'}).waitFor();assert.equal(await page.getByLabel('Batch',{exact:true}).locator('option').count(),2);assert.match(await page.locator('section').filter({has:page.getByRole('heading',{name:'Selected groups: recorded money'})}).innerText(),/100.00/);assert.deepEqual(errors,[]);
 performanceBatches[0]={...performanceBatches[0],recorded_days:1,expected_days:1,head_count:'10',trend:[{date:'2026-10-29',eggs:null,deaths:0,feed_kg:5,lay_rate:null,sample_average_kg:2}]};
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?performance=1&period_id='+id+'&from=2026-10-01&to=2026-10-30');
  await page.getByRole('button',{name:'View Flock 0',exact:true}).filter({visible:true}).click();await page.getByRole('heading',{name:'Flock 0',exact:true}).waitFor();
  await page.getByLabel('From',{exact:true}).fill('2026-10-20');await page.getByText('Daily measurements and source records',{exact:true}).click();
  const href=await page.getByRole('link',{name:'View records',exact:true}).getAttribute('href'),q=new URL(href,'http://localhost').searchParams;
  assert.equal(q.get('return_to'),'/manager/performance');  assert.equal(q.get('period_id'),id);assert.equal(q.get('from'),'2026-10-20');assert.equal(q.get('to'),'2026-10-30');assert.equal(q.get('batch_id'),performanceBatches[0].id);
  assert.equal(await page.getByRole('img',{name:/Sampled weight/}).count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.reload();await page.getByRole('heading',{name:'Flock 0',exact:true}).waitFor();assert.equal(await page.getByLabel('From',{exact:true}).inputValue(),'2026-10-20');assert.equal(await page.getByLabel('Batch',{exact:true}).inputValue(),performanceBatches[0].id);
  await page.screenshot({path:path.join(folder,`performance-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:390,height:600});await page.goto('http://127.0.0.1:'+server.address().port+'/manager/performance?'+new URLSearchParams({period_id:id,from:'2026-10-20',to:'2026-10-30',site_id:performanceBatches[0].site_id,batch_id:performanceBatches[0].id}));await page.getByRole('heading',{name:'Flock 0',exact:true}).waitFor();await page.getByText('Daily measurements and source records',{exact:true}).click();await page.getByRole('link',{name:'View records',exact:true}).scrollIntoViewIfNeeded();
 await page.getByRole('link',{name:'View records',exact:true}).click();await page.getByRole('link',{name:'Back to Batch Performance',exact:true}).waitFor();const snapshot=await page.evaluate(()=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(key=>key.startsWith('farm-performance-scroll:')))));assert.equal(snapshot.measurementsOpen,true);assert.ok(snapshot.window>0);
 await page.getByRole('link',{name:'Back to Batch Performance',exact:true}).click();await page.getByRole('heading',{name:'Flock 0',exact:true}).waitFor();await page.waitForFunction(expected=>Math.abs(window.scrollY-expected)<5,snapshot.window);assert.equal(await page.getByRole('link',{name:'View records',exact:true}).isVisible(),true);assert.equal(await page.getByLabel('Site',{exact:true}).inputValue(),performanceBatches[0].site_id);assert.equal(await page.getByLabel('From',{exact:true}).inputValue(),'2026-10-20');assert.deepEqual(errors,[]);
 assert.match(await page.getByLabel('Site',{exact:true}).innerText(),/Same site name.*Flock 0/);assert.doesNotMatch(await page.getByLabel('Site',{exact:true}).innerText(),/11111111|22222222/);
 console.log('PASS health UI at four widths: centred schedule, real instructions, assigned manager and saved task');
}finally{await browser.close();await new Promise(r=>server.close(r));}
