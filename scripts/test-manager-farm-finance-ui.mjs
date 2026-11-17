import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import os from 'node:os';import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test'),{build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js'))),id='00000000-0000-4000-8000-000000000088';
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import Expense from './app/(manager)/manager/expenses/[category]/page';import Sale from './app/(manager)/manager/sales/[product]/page';const root=createRoot(document.getElementById('root'));const render=()=>root.render(new URL(location.href).searchParams.has('sale')?<Sale/>:<Expense/>);window.switchSaleScope=(workspace)=>{window.saleWorkspace=workspace;render()};render();`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/^(next\/(navigation|link)|@\/contexts\/(AuthContext|ManagerPeriodContext))$/},a=>({path:a.path,namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='next/link'?`import React from 'react';export default function Link(p){return <a {...p}/>;}`:a.path==='next/navigation'?`export const useParams=()=>({category:'feed',product:window.saleWorkspace?.product||'catfish'});export const useRouter=()=>({push(p){window.returnDestination=p;},refresh(){}});export const usePathname=()=>'/manager/expenses/feed';`:a.path.endsWith('AuthContext')?`export const useAuth=()=>({profile:{id:'${id}',role:'manager'}});`:`export const useOperationsFeature=()=>({enabled:true,error:"",refresh(){}});export const useManagerFetch=()=>fetch;const scope=()=>({actorId:window.saleWorkspace?.actor||'${id}',business:'farm',periodId:window.saleWorkspace?.period||'${id}',managerId:window.saleWorkspace?.manager,mode:window.saleWorkspace?.mode||'personal',status:'active',featureEnabled:true});export const useManagerPeriod=scope;export const useQueueIdentity=()=>({...scope(),periodId:scope().mode==='legacy'?'legacy':scope().periodId});export const useManagerStorageKey=base=>base?base+':period:'+useQueueIdentity().periodId:null;`,loader:'jsx',resolveDir:process.cwd()}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),page=await browser.newPage();let checks=0,fail=true,creditDays=7,closedDate='';const calls=[],receipts=new Map();
page.on('pageerror',e=>console.error('Browser error:',e.message));
await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());if(req.method()==='GET')return route.fulfill({json:url.pathname.includes('operations/funds')?{accounts:[],sources:[],receipts:[],pending_expenses:[],ceo_receivers:[{id,name:'Bimbo'}],history:[]}:url.pathname.endsWith('/credit')?{customers:[{id,name:'Actual customer',phone:null,credit_days:creditDays}],invoices:[{customer_id:id,number:'PF-OLDER',owed:'50000.00'}],receipts:[],refunds:[],credit_notes:[],summary:{}}:url.pathname.endsWith('/batch-records')?{batches:[],records:[]}:url.pathname.includes('daily-record')?{record:{status:url.searchParams.get('date')===closedDate?'closed':'open'}}:{data:[],total:0}});const body=req.postDataJSON(),retry=req.headers()['x-request-id']||body[0]?.request_id;calls.push({body,retry,url:url.pathname});if(!receipts.has(retry))receipts.set(retry,url.pathname.endsWith('feed-purchases')?{status:202,json:{status:'pending_funding',id,currency:'NGN',shortfall:'0.30',amount:'0.30'}}:{status:201,json:{data:[{id,total_amount:216000}]}});if(fail){fail=false;return route.abort('failed');}return route.fulfill(receipts.get(retry));});
try{
 fail=false;
 for(const [width,base] of [[375,''],[1440,'/dashboard/farm']]){
  await page.setViewportSize({width,height:850});
  await page.goto(origin+base+'/sales/catfish?sale=yes&payment=credit&customer_id='+id+'&period_id='+id);
  await page.getByRole('radio',{name:'On credit or part paid'}).waitFor();
  assert.equal(await page.getByRole('radio',{name:'On credit or part paid'}).isChecked(),true);
  assert.equal(await page.getByRole('combobox',{name:/Customer/}).inputValue(),id);
  const paid=page.getByLabel('Amount received now',{exact:true});assert.equal(await paid.inputValue(),'0');
  await page.locator('#sale-quantity').fill('10');await page.locator('#sale-weight').fill('10');await page.locator('#sale-price').fill('100');
  const balance=page.getByText('Customer balance after this sale',{exact:false});await balance.getByText('NGN 51,000.00',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Who actually received the money?',{exact:true}).count(),0);
  await paid.fill('400');await balance.getByText('NGN 50,600.00',{exact:true}).waitFor();
  await page.getByLabel('Who actually received the money?',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Enter unpaid amount instead'}).click();
  const owing=page.getByLabel('Unpaid amount from this sale',{exact:true});
  assert.equal(Number(await owing.inputValue()),600);
  await page.reload();await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="Unpaid amount from this sale"]')?.value)===600);
  await page.locator('#sale-weight').fill('3.5');await page.locator('#sale-price').fill('100.01');
  const before=calls.length;
  for(const invalid of ['0','350.05']){
   await owing.fill(invalid);await page.getByRole('button',{name:/Save Sale/}).click();
   assert.equal(await page.getByRole('dialog').count(),0);assert.equal(calls.length,before);
  }
  const allUnpaid=width===375,owed=allUnpaid?'350.04':'150.01';
  await owing.fill(owed);await balance.getByText(allUnpaid?'NGN 50,350.04':'NGN 50,150.01',{exact:true}).waitFor();
  await page.getByText('Amount paid now').getByText(allUnpaid?'NGN 0.00':'NGN 200.03',{exact:true}).waitFor();
  const holder=page.getByLabel('Who actually received the money?',{exact:true});
  if(allUnpaid)assert.equal(await holder.count(),0);
  else await holder.selectOption('farm:primefield_account');
  await page.getByRole('button',{name:/Save Sale/}).click();
  const confirm=page.getByRole('dialog');await confirm.getByText('Unpaid amount from this sale',{exact:true}).waitFor();
  await confirm.getByRole('button',{name:'Confirm Save',exact:true}).click();await page.getByText('1 sale recorded',{exact:true}).waitFor();
  assert.equal(calls.length,before+1);assert.equal(calls.at(-1).url,'/api/farm/sales');const posted=calls.at(-1).body[0];
  assert.equal(posted.amount_received,allUnpaid?'0.00':'200.03');assert.equal(posted.credit,true);assert.equal(posted.customer_id,id);
  assert.equal(Object.hasOwn(posted,'amount_owing'),false);assert.equal(Object.hasOwn(posted,'payment_date'),!allUnpaid);
  if(allUnpaid)assert.equal(Object.hasOwn(posted,'cash_receiver'),false);
  else assert.deepEqual(posted.cash_receiver,{type:'farm_destination',destination:'primefield_account'});
  await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.returnDestination),base+'/credit?period_id='+id);checks+=19;
 }
 calls.length=0;receipts.clear();fail=true;
 await page.goto(origin);await page.locator('input[type=number]').nth(0).fill('3');await page.locator('input[type=number]').nth(1).fill('0.10');await page.getByRole('button',{name:'Save to Record',exact:true}).click();await page.getByRole('button',{name:'Retry saved expense',exact:true}).waitFor({timeout:3000});checks++;
 await page.reload();await page.getByRole('button',{name:'Retry saved expense',exact:true}).waitFor();assert.equal(await page.locator('input[type=number]').nth(0).inputValue(),'3');assert.equal(await page.locator('input[type=number]').nth(1).inputValue(),'0.10');await page.getByRole('button',{name:'Retry saved expense',exact:true}).click();await page.getByText('Saved for the MD/Owner to confirm funding.',{exact:true}).waitFor();assert.equal(calls[0].retry,calls[1].retry);assert.equal(calls[0].body[0].cost,0.3);assert.equal(calls[0].body[0].delivery_received,false);assert.equal(await page.getByText(/expense.*recorded/).count(),0);assert.equal(await page.locator('input[type=number]').nth(0).inputValue(),'');checks+=7;
 await page.goto(origin+'/?sale=yes');await page.getByRole('combobox',{name:/Customer/}).selectOption(id);await page.getByLabel('No. of Fish *',{exact:true}).fill('40');await page.locator('input[type=number]').nth(1).fill('72');await page.locator('input[type=number]').nth(2).fill('3000');await page.getByLabel('Who actually received the money?',{exact:true}).selectOption('farm:sales_and_procurement');await page.getByRole('button',{name:/Save Sale/}).click();
 const dialog=page.getByRole('dialog');await dialog.getByText('Actual customer',{exact:true}).waitFor();assert.match(await dialog.getByText('Amount received with this sale').locator('..').innerText(),/216,000/);assert.equal(await dialog.getByText('Balance to collect',{exact:true}).count(),0);assert.equal(await dialog.getByText('Paid in full',{exact:true}).count(),0);assert.match(await dialog.innerText(),/oldest unpaid invoices first/);checks+=5;
 await dialog.getByRole('button',{name:'Confirm Save',exact:true}).click();await page.getByText('1 sale recorded',{exact:true}).waitFor();const sale=calls.at(-1);assert.deepEqual(sale.body[0].cash_receiver,{type:'farm_destination',destination:'sales_and_procurement'});assert.equal(sale.body[0].quantity,40);assert.equal(sale.body[0].weight_kg,72);assert.ok(sale.retry);checks+=4;
 creditDays=null;
 const requestId='00000000-0000-4000-8000-000000000099',creditRequests=[];
 let sentRequest;
 await page.route('**/api/farm/operational-requests**',async route=>{
  const req=route.request();
  if(req.method()==='GET')return route.fulfill({json:{data:sentRequest?[sentRequest]:[],total:sentRequest?1:0}});
  const payload=req.postDataJSON();
  creditRequests.push({key:req.headers()['x-request-id'],payload});
  sentRequest={...payload,id:requestId,requested_by:id,status:'pending',revision:0};
  if(creditRequests.length===1)return route.abort('failed');
  return route.fulfill({status:201,json:{data:sentRequest}});
 });
 const saleCount=()=>calls.filter(c=>c.url==='/api/farm/sales').length;
 await page.reload();
 await page.getByLabel('No. of Fish *',{exact:true}).fill('10');
 await page.locator('#sale-weight').fill('10');
 await page.locator('#sale-price').fill('2500');
 const dated='2026-11-11';
 await page.locator('input[type=date]').first().fill(dated);
 await page.getByRole('combobox',{name:/Customer/}).selectOption(id);
 const creditOption=page.getByRole('radio',{name:'On credit or part paid'});
 await creditOption.check();
 assert.equal(await page.getByLabel('Amount received now',{exact:true}).inputValue(),'0');
 assert.equal(await page.getByLabel('Who actually received the money?',{exact:true}).count(),0);
 assert.equal(creditRequests.length,0);
 const before=saleCount();
 await page.getByLabel('Amount received now',{exact:true}).fill('5000');
 await page.getByLabel('Who actually received the money?',{exact:true}).selectOption('farm:sales_and_procurement');
 await page.getByLabel('Payment date',{exact:true}).fill(dated);
 await page.getByLabel('Notes',{exact:false}).fill('Retain recorded sale details');
 const save=page.getByRole('button',{name:'Save Sale',exact:true});
 assert.equal(await save.isDisabled(),true);
 await page.getByRole('button',{name:'Request credit terms'}).click();
 await page.getByRole('alert').filter({hasText:'request could not be sent'}).waitFor();
 await page.reload();await page.getByRole('radio',{name:'On credit or part paid'}).waitFor();
 assert.equal(await creditOption.isChecked(),true);
 assert.equal(await page.locator('#sale-price').inputValue(),'2500');
 assert.equal(await page.locator('#sale-weight').inputValue(),'10');
 assert.equal(await page.getByLabel('Amount received now',{exact:true}).inputValue(),'5000');
 assert.equal(await page.getByLabel('Who actually received the money?',{exact:true}).inputValue(),'farm:sales_and_procurement');
 assert.equal(await page.getByLabel('Payment date',{exact:true}).inputValue(),dated);
 assert.equal(await page.locator('#sale-notes').inputValue(),'Retain recorded sale details');
 // React navigation can reuse the same route component for another product or responsibility.
 for(const workspace of [{product:'goat'},{actor:'00000000-0000-4000-8000-000000000019'},{period:'00000000-0000-4000-8000-000000000020'}]){
  await page.evaluate(next=>window.switchSaleScope(next),workspace);
  await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='');
  assert.equal(await page.locator('#sale-notes').inputValue(),'');
  await page.evaluate(()=>window.switchSaleScope(null));
  await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='10');
  assert.equal(await creditOption.isChecked(),true);
  assert.equal(await page.locator('#sale-notes').inputValue(),'Retain recorded sale details');
 }
 await page.getByRole('button',{name:'Request credit terms'}).click();
 await page.getByText(/Awaiting the MD\/Owner/).waitFor();assert.equal(saleCount(),before);
 assert.deepEqual(creditRequests[0],creditRequests[1]);
 assert.equal(creditRequests[0].payload.request_details.credit_customer_id,id);
 await page.reload();await page.getByRole('button',{name:'Check approval'}).waitFor();
 closedDate=dated;await page.reload();await page.getByText('Day is Closed').waitFor();assert.equal(saleCount(),before);
 closedDate='';await page.reload();await page.getByRole('button',{name:'Check approval'}).waitFor();
 creditDays=14;
 await page.getByRole('button',{name:'Check approval'}).click();
 await page.getByText('Approved payment terms: 14 days.').waitFor();
 await save.click();
 await page.getByRole('dialog').getByRole('button',{name:'Confirm Save'}).click();
 await page.getByText('1 sale recorded',{exact:true}).waitFor();
 const posted=calls.filter(c=>c.url==='/api/farm/sales').at(-1).body[0];
 assert.equal(saleCount(),before+1);assert.equal(posted.credit,true);assert.equal(posted.amount_received,'5000');
 assert.deepEqual(posted.cash_receiver,{type:'farm_destination',destination:'sales_and_procurement'});assert.equal(posted.quantity,10);assert.equal(posted.weight_kg,10);
 assert.equal(posted.date,dated);assert.equal(posted.payment_date,dated);
 await page.reload();assert.equal(await page.locator('#sale-price').inputValue(),'');checks+=18;
 // A previous version saved personal recipient IDs. A fresh submission needs a new
 // choice, while a request already sent must retry the exact original payload.
 await page.getByRole('combobox',{name:/Customer/}).selectOption(id);
 await page.locator('#sale-quantity').fill('2');await page.locator('#sale-weight').fill('2');
 await page.locator('#sale-price').fill('100');await page.locator('#sale-notes').fill('Earlier draft');
 const editableKey='farm-sale-draft:'+id+':catfish:period:'+id;
 await page.waitForFunction(key=>localStorage.getItem(key)?.includes('Earlier draft'),editableKey);
 const legacyDraft=await page.evaluate(({key,id})=>{
  const saved=JSON.parse(localStorage.getItem(key));saved.draft.receiver='ceo:'+id;
  localStorage.setItem(key,JSON.stringify(saved));return saved;
 },{key:editableKey,id});
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#sale-notes')?.value==='Earlier draft');
 const receiver=page.getByLabel('Who actually received the money?',{exact:true});
 assert.equal(await receiver.inputValue(),'');
 const beforeLegacy=saleCount();await page.getByRole('button',{name:'Save Sale',exact:true}).click();
 assert.equal(await page.getByRole('dialog').count(),0);assert.equal(saleCount(),beforeLegacy);
 const priorBody=[{date:legacyDraft.draft.form.date,product:'catfish',pricing_basis:'per_kg',quantity:2,weight_kg:2,unit_price:100,
  customer_id:id,credit:false,payment_method:'cash',cash_receiver:{type:'ceo',profile_id:id},request_id:legacyDraft.requestId}];
 await page.evaluate(({draft,id,body})=>localStorage.setItem('farm-financial:'+id+':sale:catfish:period:'+id,
   JSON.stringify({id:draft.requestId,actorId:id,periodId:id,url:'/api/farm/sales',body,draft:draft.draft})),{draft:legacyDraft,id,body:priorBody});
 await page.reload();const retry=page.getByRole('button',{name:'Retry saved sale',exact:true});await retry.waitFor();
 assert.equal(await receiver.locator('option:checked').innerText(),'Previously saved recipient');
 await retry.click();await page.getByText('1 sale recorded',{exact:true}).waitFor();
 assert.deepEqual(calls.at(-1).body,priorBody);assert.equal(calls.at(-1).retry,legacyDraft.requestId);
 assert.equal(saleCount(),beforeLegacy+1);checks+=6;
 // Eggs and custom produce share an accounting product code but have separate editable drafts.
 await page.evaluate(()=>window.switchSaleScope({product:'eggs'}));
 await page.locator('#sale-quantity').fill('7');await page.locator('#sale-notes').fill('Egg draft');
 await page.evaluate(()=>window.switchSaleScope({product:'other'}));
 await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='');
 await page.locator('#sale-quantity').fill('3');await page.locator('#sale-notes').fill('Custom produce draft');
 await page.evaluate(()=>window.switchSaleScope({product:'eggs'}));
 await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='7');
 assert.equal(await page.locator('#sale-notes').inputValue(),'Egg draft');
 await page.evaluate(()=>window.switchSaleScope({product:'other'}));
 await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='3');
 assert.equal(await page.locator('#sale-notes').inputValue(),'Custom produce draft');checks+=2;
 // Two historical manager periods share the old queue identity. The MD edits and
 // retries only the sale belonging to the historical period currently on screen.
 const oldA='00000000-0000-4000-8000-000000000123',oldB='00000000-0000-4000-8000-000000000124';
 const historical={mode:'legacy',actor:id,manager:oldA,product:'catfish'};
 await page.evaluate(work=>window.switchSaleScope(work),{...historical,period:oldA});
 await page.getByRole('combobox',{name:/Customer/}).selectOption(id);
 await page.locator('#sale-quantity').fill('2');await page.locator('#sale-weight').fill('3');await page.locator('#sale-price').fill('15');
 await page.getByLabel('Who actually received the money?',{exact:true}).selectOption('farm:primefield_account');
 fail=true;await page.getByRole('button',{name:/Save Sale/}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Confirm Save'}).click();await page.getByRole('button',{name:'Retry saved sale'}).waitFor();
 const fromA=structuredClone(calls.at(-1));
 await page.evaluate(work=>window.switchSaleScope(work),{...historical,period:oldB});
 await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='');
 assert.equal(await page.getByRole('button',{name:'Retry saved sale'}).count(),0);
 await page.locator('#sale-quantity').fill('9');await page.locator('#sale-notes').fill('Separate historical period');
 await page.evaluate(work=>window.switchSaleScope(work),{...historical,period:oldA});
 await page.getByRole('button',{name:'Retry saved sale'}).click();await page.getByText('1 sale recorded',{exact:true}).waitFor();
 assert.deepEqual(calls.at(-1),fromA);
 await page.evaluate(work=>window.switchSaleScope(work),{...historical,period:oldB});
 await page.waitForFunction(()=>document.querySelector('#sale-quantity')?.value==='9');
 assert.equal(await page.locator('#sale-notes').inputValue(),'Separate historical period');checks+=4;
 console.log('PASS '+checks+' actual Farm entry UI checks: restored expense draft/UUID, exact per-bag total, payment-only delivery, truthful202 state, no duplicate pending entry and real sale recipient');
}finally{await browser.close();await new Promise(r=>server.close(r));}
