import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium,expect}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const owner='30000000-0000-4000-8000-000000000001';
const customer='30000000-0000-4000-8000-000000000002';
const current='30000000-0000-4000-8000-000000000003';
const earlier='30000000-0000-4000-8000-000000000004';
const day='2026-11-12';
const credit={customers:[{id:customer,name:'Customer',credit_days:14}],invoices:[],receipts:[],credit_notes:[],refunds:[],summary:{}};
const scopeSource=[
  "const mode=new URLSearchParams(location.search).get('mode');",
  "const scope={business:'farm',actorId:"+JSON.stringify(owner)+",mode:mode==='all'?'admin_all':'personal',status:'active',",
  "periodId:mode==='all'?null:"+JSON.stringify(current)+",startsOn:mode==='all'?null:'2026-11-03'};",
  "const identity={actorId:scope.actorId,business:'farm',periodId:scope.periodId||'admin'};",
  "window.selectTestPeriod=id=>{scope.periodId=id;scope.mode='personal';scope.startsOn='2026-11-03';window.renderFixture()};",
  "export const useManagerPeriod=()=>scope;export const useQueueIdentity=()=>identity;",
  "export const useManagerFetch=()=>fetch;export const useOperationsFeature=()=>({enabled:true});",
  "export const useManagerStorageKey=k=>k;",
].join('');
const mocks={
  'next/link':"import React from 'react';export default function Link(p){return <a {...p}/>;}",
  'next/navigation':"export const useRouter=()=>({push(){}});export const usePathname=()=>location.pathname;export const useParams=()=>({product:'goat'});",
  '@/contexts/AuthContext':"const role=new URLSearchParams(location.search).get('mode')==='manager'?'manager':'admin';export const useAuth=()=>({profile:{id:"+JSON.stringify(owner)+",role}});",
  '@/contexts/ManagerPeriodContext':scopeSource,
  '@/hooks/useOfflineSync':"export const useOfflineSync=()=>({isSyncing:false,submitOrQueue:async(endpoint,body)=>{window.saved.push({endpoint,body});return {success:true}}});",
};
const fixture=[
  "import React from 'react';import {createRoot} from 'react-dom/client';",
  "import {CreditForm} from './components/manager/FarmCredit';",
  "import {FarmAdminCorrection} from './components/dashboard/farm/FarmActivityPanel';",
  "import SaleProductPage from './app/(manager)/manager/sales/[product]/page';",
  "window.saved=[];const credit="+JSON.stringify(credit)+";",
  "const sale={id:"+JSON.stringify(customer)+",revision:0,date:'2026-11-12',product:'goat',pricing_basis:'per_head',unit_price:100,quantity:1};",
  "const root=createRoot(document.getElementById('root'));window.renderFixture=()=>root.render(location.pathname==='/correction'?",
  "<FarmAdminCorrection recordType='sale' record={sale}/>:location.pathname==='/sale'?<SaleProductPage/>:<CreditForm operation='receipt' data={credit} onSaved={()=>{}}/>);window.renderFixture();",
].join('');
const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-session',setup(builder){
  builder.onResolve({filter:/^(next\/|@\/)/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'fixture'}:null);
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:process.cwd()}));
}}]});
const server=createServer((request,response)=>{
  if(request.url==='/bundle.js'){response.setHeader('Content-Type','text/javascript');response.end(bundle.outputFiles[0].text);}
  else {response.setHeader('Content-Type','text/html');response.end('<meta name="viewport" content="width=device-width,initial-scale=1"><main id="root"></main><script src="/bundle.js"></script>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
const labels=['Primefield Account','Sales and Procurement','Farm Supervisor'];
try {
  for(const width of [375,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[],corrections=[],sales=[],dateReads=[];
    let heldRoster, failingDate='', offlineRoster=false;
    function holdRoster(date){
      let release;
      const wait=new Promise(resolve=>{release=resolve;});
      heldRoster={date,wait};
      const requested=page.waitForRequest(request=>{
        const url=new URL(request.url());
        return url.pathname==='/api/operations/funds'&&url.searchParams.get('to')===date;
      });
      return {requested,release(){heldRoster=null;release();}};
    }
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url()),date=url.searchParams.get('to');
      if(url.pathname==='/api/operations/funds'){
        if(date)dateReads.push(date);
        if(date&&heldRoster?.date===date)await heldRoster.wait;
        if(date&&(date===failingDate||offlineRoster)){
          return route.fulfill({status:503,json:{error:'Test connection unavailable'}});
        }
        const supervisors=date===day?[{period_id:current,name:'Current supervisor'},{period_id:earlier,name:'Other supervisor'}]:
          ['2026-11-01','2026-11-08'].includes(date)?[{period_id:earlier,name:'Earlier supervisor'}]:[];
        return route.fulfill({json:{business:'farm',from:date,to:date,periodId:null,accounts:[],sources:[],
          manager_receivers:[{period_id:current,name:'Current supervisor'}],ceo_receivers:[{id:owner,name:'Temporary CEO Test'},{id:customer,name:'CEO'}],
          farm_supervisor_receivers:supervisors}});
      }
      if(url.pathname==='/api/farm/credit')return route.fulfill({json:credit});
      if(url.pathname==='/api/farm/batch-records')return route.fulfill({json:{batches:[],records:[]}});
      if(url.pathname==='/api/farm/sales'&&request.method()==='POST'){
        sales.push(request.postDataJSON()[0]);return route.fulfill({json:{data:[{id:customer,total_amount:100}]}});
      }
      if(url.pathname==='/api/farm/corrections/admin'&&request.method()==='POST'){
        corrections.push(request.postDataJSON());return route.fulfill({json:{id:customer}});
      }
      return route.fulfill({json:{data:[]}});
    });
    const recipient=page.getByLabel('Who actually received the money?',{exact:true});
    const supervisor=page.getByLabel('Which farm supervisor received it?');
    const submit=page.getByRole('button',{name:'Save entry',exact:true});
    async function receipt(mode,date=day){
      await page.goto(origin+'/receipt?mode='+mode);
      await page.getByLabel('Payment date',{exact:true}).fill(date);
      await page.getByLabel('Customer',{exact:true}).selectOption(customer);
      await page.getByLabel('Amount paid (NGN)',{exact:true}).fill('100');
      await expect(recipient).toHaveValue('');
      assert.deepEqual(await recipient.locator('option:not([value=""])').allTextContents(),labels);
    }
    async function posted(expected,date){
      await submit.click();await page.waitForFunction(()=>window.saved.length===1);
      const saved=await page.evaluate(()=>window.saved[0]);
      assert.equal(saved.endpoint,'/api/farm/credit');assert.equal(saved.body.payload.amount,'100');
      assert.deepEqual(saved.body.payload.cash_receiver,expected);
      if(date)assert.equal(saved.body.payload.date,date);
      await page.evaluate(()=>localStorage.clear());
    }
    async function attemptSubmit(){await submit.evaluate(button=>button.form.requestSubmit());}
    await receipt('all');await submit.click();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await recipient.selectOption({label:labels[0]});await posted({type:'farm_destination',destination:'primefield_account'});
    await receipt('manager');await recipient.selectOption({label:labels[1]});await posted({type:'farm_destination',destination:'sales_and_procurement'});
    for(const role of ['manager','scoped-owner']){
      await receipt(role);await recipient.selectOption({label:labels[2]});
      assert.equal(await supervisor.count(),0);await posted({type:'farm_supervisor',period_id:current});
    }
    await receipt('all');await recipient.selectOption({label:labels[2]});await expect(supervisor).toBeVisible();
    await attemptSubmit();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await supervisor.selectOption({label:'Other supervisor'});await posted({type:'farm_supervisor',period_id:earlier});
    await receipt('all');await recipient.selectOption({label:labels[2]});await supervisor.selectOption({label:'Other supervisor'});
    await page.getByLabel('Payment date',{exact:true}).fill('2026-11-01');
    await page.waitForFunction(id=>Object.entries(localStorage).some(([key,value])=>{
      if(!key.startsWith('farm-credit-draft:')||key.endsWith(':photos'))return false;
      const draft=JSON.parse(value);return draft.date==='2026-11-01'&&draft.receiver==='farm_supervisor:'+id;
    }),earlier);
    await posted({type:'farm_supervisor',period_id:earlier});
    await receipt('all');await recipient.selectOption({label:labels[2]});await supervisor.selectOption({label:'Other supervisor'});
    offlineRoster=true;await page.reload();
    await expect(page.getByRole('alert').filter({hasText:'supervisor list'})).toBeVisible();
    await posted({type:'farm_supervisor',period_id:earlier});offlineRoster=false;
    await receipt('all');await recipient.selectOption({label:labels[2]});await supervisor.selectOption({label:'Other supervisor'});
    await page.evaluate(id=>window.selectTestPeriod(id),current);
    await expect(recipient).toHaveValue('');await submit.click();
    assert.equal(await page.evaluate(()=>window.saved.length),0,'An earlier scope cannot supply the recipient');
    await recipient.selectOption({label:labels[1]});await posted({type:'farm_destination',destination:'sales_and_procurement'});
    await receipt('all','2026-11-01');await recipient.selectOption({label:labels[2]});
    await page.waitForFunction(id=>Object.entries(localStorage).some(([k,v])=>k.startsWith('farm-credit-draft:')&&v.includes('farm_supervisor:'+id)),earlier);
    await page.getByLabel('Payment date',{exact:true}).fill('2026-11-02');
    await expect(recipient).toHaveValue('');
    await recipient.selectOption({label:labels[2]});
    await expect(page.getByRole('status').filter({hasText:'who was assigned'})).toBeVisible();
    await attemptSubmit();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await recipient.selectOption('');
    const successfulCheck=holdRoster('2026-11-01');
    try{
      await page.getByLabel('Payment date',{exact:true}).fill('2026-11-01');await recipient.selectOption({label:labels[2]});
      await successfulCheck.requested;
      await expect(submit).toBeDisabled({timeout:1500});
      await expect(page.getByRole('status').filter({hasText:'Checking supervisor for this date'})).toBeVisible();
      await attemptSubmit();
      assert.equal(await page.evaluate(()=>window.saved.length),0);
      await expect(page.getByRole('alert').filter({hasText:'Choose who received the payment'})).toHaveCount(0);
    }finally{successfulCheck.release();}
    await expect(submit).toBeEnabled();
    await posted({type:'farm_supervisor',period_id:earlier},'2026-11-01');
    await receipt('all');await recipient.selectOption({label:labels[2]});
    await supervisor.selectOption({label:'Other supervisor'});
    failingDate='2026-11-08';
    const failedCheck=holdRoster(failingDate);
    try{
      await page.getByLabel('Payment date',{exact:true}).fill(failingDate);
      await failedCheck.requested;
      await expect(submit).toBeDisabled();
      await attemptSubmit();
      assert.equal(await page.evaluate(()=>window.saved.length),0,'A supervisor selected for the previous date cannot be queued during the new lookup');
    }finally{failedCheck.release();}
    const retry=page.getByRole('alert').filter({hasText:'supervisor list'}).getByRole('button',{name:'Retry',exact:true});
    await expect(retry).toBeVisible();
    await expect(submit).toBeDisabled();
    failingDate='';
    await retry.click();
    await expect(submit).toBeEnabled();
    await posted({type:'farm_supervisor',period_id:earlier},'2026-11-08');

    await receipt('all','2026-11-01');
    const alternateCheck=holdRoster('2026-11-01');
    try{
      await recipient.selectOption({label:labels[2]});
      await alternateCheck.requested;
      await expect(submit).toBeDisabled();
      await recipient.selectOption({label:labels[0]});
      await posted({type:'farm_destination',destination:'primefield_account'},'2026-11-01');
    }finally{alternateCheck.release();}

    await page.goto(origin+'/correction?mode=all');
    await page.getByRole('button',{name:'Correct',exact:true}).click();
    await expect(recipient.locator('option:checked')).toHaveText('Keep the recorded recipient');
    assert.deepEqual(await recipient.locator('option:not([value=""])').allTextContents(),labels);
    await page.getByLabel('Reason',{exact:true}).fill('Corrected sale details');
    await page.getByRole('button',{name:'Save correction'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(corrections.length,1);assert.equal(corrections[0].changes.cash_receiver,undefined);
    await page.getByRole('button',{name:'Correct',exact:true}).click();
    await page.getByLabel('Reason',{exact:true}).fill('Confirmed who received this payment');
    const correctionCheck=holdRoster(day);
    const saveCorrection=page.getByRole('button',{name:'Save correction'});
    try{
      await recipient.selectOption({label:labels[2]});
      await correctionCheck.requested;
      await expect(saveCorrection).toBeDisabled();
      assert.equal(corrections.length,1);
      await recipient.selectOption({label:labels[1]});
      await saveCorrection.click();await expect(page.getByRole('dialog')).toHaveCount(0);
    }finally{correctionCheck.release();}
    assert.equal(corrections.length,2);
    assert.deepEqual(corrections[1].changes.cash_receiver,{type:'farm_destination',destination:'sales_and_procurement'});

    const saleDate=page.getByLabel('Date',{exact:true});
    const paymentDate=page.getByLabel('Payment date',{exact:true});
    const onCredit=page.getByRole('radio',{name:'On credit or part paid'});
    const paidNow=page.getByLabel('Amount received now',{exact:true});
    const saveSale=page.getByRole('button',{name:'Save Sale',exact:true});
    async function prepareSale(date){
      await page.goto(origin+'/sale?mode=all');
      await saleDate.fill(date);
      await page.getByLabel('No. of Goats').fill('1');
      await page.getByLabel('Price per Goat').fill('100');
      await page.getByRole('combobox',{name:/Customer/}).selectOption(customer);
    }
    async function postSale(){
      await saveSale.click();await page.getByRole('button',{name:'Confirm Save',exact:true}).click();
      await expect(page.getByText('1 sale recorded')).toBeVisible();
    }

    await prepareSale('2026-11-01');
    const saleCheck=holdRoster('2026-11-01');
    try{
      await recipient.selectOption({label:labels[2]});
      await saleCheck.requested;
      await expect(saveSale).toBeDisabled();
      assert.equal(sales.length,0);
      await onCredit.check();
      await expect(saveSale).toBeEnabled();
      await postSale();
    }finally{saleCheck.release();}
    assert.equal(sales.length,1);
    assert.equal(sales[0].amount_received,'0');
    assert.equal(sales[0].cash_receiver,undefined);

    await prepareSale(day);
    await recipient.selectOption({label:labels[2]});
    await supervisor.selectOption({label:'Current supervisor'});
    await onCredit.check();
    await expect(recipient).toHaveCount(0);
    await saleDate.fill('2026-11-01');
    const changedDate=holdRoster('2026-11-01');
    try{
      await paidNow.fill('25');
      await changedDate.requested;
      await expect(saveSale).toBeDisabled({timeout:1500});
      await expect(page.getByRole('status').filter({hasText:'Checking supervisor for this date'})).toBeVisible();
      assert.equal(sales.length,1,'A supervisor verified for the former payment date cannot receive this deposit');
    }finally{changedDate.release();}
    await expect(recipient).toHaveValue('');
    await expect(paidNow).toHaveValue('25');
    await recipient.selectOption({label:labels[2]});
    await expect(saveSale).toBeEnabled();
    await postSale();
    assert.equal(sales[1].amount_received,'25');
    assert.equal(sales[1].payment_date,'2026-11-01');
    assert.deepEqual(sales[1].cash_receiver,{type:'farm_supervisor',period_id:earlier});

    await prepareSale('2026-11-01');
    await paymentDate.fill(day);
    await recipient.selectOption({label:labels[2]});
    await supervisor.selectOption({label:'Current supervisor'});
    await onCredit.check();
    await saleDate.fill('2026-11-02');
    const unchangedPaymentDate=holdRoster(day);
    try{
      await paidNow.fill('25');
      await unchangedPaymentDate.requested;
      await expect(paymentDate).toHaveValue(day);
      await expect(saveSale).toBeEnabled();
      await postSale();
    }finally{unchangedPaymentDate.release();}
    assert.equal(sales[2].date,'2026-11-02');
    assert.equal(sales[2].amount_received,'25');
    assert.equal(sales[2].payment_date,day);
    assert.deepEqual(sales[2].cash_receiver,{type:'farm_supervisor',period_id:current});
    assert.ok(dateReads.includes(day)&&dateReads.includes('2026-11-01'));
    assert.deepEqual(errors,[]);await page.close();
    console.log('PASS farm recipient choices, submissions, dated supervisor selection and corrections at '+width+'px');
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
