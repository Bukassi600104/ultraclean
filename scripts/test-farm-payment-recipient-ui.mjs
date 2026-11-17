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
  'next/navigation':"export const useRouter=()=>({push(){}});export const usePathname=()=>location.pathname;",
  '@/contexts/AuthContext':"const role=new URLSearchParams(location.search).get('mode')==='manager'?'manager':'admin';export const useAuth=()=>({profile:{id:"+JSON.stringify(owner)+",role}});",
  '@/contexts/ManagerPeriodContext':scopeSource,
  '@/hooks/useOfflineSync':"export const useOfflineSync=()=>({isSyncing:false,submitOrQueue:async(endpoint,body)=>{window.saved.push({endpoint,body});return {success:true}}});",
};
const fixture=[
  "import React from 'react';import {createRoot} from 'react-dom/client';",
  "import {CreditForm} from './components/manager/FarmCredit';",
  "import {FarmAdminCorrection} from './components/dashboard/farm/FarmActivityPanel';",
  "window.saved=[];const credit="+JSON.stringify(credit)+";",
  "const sale={id:"+JSON.stringify(customer)+",revision:0,date:'2026-11-12',product:'goat',pricing_basis:'per_head',unit_price:100,quantity:1};",
  "const root=createRoot(document.getElementById('root'));window.renderFixture=()=>root.render(location.pathname==='/correction'?",
  "<FarmAdminCorrection recordType='sale' record={sale}/>:<CreditForm operation='receipt' data={credit} onSaved={()=>{}}/>);window.renderFixture();",
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
    const errors=[],corrections=[],dateReads=[];
    let delayedRoster, offlineRoster=false;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url()),date=url.searchParams.get('to');
      if(url.pathname==='/api/operations/funds'){
        if(date)dateReads.push(date);
        if(date==='2026-11-08'||(date&&offlineRoster)){
          if(delayedRoster)await delayedRoster;
          return route.fulfill({status:503,json:{error:'Test connection unavailable'}});
        }
        const supervisors=date===day?[{period_id:current,name:'Current supervisor'},{period_id:earlier,name:'Other supervisor'}]:
          date==='2026-11-01'?[{period_id:earlier,name:'Earlier supervisor'}]:[];
        return route.fulfill({json:{business:'farm',from:date,to:date,periodId:null,accounts:[],sources:[],
          manager_receivers:[{period_id:current,name:'Current supervisor'}],ceo_receivers:[{id:owner,name:'Temporary CEO Test'},{id:customer,name:'CEO'}],
          farm_supervisor_receivers:supervisors}});
      }
      if(url.pathname==='/api/farm/credit')return route.fulfill({json:credit});
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
    async function posted(expected){
      await submit.click();await page.waitForFunction(()=>window.saved.length===1);
      const saved=await page.evaluate(()=>window.saved[0]);
      assert.equal(saved.endpoint,'/api/farm/credit');assert.equal(saved.body.payload.amount,'100');
      assert.deepEqual(saved.body.payload.cash_receiver,expected);
      await page.evaluate(()=>localStorage.clear());
    }
    await receipt('all');await submit.click();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await recipient.selectOption({label:labels[0]});await posted({type:'farm_destination',destination:'primefield_account'});
    await receipt('manager');await recipient.selectOption({label:labels[1]});await posted({type:'farm_destination',destination:'sales_and_procurement'});
    for(const role of ['manager','scoped-owner']){
      await receipt(role);await recipient.selectOption({label:labels[2]});
      assert.equal(await supervisor.count(),0);await posted({type:'farm_supervisor',period_id:current});
    }
    await receipt('all');await recipient.selectOption({label:labels[2]});await expect(supervisor).toBeVisible();
    await submit.click();assert.equal(await page.evaluate(()=>window.saved.length),0);
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
    await submit.click();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await recipient.selectOption('');
    await page.getByLabel('Payment date',{exact:true}).fill('2026-11-01');await recipient.selectOption({label:labels[2]});
    await posted({type:'farm_supervisor',period_id:earlier});
    await receipt('all');await recipient.selectOption({label:labels[2]});
    await supervisor.selectOption({label:'Other supervisor'});
    let releaseRoster;
    delayedRoster=new Promise(resolve=>{releaseRoster=resolve;});
    const loading=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/operations/funds'&&new URL(request.url()).searchParams.get('to')==='2026-11-08');
    await page.getByLabel('Payment date',{exact:true}).fill('2026-11-08');await loading;
    await submit.click();releaseRoster();delayedRoster=null;
    assert.equal(await page.evaluate(()=>window.saved.length),0,'A supervisor selected for the previous date cannot be queued during the new lookup');
    await expect(page.getByRole('alert').filter({hasText:'supervisor list'})).toBeVisible();
    await submit.click();assert.equal(await page.evaluate(()=>window.saved.length),0);
    await recipient.selectOption({label:labels[0]});await posted({type:'farm_destination',destination:'primefield_account'});

    await page.goto(origin+'/correction?mode=all');
    await page.getByRole('button',{name:'Correct',exact:true}).click();
    await expect(recipient.locator('option:checked')).toHaveText('Keep the recorded recipient');
    assert.deepEqual(await recipient.locator('option:not([value=""])').allTextContents(),labels);
    await page.getByLabel('Reason',{exact:true}).fill('Corrected sale details');
    await page.getByRole('button',{name:'Save correction'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(corrections.length,1);assert.equal(corrections[0].changes.cash_receiver,undefined);
    await page.getByRole('button',{name:'Correct',exact:true}).click();
    await recipient.selectOption({label:labels[1]});
    await page.getByLabel('Reason',{exact:true}).fill('Confirmed who received this payment');
    await page.getByRole('button',{name:'Save correction'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(corrections.length,2);
    assert.deepEqual(corrections[1].changes.cash_receiver,{type:'farm_destination',destination:'sales_and_procurement'});
    assert.ok(dateReads.includes(day)&&dateReads.includes('2026-11-01'));
    assert.deepEqual(errors,[]);await page.close();
    console.log('PASS farm recipient choices, submissions, dated supervisor selection and corrections at '+width+'px');
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
