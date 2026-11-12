import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {readFileSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:20000});
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const id='00000000-0000-4000-8000-000000000001';
const buyerPeriod='00000000-0000-4000-8000-000000000011',supervisorPeriod='00000000-0000-4000-8000-000000000012',buyerActor='00000000-0000-4000-8000-000000000013',supervisorActor='00000000-0000-4000-8000-000000000014';
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmPurchases} from './components/manager/FarmPurchases';createRoot(document.getElementById('root')).render(<FarmPurchases admin={!/supervisor|buyer/.test(location.search)} expenses={location.search==='?supervisor'}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-scope',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'link-mock'}));b.onLoad({filter:/.*/,namespace:'link-mock'},()=>({contents:'import React from \"react\";export default function Link(p){return React.createElement(\"a\",p,p.children)}',loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^@\/contexts\/AuthContext$/},()=>({path:'auth',namespace:'auth-mock'}));b.onLoad({filter:/.*/,namespace:'auth-mock'},()=>({contents:"export const useAuth=()=>({profile:{role:/supervisor|buyer/.test(location.search)?'manager':'admin'}});",loader:'js'}));b.onResolve({filter:/^@\/contexts\/ManagerPeriodContext$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const buyer=location.search.includes('buyer'),supervisor=location.search.includes('supervisor'),identity={actorId:buyer?'${buyerActor}':supervisor?'${supervisorActor}':'${id}',business:'farm',periodId:buyer?'${buyerPeriod}':supervisor?'${supervisorPeriod}':'${id}'};export const ManagerPeriodProvider=({children})=>children;export const useQueueIdentity=()=>identity;export const useManagerPeriod=()=>({...identity,status:'active'});export const useOperationsFeature=()=>({enabled:true});export const useManagerFetch=()=>fetch;`,loader:'js'}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();const errors=[],posts=[];let rows=[];
const report={id:'00000000-0000-4000-8000-000000000018',period_id:'00000000-0000-4000-8000-000000000071',date:'2026-11-09',supplier:'Electrician',amount_exact:'4500',description:'Emergency pump repair',reported_by_name:'Assigned supervisor',matching_costs:[],resolution:null,approval:null};
const reports=[report];
const fundsQueries=[], decisions=new Map(), ledger=[];
const ownerPayer={id,name:'Assigned supervisor',holder_type:'manager',currency:'NGN',bucket:'owner',available:'6000'};
const salesPayer={...ownerPayer,id:'00000000-0000-4000-8000-000000000095',name:'Sales holder',bucket:'sales'};
const foreignPayer={...ownerPayer,id:'00000000-0000-4000-8000-000000000096',name:'Foreign currency holder',currency:'USD'};
const taskId=crypto.randomUUID(),orderId=crypto.randomUUID(),lineId=crypto.randomUUID(),evidenceId=crypto.randomUUID();
const workflowItem={description:'Supervisors fish feed',unit:'bags',quantity:'3',destination:'feed',feed_type:'fish',feed_source:'local'};
const task={request_id:taskId,description:'Restock the nursery pond',request_date:'2026-11-12',details:{needed_on:'2026-11-12',why_needed:'Feed for the nursery pond',purchase_category:'feed',supplier:'Pond supplier',items:[workflowItem]},requester_name:'Farm Supervisor',assignment:null,order_id:null,supplier:null,purchased_on:null,paid:'0',lines:[]};
let showTask=false,uploads=[];
let sources=[ownerPayer], fundsError=false, wrongFundsDate=false, missingAcknowledgement=null;
function addReport(lastDigits,supplier){
 const entry={...report,id:'00000000-0000-4000-8000-0000000000'+lastDigits,supplier,approval:null,resolution:null};
 reports.push(entry);
 return entry;
}
page.setDefaultTimeout(45000);console.log('Browser ready');
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const request=route.request(),url=new URL(request.url());let body={data:[]},status=200;
 if(url.pathname==='/api/farm/purchases'){
  if(request.method()==='POST'){const p=request.postDataJSON();posts.push(p);
   if(p.operation==='resolve_exception'){
    const target=reports.find(r=>r.id===p.id), cached=decisions.get(p.request_id);
    if(!target)throw Error('Missing isolated report');
    assert.equal(request.headers()['x-request-id'],p.request_id);
    if(cached)assert.deepEqual(p,cached,'A request retry must keep its original payload');
    else{
     decisions.set(p.request_id,p);
     if(p.payload.decision==='approve_awaiting_funding')target.approval={category:p.payload.category,reason:p.payload.reason,expense_source:p.payload.expense_source||null,approved_at:'2026-11-11T10:00:00Z'};
     else{
      assert.equal(target.resolution,null,'A second distinct decision would post this report twice');
      target.resolution={decision:'link',reason:p.payload.reason,resolved_at:'2026-11-11T10:01:00Z'};
      if(p.payload.decision==='post')ledger.push({reportId:target.id,requestId:p.request_id});
     }
    }
    if(p.payload.decision==='post'&&missingAcknowledgement===target.id){body={error:'Response unavailable'};status=503;}
    else body={data:{id:target.id}};
   }else if(p.operation==='assign_procurement'){
    task.assignment={id:crypto.randomUUID(),period_id:p.payload.period_id,name:'Assigned buyer'};body={data:task.assignment};
   }else if(p.operation==='procure'){
    const line={...workflowItem,id:lineId,unit_price:p.payload.prices[0],received_exact:'0'};
    rows.push({id:orderId,period_id:supervisorPeriod,date:p.payload.date,description:task.description,supplier:p.payload.supplier,category:'feed',total_exact:'90000',paid_exact:'0',status:'approved',revision:0,lines:[line],payments:[],deliveries:[]});
    Object.assign(task,{order_id:orderId,supplier:p.payload.supplier,purchased_on:p.payload.date,lines:[{...line,received:'0',dispatched:'0'}]});body={data:{id:orderId}};
   }else if(p.operation==='dispatch'){
    task.lines[0].dispatched=p.payload.quantity;body={data:{id:crypto.randomUUID()}};
   }else if(p.operation==='confirm_delivery'){
    const order=rows.find(row=>row.id===orderId),delivery={...p.payload,id:crypto.randomUUID()};
    order.deliveries.push(delivery);order.lines[0].received_exact=delivery.quantity;task.lines[0].received=delivery.quantity;body={data:delivery};
   }else{const row={id,date:p.payload.date,supplier:p.payload.supplier,description:p.payload.description,category:p.payload.category,status:'pending',total_exact:'300000.00',paid_exact:'0',revision:0,lines:p.payload.lines.map(l=>({...l,id,received_exact:'0'})),payments:[],deliveries:[]};rows=[row];body={data:row};}}
  else if(url.searchParams.has('line_id'))body={data:[]};
  else {const view=new URL(request.frame().url()).search,buyer=view.includes('buyer');body={purchases:buyer?[]:rows,policy:null,exceptions:reports,procurement_tasks:showTask?[{...task,can_procure:!view.includes('supervisor')}]:[],procurement_people:[{period_id:buyerPeriod,name:'Assigned buyer'}]};}
 }else if(url.pathname==='/api/farm/evidence'&&request.method()==='POST'){
  uploads.push({actor:request.headers()['x-manager-actor'],period:request.headers()['x-manager-period'],body:request.postDataBuffer().toString('latin1')});body={data:{id:evidenceId,status:'uploaded'}};
 }else if(url.pathname==='/api/operations/funds'){
  fundsQueries.push(Object.fromEntries(url.searchParams));
  if(fundsError){status=503;body={error:'Funds could not be loaded'};}
  else body={business:'farm',from:url.searchParams.get('from'),to:wrongFundsDate?'2026-11-11':url.searchParams.get('to'),accounts:[],sources,receipts:[],history:[],total:0,has_more:false,ceo_receivers:[],manager_receivers:[],pending_expenses:[]};
 }else if(url.pathname==='/api/farm/batch-records')body={batches:[]};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 await page.addInitScript(({id})=>{if(!localStorage.getItem('historical-draft-fixture')){localStorage.setItem('historical-draft-fixture','seeded');localStorage.setItem(`farm-purchase-draft:farm:${id}:${id}:request:new`,JSON.stringify({supplier:'Old supplier draft',request_id:crypto.randomUUID(),lines:[{description:'Old line',unit:'bags',quantity:'',unit_price:'',destination:'other',feed_type:'fish',feed_source:'local',item_id:'',batch_id:''}],mediaIds:[]}));}},{id});
 for(const width of [375,390,768,1440]){
  console.log('Viewport',width);await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'Continue earlier purchase draft',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);
  await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Continue earlier purchase draft',exact:true}).click();
 await page.getByLabel('Supplier',{exact:true}).fill('Actual supplier');await page.getByLabel('What is needed and why?',{exact:true}).fill('Ten bags for assigned fish');
 await page.getByLabel('Expense category',{exact:true}).selectOption('feed');
 await page.getByLabel('Item description',{exact:true}).fill('Fish feed');await page.getByLabel('Quantity',{exact:true}).fill('10');await page.getByLabel('Price per unit (NGN)',{exact:true}).fill('30000');
 await page.getByLabel('Where will this be recorded?',{exact:true}).selectOption('feed');
 await page.getByRole('button',{name:'Save entry',exact:true}).click();
 await page.getByRole('button',{name:/Actual supplier/}).waitFor();assert.equal(posts.length,1);assert.equal(posts[0].payload.lines[0].quantity,'10');
 await page.getByRole('button',{name:/Actual supplier/}).click();await page.getByRole('button',{name:'Approve',exact:true}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 const originalUrl='http://127.0.0.1:'+server.address().port;
 await page.getByRole('button',{name:'Approve and record expense',exact:true}).click();
 const dialog=page.getByRole('dialog');
 assert.equal(await dialog.getByLabel('Decision',{exact:true}).inputValue(),'post');
 await dialog.getByLabel('Expense category',{exact:true}).selectOption('utilities');
 await dialog.getByLabel('How was it paid?',{exact:true}).selectOption('later');
 await dialog.getByLabel('Reason for this decision').fill('Confirmed the emergency work');
 await dialog.getByRole('button',{name:/^(Approve and confirm funding later|Approve expense)$/}).click();
 await page.getByRole('button',{name:'Confirm funding and record expense'}).waitFor();
 assert.equal(posts.at(-1).payload.decision,'approve_awaiting_funding');assert.equal(posts.at(-1).payload.cash_payer_account_id,undefined);
 await page.goto(originalUrl+'/?supervisor');await page.getByRole('link',{name:'Operational Requests',exact:true}).waitFor();
 await page.getByText('Approved · funding to confirm',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Confirm funding and record expense'}).count(),0);
 await page.goto(originalUrl+'/#expense-'+report.id);
 await page.getByRole('button',{name:'Confirm funding and record expense'}).click();
 assert.equal(await dialog.getByLabel('Expense category',{exact:true}).inputValue(),'utilities');
 await dialog.getByLabel('How was it paid?',{exact:true}).selectOption('bimbo_transfer');
 await dialog.getByLabel('Who paid this expense?',{exact:true}).selectOption(id);
 await dialog.getByLabel('Reason for this decision').fill('Confirmed the original payer and source');
 await dialog.getByRole('button',{name:/^(Record approved expense|Approve and record expense|Confirm funding and record expense)$/}).click();
 await page.getByText('Expense recorded',{exact:true}).waitFor();
 assert.equal(posts.at(-1).payload.decision,'post');assert.equal(posts.at(-1).payload.cash_payer_account_id,id);
 await page.goto(originalUrl+'/?supervisor');await page.getByText('Expense recorded',{exact:true}).waitFor();
 // Bimbo chose Equipment and Owner funds on the electrician report. No matching
 // payer existed that day. Keep that fact separate from the financial posting.
 await page.setViewportSize({width:375,height:900});
 const named=addReport('19','Pump electrician'), stale=addReport('20','Replacement valve'), immediate=addReport('21','Equipment mechanic'), outage=addReport('22','Emergency technician');
 const entry=target=>page.locator('#expense-'+target.id);
 const openReport=async(target,approved=false)=>{
  const url=originalUrl+'/#expense-'+target.id;
  if(page.url()===url)await page.reload();else await page.goto(url);
  await entry(target).getByRole('button',{name:approved?'Confirm funding and record expense':'Approve and record expense',exact:true}).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Decision',{exact:true})).toHaveValue('post');
 };
 const funding=dialog.getByLabel('How was it paid?',{exact:true});
 const payer=dialog.getByLabel('Who paid this expense?',{exact:true});
 const reason=dialog.getByLabel('Reason for this decision');
 const category=dialog.getByLabel('Expense category',{exact:true});
 const countPostings=target=>ledger.filter(l=>l.reportId===target.id).length;
 const expectDatedFunds=async(start,date)=>{
  await expect.poll(()=>fundsQueries.length).toBeGreaterThan(start);
  assert.ok(fundsQueries.slice(start).every(q=>q.business==='farm'&&q.from===date&&q.to===date),'The payer list must use the original expense date at both ends');
 };
 sources=[];
 let reads=fundsQueries.length;
 await openReport(named);
 await category.selectOption('equipment');await funding.selectOption('bimbo_transfer');
 const firstNote='Approved the emergency pump repair from owner funds';
 await reason.fill(firstNote);await expectDatedFunds(reads,named.date);
 await expect(dialog.getByRole('button',{name:'Approve expense',exact:true})).toBeEnabled();
 assert.equal(await payer.locator('option[value]:not([value=""])').count(),0);
 await dialog.getByRole('button',{name:'Approve expense',exact:true}).click();
 await expect(entry(named).getByRole('button',{name:'Confirm funding and record expense'})).toBeVisible();
 assert.deepEqual(posts.at(-1).payload,{decision:'approve_awaiting_funding',category:'equipment',expense_source:'bimbo_transfer',reason:firstNote});
 assert.equal(countPostings(named),0);
 await page.goto(originalUrl+'/?supervisor');
 await expect(entry(named)).toContainText('Approved · payer to confirm');
 await expect(entry(named)).toContainText(/Owner funds/i);
 await expect(entry(named)).toContainText(firstNote);
 assert.equal(await entry(named).getByRole('button',{name:/approve|confirm funding/i}).count(),0);
 // Later, the actual NGN owner-funds payer becomes known.
 sources=[foreignPayer,salesPayer,ownerPayer];reads=fundsQueries.length;
 await openReport(named,true);
 await expect(category).toHaveValue('equipment');await expect(funding).toHaveValue('bimbo_transfer');
 const fundsLink=new URL(await dialog.getByRole('link',{name:'Open Farm Funds'}).getAttribute('href'),originalUrl);
 assert.equal(fundsLink.searchParams.get('period_id'),named.period_id);
 assert.equal(fundsLink.searchParams.get('to'),named.date);
 await expect(payer.locator('option[value="'+id+'"]')).toHaveCount(1);
 await expectDatedFunds(reads,named.date);
 assert.equal(await payer.locator('option[value="'+salesPayer.id+'"],option[value="'+foreignPayer.id+'"]').count(),0);
 await payer.selectOption(id);await reason.fill('Confirmed who paid on the date of the repair');
 missingAcknowledgement=named.id;
 await dialog.locator('button[type=submit]').click();
 await expect(entry(named)).toContainText('Expense recorded');
 const posted=posts.filter(p=>p.id===named.id&&p.payload.decision==='post').at(-1);
 assert.ok(posted);assert.equal(posted.payload.expense_source,'bimbo_transfer');assert.equal(posted.payload.cash_payer_account_id,id);
 assert.equal(countPostings(named),1);
 // Lose the first acknowledgement after the isolated server has applied it.
 // Reopening an expense form resumes the app's own saved queue.
 missingAcknowledgement=null;
 await page.getByRole('button',{name:'Report emergency expense',exact:true}).click();
 await page.waitForFunction(requestId=>Object.keys(localStorage).some(k=>k.startsWith('farm_confirmed_')&&k.endsWith(requestId)),posted.request_id);
 const repeated=posts.filter(p=>p.id===named.id&&p.payload.decision==='post');
 assert.ok(repeated.length>=2,'The lost acknowledgement must exercise a real retry');
 assert.equal(new Set(repeated.map(p=>p.request_id)).size,1);assert.equal(countPostings(named),1);
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto(originalUrl+'/?supervisor');await expect(entry(named)).toContainText('Expense recorded');
 // A stale owner payer from a saved draft cannot be posted across sources,
 // while its historical funds lookup is failing, or after the payer disappears.
 await openReport(stale);
 await category.selectOption('equipment');await funding.selectOption('bimbo_transfer');await payer.selectOption(id);
 await funding.selectOption('sales_cash');await expect(payer).toHaveValue('');
 await expect(payer.locator('option[value="'+salesPayer.id+'"]')).toHaveCount(1);
 await expect(payer.locator('option[value="'+id+'"]')).toHaveCount(0);
 await funding.selectOption('bimbo_transfer');await expect(payer).toHaveValue('');await payer.selectOption(id);
 await reason.fill('Confirmed the equipment repair');
 await page.waitForFunction(({id,reportId})=>Object.keys(localStorage).some(k=>k.startsWith('farm-purchase-draft:')&&k.endsWith(reportId)&&JSON.parse(localStorage.getItem(k)).payer===id),{id,reportId:stale.id});
 const beforeFailure=posts.length;
 fundsError=true;reads=fundsQueries.length;await openReport(stale);
 const retryLookup=dialog.getByRole('button',{name:/retry/i});
 await expect(retryLookup).toBeVisible();await expectDatedFunds(reads,stale.date);
 await expect(payer).toHaveCount(0);
 const unresolvedSubmit=dialog.locator('button[type=submit]');
 if(await unresolvedSubmit.isEnabled())await unresolvedSubmit.click();
 await expect(retryLookup).toBeVisible();
 assert.equal(posts.length,beforeFailure,'A saved payer cannot be posted while verification is unavailable');
 fundsError=false;wrongFundsDate=true;reads=fundsQueries.length;await retryLookup.click();await expectDatedFunds(reads,stale.date);
 await expect(retryLookup).toBeVisible();await expect(payer).toHaveCount(0);
 wrongFundsDate=false;sources=[];await retryLookup.click();
 await expect(dialog.getByText(/No payer is listed/i)).toBeVisible();
 await expect(payer).toHaveCount(0);
 const explicitlyDefer=dialog.getByRole('button',{name:'Confirm who paid later',exact:true});
 if(await explicitlyDefer.isVisible())await explicitlyDefer.click();
 await expect(dialog.getByRole('button',{name:'Approve expense',exact:true})).toBeEnabled();
 assert.equal(posts.length,beforeFailure);
 await dialog.getByRole('button',{name:'Approve expense',exact:true}).click();
 await expect(entry(stale)).toContainText('Approved · payer to confirm');
 assert.equal(posts.at(-1).payload.decision,'approve_awaiting_funding');assert.equal(posts.at(-1).payload.cash_payer_account_id,undefined);
 assert.equal(posts.at(-1).payload.expense_source,'bimbo_transfer');assert.equal(countPostings(stale),0);
 // Once a genuine payer is available, the first decision can post immediately.
 sources=[ownerPayer];await openReport(immediate);
 await category.selectOption('equipment');await funding.selectOption('bimbo_transfer');await reason.fill('Confirmed the original payment');
 await expect(payer.locator('option[value="'+id+'"]')).toHaveCount(1);
 await expect(payer).toHaveValue('');
 await payer.selectOption(id);await dialog.locator('button[type=submit]').click();
 await expect(entry(immediate)).toContainText('Expense recorded');
 assert.equal(countPostings(immediate),1);assert.equal(posts.at(-1).payload.decision,'post');
 assert.equal(posts.at(-1).payload.expense_source,'bimbo_transfer');assert.equal(posts.at(-1).payload.cash_payer_account_id,id);
 assert.equal([...decisions.values()].filter(p=>p.id===immediate.id).length,1);
 // A first-time approval is still possible during a payer-list outage.
 fundsError=true;await openReport(outage);
 await category.selectOption('equipment');await funding.selectOption('sales_cash');await reason.fill('Sales money reported during the outage');
 await expect(dialog.getByRole('alert')).toContainText(/payer list could not be loaded/i);
 const approveDuringOutage=dialog.getByRole('button',{name:'Approve expense',exact:true});
 await expect(approveDuringOutage).toBeEnabled();await approveDuringOutage.click();
 await expect(entry(outage)).toContainText('Approved · payer to confirm');
 assert.deepEqual(posts.at(-1).payload,{decision:'approve_awaiting_funding',category:'equipment',expense_source:'sales_cash',reason:'Sales money reported during the outage'});
 assert.equal(countPostings(outage),0);
 // One approved operational request follows the MD, buyer and receiving supervisor.
 showTask=true;fundsError=false;
 await page.goto(originalUrl);
 const handover=page.getByRole('article').filter({has:page.getByRole('heading',{name:task.description,exact:true})});
 await expect(handover).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Continue earlier purchase draft',exact:true})).toHaveCount(0);
 await handover.getByRole('button',{name:'Assign Sales and Procurement',exact:true}).click();
 await dialog.getByRole('combobox',{name:/Account for this request/}).selectOption(buyerPeriod);
 await dialog.getByRole('button',{name:'Assign Sales and Procurement',exact:true}).click();
 await expect(handover).toContainText('Buyer: Assigned buyer');
 assert.deepEqual(posts.at(-1).payload,{period_id:buyerPeriod,previous_id:null});assert.equal(posts.at(-1).id,taskId);
 await handover.getByRole('button',{name:'Record purchase',exact:true}).click();
 await expect(dialog.getByLabel('Actual supplier')).toHaveValue('Pond supplier');
 await expect(dialog.getByLabel(/Actual price per unit/)).toHaveAccessibleName(/Supervisors fish feed.*3 bags/);
 await expect(dialog.getByLabel('Item description',{exact:true})).toHaveCount(0);
 await expect(dialog.getByLabel('Quantity',{exact:true})).toHaveCount(0);
 await dialog.getByLabel(/Actual price per unit/).fill('30000');
 await dialog.getByRole('button',{name:'Record purchase',exact:true}).click();
 await expect(handover).toContainText('Purchased · awaiting delivery');
 assert.equal(posts.at(-1).operation,'procure');assert.equal(posts.at(-1).id,taskId);
 assert.deepEqual(posts.at(-1).payload.prices,['30000']);assert.equal(posts.at(-1).payload.lines,undefined);
 await page.goto(originalUrl+'/?buyer');
 await expect(handover.getByRole('button',{name:'Change buyer'})).toHaveCount(0);
 await handover.getByRole('button',{name:'Record items sent'}).click();
 await dialog.getByRole('combobox',{name:/Item/}).selectOption(lineId);
 await dialog.getByLabel('Quantity sent').fill('3');await dialog.getByRole('button',{name:'Record items sent'}).click();
 await expect(handover).toContainText('Sent · awaiting receipt');
 assert.equal(posts.at(-1).operation,'dispatch');assert.equal(posts.at(-1).id,taskId);
 await page.goto(originalUrl+'/?supervisor-deliveries');
 await expect(page.getByRole('heading',{name:'Purchased Item Confirmation / Deliveries'})).toBeVisible();
 await expect(handover.getByRole('button',{name:/Assign|Record purchase|Record items sent|Record actual payment/})).toHaveCount(0);
 await handover.getByRole('button',{name:'View delivery and confirm receipt'}).click();
 await expect(dialog).toContainText('Supervisors fish feed: 0 / 3 bags received');
 await dialog.getByRole('button',{name:'Confirm goods received',exact:true}).click();
 await dialog.getByLabel('Delivered item').selectOption(lineId);
 await dialog.getByLabel('Quantity physically received').fill('3');
 await dialog.getByLabel('Was this delivery already included in the recorded starting count?').selectOption('no');
 const deliveryPosts=()=>posts.filter(p=>p.operation==='confirm_delivery');
 const deliveredBy=dialog.getByRole('combobox',{name:/Delivered by/});
 await dialog.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await deliveredBy.evaluate(el=>el.validity.valueMissing),true);assert.equal(deliveryPosts().length,0);
 await deliveredBy.selectOption('sales_procurement');
 await dialog.getByRole('button',{name:'Save entry'}).click();
 await expect(dialog.getByRole('alert')).toContainText('Add a photo of the delivered goods');assert.equal(deliveryPosts().length,0);
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.getContext('2d').fillRect(0,0,8,8);return canvas.toDataURL('image/png').split(',')[1];});
 await dialog.getByLabel('Add a photo',{exact:true}).setInputFiles({name:'delivery.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(dialog.getByRole('img',{name:'Supporting photo 1',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Save entry'}).click();
 await expect(handover).toContainText('3 / 3 bags received');await expect(handover).toContainText('Delivered');
 assert.equal(deliveryPosts().length,1);assert.equal(deliveryPosts()[0].id,orderId);
 assert.equal(deliveryPosts()[0].payload.delivered_by,'sales_procurement');assert.equal(deliveryPosts()[0].payload.line_id,lineId);
 assert.deepEqual(deliveryPosts()[0].payload.evidence_ids,[evidenceId]);assert.equal(uploads.length,1);
 assert.equal(uploads[0].actor,supervisorActor);assert.equal(uploads[0].period,supervisorPeriod);
 assert.match(uploads[0].body,/farm_purchase_deliveries/);assert.equal(rows.find(row=>row.id===orderId).payments.length,0);
 await page.goto(originalUrl);await handover.getByRole('button',{name:'View delivery details'}).click();
 await expect(dialog).toContainText('Delivered by Sales and Procurement');
 await expect(dialog.getByRole('button',{name:'Confirm goods received'})).toHaveCount(0);
 assert.deepEqual(errors,[]);console.log('PASS purchase forms at 375/390/768/1440, historical drafts and emergency approvals, MD assignment and purchase, buyer dispatch, supervisor receipt with private photo, and MD delivery history.');
}catch(e){console.error(await page.locator('body').innerText(),errors);throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
