import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {readFileSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium,expect}=require('@playwright/test');
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

const careTitle = 'Animal Health and Farm Care Record';
const careInstructions = 'Use one row per animal or batch and activity. Copy a row when you need to record the same activity again.';
const reviewLabel = 'General Review and Suggestions';
const careFields = [
  ['animal_group', 'Animal group', 'Fixture layer flock'],
  ['location', 'Location', 'Fixture Pen A'],
  ['animal_tag', 'Animal ID / tag code', 'QA-FLOCK-01'],
  ['record_date', 'Record date', '2026-11-20'],
  ['age', 'Age', '12 weeks'],
  ['breed', 'Breed', 'Fixture breed'],
  ['markings', 'Colour / special markings', 'Brown leg band'],
  ['diagnosis', 'Issue / diagnosis', 'Routine fixture entry'],
  ['treatment', 'Treatment / medication given', 'Fixture care recorded'],
  ['date_received', 'Date received', '2026-11-19'],
  ['duration', 'Treatment duration', 'One day'],
  ['withdrawal', 'Withdrawal period', 'Reviewed with supervisor'],
  ['next_due', 'Next due date', '2026-11-23'],
  ['animal_status', 'Animal status (dead, alive or sold)', 'alive'],
  ['notes', 'Notes / observations', 'First fixture observation'],
];
const careActivityLabel = 'Scheduled treatment or activity';
const careHeadings = ['No.', careActivityLabel, ...careFields.map(([, label]) => label)];
const careActivities = [
  'Fowl pox booster',
  'Salt bath and partial water change',
  'Newcastle disease (LaSota) booster',
  'Deworming (ivermectin injection)',
  'Deworming (piperazine in drinking water)',
  'Hoof trimming',
  'Gumboro (IBD) vaccination, second dose',
  'Iron dextran and vitamin check',
  'PPR vaccination',
  'FMD vaccination',
  'Debeaking (beak trimming)',
  'Tick bath',
  'Dehorning',
  'Crossing (mating)',
  'Sorting and grading',
  'Layer-house fumigation',
  'Marek’s disease vaccination',
  'Ranikhet disease (Newcastle disease)',
  'Infectious bronchitis vaccination',
  'Fowl pox vaccination',
  'Infectious coryza',
  'Fowl cholera',
];
const careRegister = {id:'00000000-0000-4000-8000-000000000005', manager_name:'Assigned manager', starts_on:'2026-11-01', ends_on:null};
const carePages = [{rows:[], review:null}];
const carePosts = [];
const careReceipts = new Map();
let loseCareConfirmation = false;

