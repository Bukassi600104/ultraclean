// Real React components in an isolated browser; no live database or auth calls.
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
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import {OperationsFeatureProvider} from './contexts/ManagerPeriodContext';import {FeedStock} from './components/manager/FeedStock';import DailyFeed from './app/(manager)/manager/daily-feed/page';const q=new URL(location.href).searchParams;createRoot(document.getElementById('root')).render(<OperationsFeatureProvider actorId="ceo">{q.get('screen')==='daily'?<DailyFeed/>:<FeedStock admin={q.get('admin')==='yes'}/>}</OperationsFeatureProvider>);`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-auth-next',setup(builder){builder.onResolve({filter:/^(next\/link|@\/contexts\/AuthContext)$/},args=>({path:args.path,namespace:'mock'}));builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`:`export const useAuth=()=>({profile:{id:'00000000-0000-4000-8000-000000000001',role:'manager'}});`,loader:'js',resolveDir:process.cwd()}));}}]});
const artifacts=mkdtempSync(path.join(os.tmpdir(),'bossbimbz-farm-ui-')),cssPath=path.join(artifacts,'styles.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',cssPath],{stdio:'pipe'});
const styles=readFileSync(cssPath,'utf8');
const server=http.createServer((req,res)=>{if(req.url.startsWith('/bundle.js')){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url.startsWith('/styles.css')){res.setHeader('Content-Type','text/css');res.end(styles);}else{res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
let enabled=true;await page.route('**/api/operations/manager-context*',r=>r.fulfill({json:{actorId:'ceo',business:'farm',featureEnabled:enabled}}));
const faults=[],calls=[];page.on('pageerror',error=>faults.push(error.message));

const id='00000000-0000-4000-8000-000000000001';
let stock={id,feed_type:'fish',feed_source:'local',current_bags:null,initialized_at:null,opening_date:null,revision:0,uncounted_receipts:[]},movements=[],daily=[],failDaily=false,failPhysical=false,failRead=false,rejectDaily=false;const receipts=new Map();let reviewProblems=[],rejectReview=false,failReview=false,extraStocks=[],failDailySource="",physicalReplyOverrides=[];
await page.route('**/api/farm/**',async route=>{
 const req=route.request(),url=new URL(req.url()),method=req.method(),body=req.postDataJSON()??{},retryId=req.headers()['x-request-id'];calls.push({method,body,requestId:retryId,path:url.pathname});let result;
 if(method==='GET'){
  if(failRead)return route.fulfill({status:503,json:{error:'Feed inventory unavailable'}});
  const legacyOpening={id:'00000000-0000-4000-9000-000000000107',kind:'opened',movement_type:'use',activity_date:'2024-01-01',feed_type:'fish',feed_source:'local',bags:1,actor_name:'Earlier manager',stock_id:id,recorded_at:'2024-01-01T12:00:00Z'};
  result=url.pathname.includes('feed-stock')?url.searchParams.has('history')?{data:[...movements,legacyOpening],total:movements.length+1}:{data:[stock,...extraStocks],total:1+extraStocks.length,problems:reviewProblems}:{data:daily,total:daily.length};
 }else if(receipts.has(retryId)){result=receipts.get(retryId);}
 else if(body.operation==='review_problem'){
  if(rejectReview){rejectReview=false;return route.fulfill({status:409,json:{code:'40001',error:'Feed changed since this check. Ask the manager to confirm the current count'}});}
  result={data:{activity:{id:body.id,review_status:body.payload.decision==='approve'?'approved':'declined'}}};receipts.set(retryId,result);reviewProblems=reviewProblems.filter(row=>row.id!==body.id);
  if(failReview){failReview=false;await route.abort('failed');return;}
 }
 else if(url.pathname.includes('feed-stock')){
  const {operation,payload:p}=body;if(operation==='opened'&&!stock.initialized_at)return route.fulfill({status:409,json:{code:'23514',error:'Record the actual starting bag count first'}});const delta=operation==='opened'?-p.bags:operation==='problem'?0:p.bags;
  stock={...stock,current_bags:operation==='starting'?p.bags:stock.current_bags===null?null:stock.current_bags+delta,initialized_at:operation==='starting'?'2026-10-28T12:00:00Z':stock.initialized_at,opening_date:operation==='starting'?p.date:stock.opening_date,revision:stock.revision+1};
  const activity={id:crypto.randomUUID(),stock_id:id,kind:operation,bags:p.bags,activity_date:p.date,recorded_at:'2026-10-28T12:00:00Z',actor_name:'Recorded manager',notes:p.notes||null,resulting_bags:stock.current_bags,feed_type:'fish',feed_source:'local',review_status:p.request_review?'pending':'not_requested',stock_revision:stock.revision};movements.push(activity);result={data:{stock,activity}};receipts.set(retryId,result);if(failPhysical){failPhysical=false;await route.abort('failed');return;}
 }else{
  if(rejectDaily){rejectDaily=false;return route.fulfill({status:409,json:{code:'23514',error:'Record the actual starting bag count first'}});}stock.current_bags-=body.bags_opened||0;daily.push({...body,id:crypto.randomUUID()});if(body.bags_opened)movements.push({id:crypto.randomUUID(),stock_id:id,kind:'opened',bags:body.bags_opened,activity_date:body.date,recorded_at:'2026-10-28T12:01:00Z',actor_name:'Recorded manager',resulting_bags:stock.current_bags,feed_type:'fish',feed_source:'local',daily_feed_id:daily.at(-1).id});result={data:daily.at(-1)};receipts.set(retryId,result);if(failDaily||failDailySource===body.feed_source){failDaily=false;failDailySource='';await route.abort('failed');return;}
 }
 if(method==='POST'&&url.pathname.includes('feed-stock')&&['starting','received','opened','problem'].includes(body.operation)&&physicalReplyOverrides.length)result=physicalReplyOverrides.shift();
 await route.fulfill({status:method==='POST'?201:200,json:result});
});
let checks=0;
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Unopened feed bags',exact:true}).waitFor();await page.getByText('Starting count needed',{exact:true}).waitFor();assert.equal(await page.locator('tbody tr').count(),1);assert.equal(await page.getByText('0 bags remaining',{exact:true}).count(),0);checks+=2;
 await page.evaluate(()=>{const form={operation:'opened',type:'fish',source:'local',date:new Date().toISOString().slice(0,10),bags:'1',notes:'Original saved opening',review:false,included:'',inclusions:{}};localStorage.setItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin',JSON.stringify({form,pending:{id:'00000000-0000-4000-8000-000000000009',body:{operation:'opened',payload:{date:form.date,feed_type:'fish',feed_source:'local',bags:1,notes:form.notes}}}}));});await page.reload({waitUntil:"domcontentloaded"});
 await page.getByRole('button',{name:'Add feed record',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.waitFor();await page.getByRole('button',{name:'Retry saved entry',exact:true}).click();await page.getByRole('button',{name:'Record starting count',exact:true}).waitFor();assert.equal(await page.getByLabel('Activity',{exact:true}).isEnabled(),true);assert.ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes(':rejected:00000000-0000-4000-8000-000000000009'))));checks+=2;await page.getByRole('button',{name:'Record starting count',exact:true}).click();await page.getByLabel('Activity',{exact:true}).selectOption('starting');await page.getByLabel('Actual unopened bags counted',{exact:true}).fill('20');await page.getByRole('button',{name:'Save feed record',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(stock.current_bags,20);assert.equal(await page.getByRole('button',{name:'Add feed record',exact:true}).evaluate(el=>el===document.activeElement),true);checks+=2;
 await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByLabel('Activity',{exact:true}).selectOption('opened');await page.getByLabel('Number of whole bags',{exact:true}).fill('10');failPhysical=true;await page.getByRole('button',{name:'Save feed record',exact:true}).click();await page.getByRole('button',{name:'Retry saved entry',exact:true}).waitFor();assert.equal(stock.current_bags,10);assert.equal(await page.getByLabel('Number of whole bags',{exact:true}).isDisabled(),true);checks+=2;
 await page.reload({waitUntil:"domcontentloaded"});await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByRole('button',{name:'Retry saved entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(stock.current_bags,10);const physical=calls.filter(c=>c.method==='POST'&&c.body.operation==='opened');assert.equal(physical.length,3);assert.equal(physical[1].requestId,physical[2].requestId);assert.equal(movements[1].review_status,'not_requested');checks+=4;
 await page.goto(origin+'/?admin=yes',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Unopened feed bags',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Add feed record',exact:true}).count(),0);assert.equal(await page.locator('input[type=number]').count(),0);checks+=2;
 await page.getByRole('button',{name:/View history/}).click();await page.getByText('Recorded by Recorded manager',{exact:false}).first().waitFor();checks++;
 await page.goto(origin+'/?screen=daily',{waitUntil:'domcontentloaded'});await page.getByText('Feed Usage',{exact:true}).waitFor();await page.locator('input[type=number]').nth(0).fill('0.5');await page.getByLabel('Local new bags opened',{exact:true}).fill('1');rejectDaily=true;await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Local new bags opened',{exact:true}).isEnabled(),true);assert.equal(daily.length,0);checks+=2;await page.reload({waitUntil:"domcontentloaded"});await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();assert.equal(await page.locator('input[type=number]').nth(0).inputValue(),'0.5');checks++;failDaily=true;await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).waitFor();assert.equal(stock.current_bags,9);assert.equal(await page.getByLabel('Local new bags opened',{exact:true}).isDisabled(),true);checks+=2;
 await page.reload({waitUntil:"domcontentloaded"});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).waitFor();const retryPosts=calls.filter(c=>c.method==='POST').length;await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Quota exceeded');};});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(calls.filter(c=>c.method==='POST').length,retryPosts);await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).click();await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();assert.equal(stock.current_bags,9);const posts=calls.filter(c=>c.method==='POST'&&c.path.includes('daily-feed'));assert.equal(posts.length,3);assert.equal(posts[1].requestId,posts[2].requestId);assert.equal(daily.length,1);checks+=5;
 assert.equal(await page.locator('option[value="00000000-0000-4000-9000-000000000107"]').count(),0,'Older movement remains in history but cannot be submitted as an opening receipt');checks++;
 await page.locator('input[type=number]').nth(0).fill('0.25');await page.getByLabel('local recorded opening (optional)',{exact:false}).selectOption(movements[1].id);await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();assert.equal(stock.current_bags,9);assert.equal(daily.length,2);assert.equal(daily[1].opening_activity_id,movements[1].id);assert.equal(daily[1].bags_opened,0);checks+=4;
 for(const screen of['','?admin=yes','?screen=daily'])for(const width of[390,768,1440]){await page.setViewportSize({width,height:900});await page.goto(origin+'/'+screen,{waitUntil:'domcontentloaded'});await (screen.includes('daily')?page.getByText('Feed Usage',{exact:true}):page.getByRole('heading',{name:'Unopened feed bags',exact:true})).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(artifacts,`feed-${screen.replace(/\W/g,'')}-${width}.png`),fullPage:true});checks++;}
 await page.setViewportSize({width:390,height:560});await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();dialog=page.getByRole('dialog');await page.getByLabel('Notes (optional)',{exact:true}).fill('Keep this unsaved note');await page.waitForFunction(()=>getComputedStyle(document.querySelector('[role=dialog]')).opacity==='1');const bounds=await dialog.boundingBox();assert.ok(bounds.x>=15&&bounds.x+bounds.width<=375&&bounds.y>=15&&bounds.y+bounds.height<=545);assert.ok(await page.getByRole('button',{name:'Save feed record',exact:true}).isVisible());await page.screenshot({path:path.join(artifacts,'feed-dialog-short-phone.png'),fullPage:true});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Add feed record',exact:true}).evaluate(el=>el===document.activeElement),true);await page.getByRole('button',{name:'Add feed record',exact:true}).click();assert.equal(await page.getByLabel('Notes (optional)',{exact:true}).inputValue(),'Keep this unsaved note');checks+=4;
 await page.keyboard.press('Escape');failRead=true;await page.reload({waitUntil:"domcontentloaded"});await page.getByRole('alert').waitFor();assert.equal(await page.locator('tbody tr').count(),0);checks++;failRead=false;
 assert.deepEqual(faults,[]);checks++;enabled=false;failRead=true;await page.goto(origin+'/?screen=daily',{waitUntil:'domcontentloaded'});await page.getByRole('alert').waitFor();assert.equal(await page.getByText('No records yet',{exact:true}).count(),0,'Unavailable history cannot become a false empty state during cutover');assert.equal(await page.getByLabel('Local new bags opened',{exact:true}).count(),0);checks+=2;
 failRead=false;enabled=true;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/View history/}).click();await page.getByText('Linked to daily feeding',{exact:true}).waitFor();assert.doesNotMatch(await page.locator('body').innerText(),/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);assert.equal(daily.length,2);checks+=2;

 // Selecting a different species/date must not submit an invisible, incompatible opening.
 await page.goto(origin+'/?screen=daily',{waitUntil:'domcontentloaded'});await page.getByText('Feed Usage',{exact:true}).waitFor();
 await page.getByLabel('local recorded opening (optional)',{exact:false}).selectOption(movements[1].id);
 await page.getByRole('button',{name:'Goat Feed',exact:true}).click();
 assert.equal(await page.getByLabel('local recorded opening (optional)',{exact:false}).inputValue(),'');checks++;
 await page.locator('input[type=number]').nth(0).fill('0.25');await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[type=number]').value==='');
 assert.equal(daily.at(-1).feed_type,'goat');assert.equal(daily.at(-1).opening_activity_id,undefined);checks+=2;
 await page.getByRole('button',{name:'Fish Feed',exact:true}).click();await page.getByLabel('local recorded opening (optional)',{exact:false}).selectOption(movements[1].id);
 await page.locator('input[type=date]').fill('2026-10-01');assert.equal(await page.getByLabel('local recorded opening (optional)',{exact:false}).inputValue(),'');checks++;
 // An incompatible restored draft also gets checked immediately before sending.
 await page.evaluate(opening=>{const key='primefield-daily-feed-retry:00000000-0000-4000-8000-000000000001:period:admin';localStorage.setItem(key,'[]');localStorage.setItem(key+':draft',JSON.stringify({date:new Date().toISOString().slice(0,10),feedType:'goat',localBags:'0.25',foreignBags:'',localOpened:'0',foreignOpened:'0',localOpening:opening,foreignOpening:'',notes:''}));},movements[1].id);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();const incompatiblePosts=calls.filter(c=>c.method==='POST').length;await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.waitForTimeout(150);assert.equal(calls.filter(c=>c.method==='POST').length,incompatiblePosts);checks++;
 // Corrupt and malformed saved retries are retained byte-for-byte and cannot be replaced.
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 const savedForm={operation:'opened',type:'fish',source:'local',date:new Date().toISOString().slice(0,10),bags:'1',notes:'',review:false,included:'',inclusions:{}};
 const savedPayload={date:savedForm.date,feed_type:'fish',bags:1};
 const malformedPayloads=[[],{}, {...savedPayload,bags:'1'}, {...savedPayload,date:'2026-02-31'}, {...savedPayload,receipt_inclusions:[null]}];
 for(const raw of ['{unreadable saved retry',JSON.stringify({form:{bags:'1'},pending:{id:'original'}}),...malformedPayloads.map(payload=>JSON.stringify({form:savedForm,pending:{id:crypto.randomUUID(),body:{operation:'opened',payload}}}))]){
  await page.evaluate(raw=>localStorage.setItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin',raw),raw);
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByRole('alert').filter({hasText:'saved feed entry could not be read'}).waitFor();
  assert.equal(await page.getByLabel('Activity',{exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Save feed record',exact:true}).isDisabled(),true);
  const beforePosts=calls.filter(c=>c.method==='POST').length;await page.getByRole('button',{name:'Close',exact:true}).first().click();await page.getByRole('button',{name:'Add feed record',exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin')),raw);assert.equal(calls.filter(c=>c.method==='POST').length,beforePosts);checks+=4;
 }
 await page.evaluate(()=>localStorage.removeItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin'));
 // A definitive stale count rejection unlocks the decision, retaining its audit draft.
 const problem={id:crypto.randomUUID(),feed_type:'fish',feed_source:'local',bags:9,activity_date:new Date().toISOString().slice(0,10),recorded_at:new Date().toISOString(),actor_name:'Manager',stock_revision:1,current_bags:8};reviewProblems=[problem];rejectReview=true;
 await page.goto(origin+'/?admin=yes',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review count',exact:true}).click();await page.getByLabel('Reason',{exact:true}).fill('Check the physical count');await page.getByRole('button',{name:'Save decision',exact:true}).click();
 await page.getByRole('dialog').getByRole('alert').filter({hasText:'Feed changed since this check'}).waitFor();assert.equal(await page.getByRole('dialog').getByRole('combobox').isEnabled(),true);checks++;
 const rejectedReview=calls.filter(c=>c.body.operation==='review_problem').at(-1);assert.ok(await page.evaluate(id=>localStorage.getItem('primefield-feed-count-review:00000000-0000-4000-8000-000000000001:period:admin:rejected:'+id),rejectedReview.requestId));checks++;
 await page.getByRole('dialog').getByRole('combobox').selectOption('decline');await page.getByRole('button',{name:'Save decision',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const declineReview=calls.filter(c=>c.body.operation==='review_problem').at(-1);assert.equal(declineReview.body.payload.decision,'decline');assert.notEqual(declineReview.requestId,rejectedReview.requestId);checks+=2;
 // An uncertain response must still replay the exact original review, including after reload.
 reviewProblems=[{...problem,id:crypto.randomUUID()}];failReview=true;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review count',exact:true}).click();await page.getByRole('dialog').getByRole('combobox').selectOption('approve');await page.getByLabel('Reason',{exact:true}).fill('Verified current count');await page.getByRole('button',{name:'Save decision',exact:true}).click();await page.getByRole('button',{name:'Retry saved decision',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').getByRole('combobox').isDisabled(),true);const uncertainReview=calls.filter(c=>c.body.operation==='review_problem').at(-1);checks++;
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry saved count decision',exact:true}).click();await page.getByRole('button',{name:'Retry saved count decision',exact:true}).waitFor({state:'hidden'});const confirmedReview=calls.filter(c=>c.body.operation==='review_problem').at(-1);assert.equal(confirmedReview.requestId,uncertainReview.requestId);assert.deepEqual(confirmedReview.body,uncertainReview.body);assert.equal(await page.evaluate(()=>localStorage.getItem('primefield-feed-count-review:00000000-0000-4000-8000-000000000001:period:admin')),null);checks+=3;
 // Nested invalid CEO decisions must remain untouched too. Optional legacy revision stays optional.
 reviewProblems=[{...problem,id:crypto.randomUUID()}];
 const decisionKey='primefield-feed-count-review:00000000-0000-4000-8000-000000000001:period:admin';
 const validDecision={id:crypto.randomUUID(),body:{operation:'review_problem',id:reviewProblems[0].id,reason:'Legacy saved decline',payload:{decision:'decline'}}};
 for(const decision of [{...validDecision,body:{...validDecision.body,reason:null}},{...validDecision,body:{...validDecision.body,payload:{decision:'decline',expected_revision:'1'}}},{...validDecision,body:{...validDecision.body,payload:[]}}]){
  const raw=JSON.stringify(decision);await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:decisionKey,raw});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review count',exact:true}).click();
  assert.equal(await page.getByRole('dialog').getByRole('combobox').isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Save decision',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(key=>localStorage.getItem(key),decisionKey),raw);checks+=3;
 }
 await page.evaluate(({key,decision})=>localStorage.setItem(key,JSON.stringify(decision)),{key:decisionKey,decision:validDecision});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry saved count decision',exact:true}).click();await page.getByRole('button',{name:'Retry saved count decision',exact:true}).waitFor({state:'hidden'});const legacyDecision=calls.filter(c=>c.body.operation==='review_problem').at(-1);assert.equal(legacyDecision.requestId,validDecision.id);assert.deepEqual(legacyDecision.body,validDecision.body);checks+=2;
 console.log('Existing feed coverage complete; testing final reliability failures.');
 // Failed local acknowledgement cannot release a retry identifier, including partial local/foreign saves.
 const dailyKey='primefield-daily-feed-retry:00000000-0000-4000-8000-000000000001:period:admin';
 await page.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem(key+':draft');},dailyKey);
 await page.goto(origin+'/?screen=daily',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();
 for(const reload of [false,true]){
  const before=daily.length,previousStock=stock.current_bags;
  await page.locator('input[type=number]').nth(0).fill('0.5');await page.getByLabel('Local new bags opened',{exact:true}).fill('1');
  await page.evaluate(key=>{const original=Storage.prototype.setItem;window.restoreFeedStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(k,v){if(k===key&&v==='[]'){Storage.prototype.setItem=original;throw Error('Local confirmation could not be saved');}return original.call(this,k,v);};},dailyKey);
  await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.getByRole('alert').filter({hasText:'Local confirmation could not be saved'}).waitFor();
  assert.equal(daily.length,before+1);assert.equal(stock.current_bags,previousStock-1);const original=calls.filter(c=>c.path.includes('daily-feed')&&c.method==='POST').at(-1);
  assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),dailyKey))[0].id,original.requestId);
  if(reload){await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).waitFor();}
  await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).click();await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();
  const retried=calls.filter(c=>c.path.includes('daily-feed')&&c.method==='POST').at(-1);assert.equal(retried.requestId,original.requestId);assert.deepEqual(retried.body,original.body);assert.equal(daily.length,before+1);assert.equal(stock.current_bags,previousStock-1);checks+=7;
 }
 const bothBefore=daily.length,bothStock=stock.current_bags;
 await page.locator('input[type=number]').nth(0).fill('0.25');await page.locator('input[type=number]').nth(1).fill('0.75');await page.getByLabel('Local new bags opened',{exact:true}).fill('1');await page.getByLabel('Foreign new bags opened',{exact:true}).fill('1');failDailySource='foreign';
 await page.getByRole('button',{name:'Record Feed Usage',exact:true}).click();await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).waitFor();await page.getByRole('alert').waitFor();
 const foreignOriginal=calls.filter(c=>c.path.includes('daily-feed')&&c.method==='POST').at(-1);const retained=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),dailyKey));assert.equal(retained.length,1);assert.equal(retained[0].payload.feed_source,'foreign');assert.equal(daily.length,bothBefore+2);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).click();await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();
 const foreignRetry=calls.filter(c=>c.path.includes('daily-feed')&&c.method==='POST').at(-1);assert.equal(foreignRetry.requestId,foreignOriginal.requestId);assert.deepEqual(foreignRetry.body,foreignOriginal.body);assert.equal(daily.length,bothBefore+2);assert.equal(stock.current_bags,bothStock-2);checks+=7;
 // Malformed pending arrays and drafts cannot be overwritten or sent. Legacy optional fields remain valid.
 const pendingPayload={date:new Date().toISOString().slice(0,10),feed_type:'fish',num_bags:0.25,feed_source:'local'};
 for(const raw of ['', '{broken','{}','null',JSON.stringify([{id:'not-an-id',payload:pendingPayload}]),JSON.stringify([{id:crypto.randomUUID(),payload:{...pendingPayload,date:'2026-02-31'}}]),JSON.stringify([{id:crypto.randomUUID(),payload:{...pendingPayload,bags_opened:'1'}}]),JSON.stringify([{id:crypto.randomUUID(),payload:{...pendingPayload,opening_activity_id:'unknown'}}])]){
  await page.evaluate(({key,raw})=>{localStorage.setItem(key,raw);localStorage.removeItem(key+':draft');},{key:dailyKey,raw});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('alert').filter({hasText:'saved feed entry could not be read'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(key=>localStorage.getItem(key),dailyKey),raw);checks+=2;
 }
 for(const raw of ['{broken','{}','null',JSON.stringify({date:'2026-02-31',feedType:'fish',notes:'',localBags:'1',foreignBags:''}),JSON.stringify({date:pendingPayload.date,feedType:'fish',notes:[],localBags:'1',foreignBags:''})]){
  await page.evaluate(({key,raw})=>{localStorage.setItem(key,'[]');localStorage.setItem(key+':draft',raw);},{key:dailyKey,raw});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('alert').filter({hasText:'saved feed entry could not be read'}).waitFor();assert.equal(await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(key=>localStorage.getItem(key+':draft'),dailyKey),raw);checks+=2;
 }
 const legacySaved={id:crypto.randomUUID(),payload:{date:pendingPayload.date,feed_type:'fish',num_bags:0.25,notes:null}};
 await page.evaluate(({key,saved})=>{localStorage.setItem(key,JSON.stringify([saved]));localStorage.removeItem(key+':draft');},{key:dailyKey,saved:legacySaved});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry saved feed entry',exact:true}).click();await page.getByRole('button',{name:'Record Feed Usage',exact:true}).waitFor();const legacyPost=calls.filter(c=>c.method==='POST'&&c.path.includes('daily-feed')).at(-1);assert.equal(legacyPost.requestId,legacySaved.id);assert.deepEqual(legacyPost.body,legacySaved.payload);checks+=2;
 // Each changed count context requires a fresh inclusion answer; unrelated notes keep it.
 extraStocks=[{...stock,id:crypto.randomUUID(),feed_source:'foreign',opening_date:pendingPayload.date},{...stock,id:crypto.randomUUID(),feed_type:'goat',opening_date:pendingPayload.date}];stock.opening_date=pendingPayload.date;
 await page.evaluate(()=>localStorage.removeItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin'));await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByLabel('Activity',{exact:true}).selectOption('received');await page.getByLabel('Number of whole bags',{exact:true}).fill('1');
 const inclusion=page.getByLabel(/Were these bags already included/);
 await inclusion.selectOption('yes');await page.getByLabel('Notes (optional)',{exact:true}).fill('Same receipt');assert.equal(await inclusion.inputValue(),'yes');checks++;
 for(const change of ['source','type','date','operation']){
  await inclusion.selectOption('yes');
  if(change==='source')await page.getByLabel('Source',{exact:true}).selectOption('foreign');
  if(change==='type'){await page.getByLabel('Source',{exact:true}).selectOption('local');await inclusion.selectOption('yes');await page.getByLabel('Feed type',{exact:true}).selectOption('goat');}
  if(change==='date')await page.getByLabel('Activity date',{exact:true}).fill(new Date(Date.now()-86400000).toISOString().slice(0,10));
  if(change==='operation'){await page.getByLabel('Activity',{exact:true}).selectOption('opened');await page.getByLabel('Activity',{exact:true}).selectOption('received');}
  assert.equal(await inclusion.inputValue(),'');const sent=calls.filter(c=>c.method==='POST').length;await page.getByRole('button',{name:'Save feed record',exact:true}).click();await page.getByRole('alert').filter({hasText:'Confirm whether these bags'}).waitFor();assert.equal(calls.filter(c=>c.method==='POST').length,sent);checks+=2;
 }
 await page.getByRole('button',{name:'Close',exact:true}).first().click();
 // Clearing an editable date is a recoverable unfinished draft, never a corrupt retry.
 await page.getByRole('button',{name:'Add feed record',exact:true}).click();
 await page.getByLabel('Activity date',{exact:true}).fill('');
 await page.getByLabel('Notes (optional)',{exact:true}).fill('Count date still to be chosen');
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();
 assert.equal(await page.getByLabel('Activity',{exact:true}).isEnabled(),true);
 assert.equal(await page.getByLabel('Activity date',{exact:true}).inputValue(),'');
 assert.equal(await page.getByLabel('Notes (optional)',{exact:true}).inputValue(),'Count date still to be chosen');checks+=3;
 await page.getByRole('button',{name:'Close',exact:true}).first().click();
 // A successful HTTP code without the persisted stock/activity receipt must retain the exact retry.
 const badReplies=[{},null,{data:{stock:{id},activity:{id:'not-an-id'}}},{data:{activity:{id:crypto.randomUUID()}}}];
 for(const [index,operation] of ['starting','received','opened','problem'].entries()){
  const form={...savedForm,operation,bags:operation==='starting'?'20':'1',notes:operation==='problem'?'Physical count differs':'',included:operation==='received'?'no':''};
  await page.evaluate(form=>localStorage.setItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin',JSON.stringify({form,pending:null})),form);
  if(operation==='starting')stock={...stock,initialized_at:null,current_bags:null,opening_date:null,uncounted_receipts:[]};
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();
  const before=movements.length;physicalReplyOverrides=[badReplies[index]];
  await page.getByRole('button',{name:'Save feed record',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'server has not confirmed this feed entry'}).waitFor();
  assert.equal(await page.getByLabel('Activity',{exact:true}).isDisabled(),true);
  const original=calls.filter(call=>call.method==='POST').at(-1);
  const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('primefield-feed-record:00000000-0000-4000-8000-000000000001:period:admin')).pending);
  assert.equal(pending.id,original.requestId);assert.deepEqual(pending.body,original.body);assert.equal(movements.length,before+1);
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add feed record',exact:true}).click();
  await page.getByRole('button',{name:'Retry saved entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  const retry=calls.filter(call=>call.method==='POST').at(-1);
  assert.equal(retry.requestId,original.requestId);assert.deepEqual(retry.body,original.body);assert.equal(movements.length,before+1);checks+=7;
 }
 // Count the actual feed without replacing a network-uncertain feeding draft.
 stock={...stock,initialized_at:null,opening_date:null,current_bags:null};
 extraStocks=[];const savedDay=new Date().toISOString().slice(0,10),feedRetry=crypto.randomUUID();
 const waiting=[{id:feedRetry,payload:{date:savedDay,feed_type:'fish',feed_source:'local',num_bags:0.5,bags_opened:1}}];
 await page.evaluate(({dailyKey,waiting})=>localStorage.setItem(dailyKey,JSON.stringify(waiting)),{dailyKey,waiting});
 await page.goto(origin+'/?screen=daily');
 await page.getByRole('button',{name:'Record starting count for fish foreign'}).click();
 assert.equal(await page.getByLabel('Source',{exact:true}).inputValue(),'foreign');
 await page.getByRole('button',{name:'Close',exact:true}).first().click();
 await page.getByRole('button',{name:'Record starting count for fish local'}).click();
 const count=page.getByRole('dialog');await count.getByLabel('Actual unopened bags counted',{exact:true}).fill('5');
 await count.getByRole('button',{name:'Save feed record'}).click();await count.waitFor({state:'hidden'});
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),dailyKey),waiting);
 const beforeFeed=daily.length;await page.getByRole('button',{name:'Retry saved feed entry'}).click();
 await page.getByRole('button',{name:'Saved!',exact:true}).waitFor();
 assert.equal(daily.length,beforeFeed+1);assert.equal(stock.current_bags,4);assert.ok(receipts.has(feedRetry));checks+=5;
 await page.goto(origin);assert.equal(await page.getByRole('link',{name:'Record feed usage',exact:true}).getAttribute('href'),'/manager/daily-feed');
 await page.getByRole('button',{name:'Record a bag count'}).click();await page.getByRole('dialog').getByLabel('Feed type',{exact:true}).selectOption('pig');
 await page.getByRole('dialog').getByLabel('Source',{exact:true}).selectOption('foreign');assert.equal(await page.getByRole('dialog').getByLabel('Activity',{exact:true}).inputValue(),'starting');
 checks+=2;
 // An uncertain physical opening may also need its count first. Preserve its exact retry through reload.
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).first().click();
 stock={...stock,initialized_at:null,opening_date:null,current_bags:null};
 const physicalKey='primefield-feed-record:'+id+':period:admin';
 const heldForm={operation:'opened',type:'fish',source:'local',date:savedDay,bags:'1',notes:'Held opening',review:false,included:'',inclusions:{}};
 const held={id:crypto.randomUUID(),body:{operation:'opened',payload:{date:savedDay,feed_type:'fish',feed_source:'local',bags:1,notes:'Held opening'}}};
 await page.evaluate(({physicalKey,heldForm,held})=>localStorage.setItem(physicalKey,JSON.stringify({form:heldForm,pending:held})),{physicalKey,heldForm,held});
 await page.reload();await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Record starting count',exact:true}).click();
 await page.getByLabel('Actual unopened bags counted',{exact:true}).fill('6');await page.getByRole('dialog').getByRole('button',{name:'Save feed record'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.reload();await page.getByRole('button',{name:'Add feed record',exact:true}).click();await page.getByRole('button',{name:'Retry saved entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const actual=calls.filter(c=>c.requestId===held.id).at(-1);assert.deepEqual(actual.body,held.body);assert.equal(stock.current_bags,5);checks+=2;
 assert.deepEqual(faults,[]);checks++;
 console.log(`PASS ${checks} actual feed UI checks: manager-led starting count, optional review, CEO observation, partial feeding, earlier opening linkage, retry identity, history, storage failure, error isolation, centred dialog/focus and responsive layouts. Screenshots: ${artifacts}`);
}catch(error){console.error({faults,body:await page.locator('body').innerText().catch(()=>'<browser unavailable>')});throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