await page.route('**/api/farm/health/record*', async route => {
  const request = route.request();
  const requestUrl = new URL(request.url());
  assert.equal(requestUrl.hostname, '127.0.0.1', 'The worksheet fixture may only receive loopback requests');
  const canWrite = new URL(page.url()).searchParams.has('manager');
  const respond = (status, json) => route.fulfill({status, json});
  if (request.method() === 'GET') {
    const requestedPage = Number(requestUrl.searchParams.get('page') || 1);
    const fixturePage = carePages[requestedPage - 1];
    if (!fixturePage) return respond(404, {error:'The requested page does not exist.'});
    const register = canWrite ? careRegister : {...careRegister, ends_on:'2026-11-21'};
    return respond(200, {
      register_id:careRegister.id,
      can_write:canWrite,
      page:requestedPage,
      page_count:carePages.length,
      registers:[register],
      rows:fixturePage.rows,
      review:fixturePage.review,
    });
  }

  assert.equal(request.method(), 'POST');
  assert.ok(canWrite, 'The historical-register viewer must not write');
  const post = request.postDataJSON();
  const {operation, register_id, request_id, payload} = post;
  assert.equal(register_id, careRegister.id);
  assert.match(request_id, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);
  carePosts.push(post);
  const prior = careReceipts.get(request_id);
  if (prior) {
    assert.deepEqual(post, prior.post, 'A retry must reuse the original payload with the request ID');
    return respond(201, prior.receipt);
  }
  const confirm = data => {
    const receipt = {data};
    careReceipts.set(request_id, {post, receipt});
    if (loseCareConfirmation) {
      loseCareConfirmation = false;
      return respond(503, {error:'Unable to confirm the save. Please retry.'});
    }
    return respond(201, receipt);
  };

  if (operation === 'add_page') {
    assert.deepEqual(payload, {});
    carePages.push({rows:[], review:null});
    return confirm({page:carePages.length});
  }

  const fixturePage = carePages[payload.page - 1];
  assert.ok(fixturePage, 'Rows and reviews must target an existing page');
  if (operation === 'save_review') {
    const revision = fixturePage.review?.revision ?? 0;
    assert.equal(payload.expected_revision, revision);
    fixturePage.review = {text:payload.text, revision:revision + 1};
    return confirm({page:payload.page, revision:revision + 1});
  }

  assert.equal(operation, 'save_row');
  const lastNumber = Math.max(0, ...fixturePage.rows.map(row => row.row_number));
  const rowNumber = payload.row_number ?? lastNumber + 1;
  const rowIndex = fixturePage.rows.findIndex(row => row.row_number === rowNumber);
  const revision = fixturePage.rows[rowIndex]?.revision ?? 0;
  if (payload.expected_revision !== revision) return respond(409, {error:'This row has changed. Load the saved row before editing again.'});
  const row = {row_number:rowNumber, activity:payload.activity, values:payload.values, revision:revision + 1};
  if (rowIndex === -1) fixturePage.rows.push(row);
  else fixturePage.rows[rowIndex] = row;
  return confirm({page:payload.page, row_number:rowNumber, revision:row.revision});
});

try{

 const managerHealthUrl = 'http://127.0.0.1:' + server.address().port + '/manager/health?manager=1';
 const ownerHealthUrl = 'http://127.0.0.1:' + server.address().port + '/dashboard/farm/health?admin=1';
 const record = page.getByRole('table', {name:careTitle, exact:true});
 const edit = page.getByRole('dialog');
 const activityButton = activity => record.getByRole('button', {name:activity, exact:true});
 const action = name => page.getByRole('button', {name, exact:true});
 const rowField = (key, label) => {
   if (['record_date', 'date_received', 'next_due'].includes(key)) return edit.getByLabel(label, {exact:true});
   return edit.getByRole(key === 'animal_status' ? 'combobox' : 'textbox', {name:label, exact:true});
 };
 const fillRow = async (overrides = {}) => {
   for (const [key, label, example] of careFields) {
     const field = rowField(key, label);
     const value = overrides[key] ?? example;
     if (key === 'animal_status') await field.selectOption(value);
     else await field.fill(value);
   }
 };
 const saveRow = async () => {
   await edit.getByRole('button', {name:'Save row', exact:true}).click();
   await edit.waitFor({state:'hidden'});
 };

 for (const [url, width] of [[managerHealthUrl, 375], [ownerHealthUrl, 390], [managerHealthUrl, 768], [ownerHealthUrl, 1440]]) {
   await page.setViewportSize({width, height:900});
   await page.goto(url);
   await record.waitFor({timeout:12000});
   await page.getByRole('heading', {name:careTitle, exact:true}).waitFor();
   await page.getByText('Primefield Agri-Business Limited', {exact:true}).waitFor();
   await page.getByText(careInstructions, {exact:true}).waitFor();
   await page.getByRole('textbox', {name:reviewLabel, exact:true}).waitFor();
   assert.deepEqual(await record.getByRole('columnheader').allTextContents(), careHeadings);
   assert.deepEqual(await record.locator('tbody tr').evaluateAll(rows => rows.map(row => Array.from(row.cells).slice(0, 2).map(cell => cell.textContent.trim()))), careActivities.map((activity, index) => [String(index + 1), activity]));
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The 17-column table stays inside the page at ' + width + 'px');
 }
 assert.equal(carePosts.length, 0, 'Opening the template must not save any of its starter rows');

 await page.setViewportSize({width:375, height:850});
 await page.goto(managerHealthUrl);
 await activityButton(careActivities[0]).click();
 await edit.waitFor();
 const dialogBounds = await edit.boundingBox();
 assert.ok(dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= 376, 'A phone can open all fillable fields without horizontal page overflow');
 await fillRow();
 await saveRow();
 const firstSaved = carePosts.at(-1);
 assert.equal(firstSaved.operation, 'save_row');
 assert.equal(firstSaved.payload.page, 1);
 assert.equal(firstSaved.payload.row_number, 1);
 assert.equal(firstSaved.payload.activity, careActivities[0]);
 assert.deepEqual(firstSaved.payload.values, Object.fromEntries(careFields.map(([key, , value]) => [key, value])));

 const review = page.getByRole('textbox', {name:reviewLabel, exact:true});
 const reviewText = 'Review the farm log on Monday.\nDiscuss the fixture follow-up with the supervisor.';
 await review.fill(reviewText);
 const reviewSaved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/farm/health/record' && response.request().method() === 'POST');
 await action('Save review').click();
 assert.ok((await reviewSaved).ok());
 assert.equal(carePosts.at(-1).operation, 'save_review');
 assert.equal(carePosts.at(-1).payload.page, 1);
 assert.equal(carePages[0].review.text, reviewText);
 await page.reload();
 await record.getByRole('cell', {name:'Fixture Pen A', exact:true}).waitFor();
 assert.equal(await review.inputValue(), reviewText, 'Saved review returns after reloading the register');

 await activityButton(careActivities[0]).click();
 for (const [key, label, value] of careFields) await expect(rowField(key, label), label + ' persists on the saved row').toHaveValue(value);

 const notes = rowField('notes', 'Notes / observations');
 const staleDraft = 'Fixture changes entered before another device saved.';
 const savedNotes = 'Fixture observation saved on another device.';
 await notes.fill(staleDraft);
 const storedRow = carePages[0].rows[0];
 storedRow.revision += 1;
 storedRow.values.notes = savedNotes;
 await edit.getByRole('button', {name:'Save row', exact:true}).click();
 await action('Load saved row').waitFor();
 await expect(notes).toHaveValue(staleDraft);
 assert.equal(storedRow.values.notes, savedNotes, 'A conflict does not overwrite the saved row');
 await action('Load saved row').click();
 await expect(notes).toHaveValue(savedNotes);

 await notes.fill('Fixture notes saved once across a lost confirmation.');
 loseCareConfirmation = true;
 await edit.getByRole('button', {name:'Save row', exact:true}).click();
 await action('Retry save').waitFor();
 const unconfirmedSave = carePosts.at(-1);
 const savedRevision = carePages[0].rows[0].revision;
 await page.reload();
 await action('Retry save').click();
 await page.getByText('Row saved.', {exact:true}).waitFor();
 assert.deepEqual(carePosts.at(-1), unconfirmedSave, 'Retrying after reload resends the same request ID and payload');
 assert.equal(carePages[0].rows[0].revision, savedRevision, 'Retry confirms the original save without creating another revision');
 await activityButton(careActivities[0]).click();
 await expect(notes).toHaveValue('Fixture notes saved once across a lost confirmation.');

 const worksheetWritesBeforeCopy = carePosts.filter(post => post.operation === 'save_row').length;
 await edit.getByRole('button', {name:'Copy row', exact:true}).click();
 assert.equal(await edit.getByLabel(careActivityLabel, {exact:true}).inputValue(), careActivities[0]);
 for (const [key, label] of careFields) await expect(rowField(key, label), label + ' starts blank on a copied row').toHaveValue('');
 assert.equal(carePosts.filter(post => post.operation === 'save_row').length, worksheetWritesBeforeCopy, 'Opening a copy does not save a second record');
 await fillRow({animal_group:'Fixture second flock', location:'Fixture Pen B', animal_tag:'QA-FLOCK-02'});
 await saveRow();
 assert.equal(carePosts.at(-1).operation, 'save_row');
 assert.equal(carePosts.at(-1).payload.page, 2, 'Copied rows continue onto another page when the starter page is full');
 assert.equal(carePages[0].rows[0].values.animal_tag, 'QA-FLOCK-01', 'Copying a row leaves the existing entry intact');
 assert.equal(carePages[1].rows[0].values.animal_tag, 'QA-FLOCK-02');

 await action('Add page').click();
 await record.getByRole('cell', {name:'Fixture Pen B', exact:true}).waitFor({state:'hidden'});
 await action('Add row').click();
 await edit.getByLabel(careActivityLabel, {exact:true}).fill('Fixture supplementary activity');
 await fillRow({animal_group:'Fixture third flock', location:'Fixture Pen C', animal_tag:'QA-FLOCK-03'});
 await saveRow();
 assert.equal(carePosts.at(-1).payload.page, 3);
 await record.getByRole('cell', {name:'Fixture Pen C', exact:true}).waitFor();
 await action('Previous page').click();
 await record.getByRole('cell', {name:'Fixture Pen B', exact:true}).waitFor();
 await action('Previous page').click();
 await record.getByRole('cell', {name:'Fixture Pen A', exact:true}).waitFor();
 assert.equal(await review.inputValue(), reviewText);
 await action('Next page').click();
 await record.getByRole('cell', {name:'Fixture Pen B', exact:true}).waitFor();
 assert.deepEqual(await record.getByRole('columnheader').allTextContents(), careHeadings);

 await page.setViewportSize({width:1440, height:900});
 await page.goto(ownerHealthUrl);
 await record.getByRole('cell', {name:'Fixture Pen A', exact:true}).waitFor();
 assert.equal(await action('Add page').count(), 0, 'A historical register is view-only');
 assert.equal(await action('Save review').count(), 0, 'The original review cannot be edited from a view-only register');
 await expect(review).toHaveValue(reviewText);
 assert.equal(await review.isEditable(), false);
 await action('Next page').click();
 await record.getByRole('cell', {name:'Fixture Pen B', exact:true}).waitFor();
 await action('Next page').click();
 await record.getByRole('cell', {name:'Fixture Pen C', exact:true}).waitFor();
 assert.deepEqual(errors, []);
 assert.equal(posts.length, 0, 'Worksheet saves have no effect on the original schedule, notes, or completions API');
 console.log('PASS animal care record template, mobile entry, copied rows, continuation pages, saved review, and owner history');

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
  for(const heading of ['Task','Batch','Due','Status'])assert.equal(await schedule.getByRole('columnheader',{name:heading,exact:true}).isVisible(),true,heading+' must be visible at '+width+'px');
  assert.equal(await schedule.getByRole('cell',{name:/Actual flock/}).isVisible(),true);
  assert.equal(await schedule.locator('tbody tr').first().evaluate(el=>getComputedStyle(el).display),'table-row');
  assert.equal(await schedule.getByRole('button',{name:'Mark done',exact:true}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(folder,'health-'+width+'.png'),fullPage:true});
  await schedule.getByRole('button',{name:'Actual vet schedule',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByText('Use the actual veterinary instruction').waitFor();
  await dialog.getByText(/Vet recommendation .* Review the recorded observation/).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Correct schedule',exact:true}).isVisible(),true);
  await dialog.getByRole('button',{name:'Questions & replies',exact:true}).click();
  await dialog.getByRole('heading',{name:'Questions and replies',exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.setViewportSize({width:375,height:850});
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
 // Production can have no health tasks or notes. Show the same four columns on both roles.
 tasks=[];completions=[];
 for(const [role,width] of [['admin',375],['manager',375],['admin',1440]]){
  await page.setViewportSize({width,height:750});await page.goto('http://127.0.0.1:'+server.address().port+'/?'+role+'=1');
  const empty=page.getByRole('table',{name:'Farm health schedule'});
  await empty.getByText('No health tasks scheduled yet.').waitFor();
  for(const heading of ['Task','Batch','Due','Status'])assert.equal(await empty.getByRole('columnheader',{name:heading,exact:true}).isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.getByRole('table',{name:'Recorded health details'}).getByText('Pen checked by supervisor').waitFor();
 healthNotes=[];await page.reload();
 await page.getByRole('table',{name:'Farm health schedule'}).getByText('No health tasks scheduled yet.').waitFor();
 assert.equal(await page.getByRole('table',{name:'Recorded health details'}).count(),0);
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
