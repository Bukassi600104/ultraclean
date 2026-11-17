import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';

const require=createRequire(import.meta.url);
const {chromium,expect}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const source=JSON.parse(readFileSync(path.join(tmpdir(),'primefield-control-fixture.json'),'utf8'));
const admin=source.report.scope.actorId;
const uid=()=>crypto.randomUUID(),period=uid(),day='2026-11-09';
const scope={...source.report.scope,periodId:period};
const load=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>({rpc:async()=>({data:source,error:null})})}});
const {farmAlerts}=load('lib/farm-summary.ts');
const original=await load('lib/farm-control.ts').getFarmControl(source.report.scope,source.report.from,source.report.to);

// The Funds page receives an expense period even when no manager was selected on the overview.
const readScopes=[];
const fundsRoute=typescriptLoader({
 '@/lib/auth':{requireAdmin:async()=>({id:admin,role:'admin'})},
 '@/lib/manager-periods':{resolveManagerScope:async(actor,business,selection)=>{readScopes.push(selection.periodId);return {...scope,business,periodId:selection.periodId||null};}},
 '@/lib/manager-reports':{getManagerReport:async scope=>({scope})},
})('app/api/ceo/control/route.ts');
const getReport=query=>fundsRoute.GET(new Request('http://localhost/api/ceo/control?business=farm'+query));
assert.equal((await (await getReport('&period_id='+period)).json()).scope.periodId,period);
assert.equal((await (await getReport('')).json()).scope.periodId,null);
assert.equal((await getReport('&period_id=invalid')).status,400);
assert.deepEqual(readScopes,[period,undefined]);

const modules={
 'next/link':'import React from "react";export default function Link({children,...p}){return <a {...p}>{children}</a>}',
 'next/navigation':'export const usePathname=()=>location.pathname;export const useRouter=()=>({});export const useSearchParams=()=>new URLSearchParams(location.search);',
 '@/contexts/AuthContext':'export const useAuth=()=>({profile:{id:'+JSON.stringify(admin)+',name:"Owner",role:"admin"}});',
 '@/contexts/ManagerPeriodContext':'const scope='+JSON.stringify(scope)+';export const useManagerPeriod=()=>scope;export const useQueueIdentity=()=>scope;export const useOperationsFeature=()=>({enabled:true});export const useManagerFetch=()=>fetch;export const useManagerStorageKey=key=>key;export const ManagerPeriodProvider=({children})=>children;',
 '@/hooks/useOfflineSync':'export const useOfflineSync=()=>({isSyncing:false,pendingCount:0,conflicts:[],quarantinedCount:0});',
};
const bundle=await build({
 stdin:{contents:[
  "import React from 'react';import {createRoot} from 'react-dom/client';",
  "import {FarmControl} from './components/dashboard/farm/FarmControl';",
  "import {FarmOperationalRequests} from './components/manager/FarmOperations';",
  "import {FarmPurchases} from './components/manager/FarmPurchases';",
  "import {ManagerReport} from './components/dashboard/ManagerReport';",
  "const filters=Object.fromEntries(new URLSearchParams(location.search));",
  "const routes={'/dashboard/farm':<FarmControl/>, '/dashboard/farm/operational-requests':<FarmOperationalRequests admin/>,",
  "'/dashboard/farm/purchases':<FarmPurchases admin/>, '/dashboard/funds':<ManagerReport initialBusiness='farm' fundsMode initialFilters={filters}/>};",
  "createRoot(document.getElementById('root')).render(routes[location.pathname]);",
 ].join('\n'),resolveDir:process.cwd(),loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},
 plugins:[{name:'isolated-auth',setup(b){
  b.onResolve({filter:/^(next\/|@\/)/},({path})=>Object.hasOwn(modules,path)?{path,namespace:'isolated-auth'}:null);
  b.onLoad({filter:/.*/,namespace:'isolated-auth'},({path})=>({contents:modules[path],resolveDir:process.cwd(),loader:'jsx'}));
 }}],
});
const folder=mkdtempSync(path.join(tmpdir(),'farm-attention-')),css=path.join(folder,'style.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=createServer((req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
 else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}
 else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link href="/style.css" rel="stylesheet"><main id="root" class="p-3"></main><script src="/bundle.js"></script>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,home=origin+'/dashboard/farm?period_id='+period;
const browser=await chromium.launch();
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:850}});page.setDefaultTimeout(12000);
  const errors=[],writes=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  const request={id:uid(),revision:0,request_date:day,category:'purchase',status:'pending',description:'Cutlass (extra), gumboots and knapsack sprayer',created_at:day+'T10:00Z',requester:{name:'Test supervisor'},request_details:null};
  const exception={id:uid(),date:day,period_id:period,supplier:'Electrician',description:'Emergency pump repair',amount_exact:'4500.00',matching_costs:[],approval:{category:'equipment'},resolution:null,funding_status:null,pending_funding_id:null};
  const pending=Array.from({length:6},(_,i)=>({id:uid(),kind:'expense',writer:'farm_v2_write',activity_date:day,period_id:period,currency:'NGN',amount:String(1000+i),shortfall:String(1000+i),bucket:'owner',status:'pending',requester_name:'Test supervisor',payload:{notes:'Isolated expense '+i},created_at:day+'T12:00Z'}));
  const cost=pending[4],reqPath='/api/farm/operational-requests';
  const requests=[request];let decisionConflict=false;
  const fundsBody=q=>({...source.report.cash,business:'farm',periodId:q.get('period_id'),from:q.get('from'),to:q.get('to'),pending_expenses:pending.filter(e=>e.status==='pending'),sources:[],accounts:[]});
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname,q=url.searchParams;
   let body={data:[],total:0},status=200;
   if(p==='/api/farm/control'){
    const input={report:{...source.report,decisions:{operational_requests:requests.filter(row=>row.status==='pending')},cash:fundsBody(q)},health:{tasks:[]},stores:{assets:[],counts:[]},currentCredit:{invoices:[]},currentPerformance:{batches:[]},purchases:{purchases:[],exceptions:[exception]},config:null};
    body={...original,report:{...original.report,scope},overview:{...original.overview,requestCount:requests.filter(row=>row.status==='pending').length,purchaseCount:0},alerts:farmAlerts(input)};
   }else if(p===reqPath){const rows=requests.filter(row=>row.id===q.get('id'));body={data:rows,total:rows.length};}
   else if(p===reqPath+'/'+request.id&&req.method()==='PUT'){
    const form=req.postDataJSON();assert.equal(form.operation,'approve');assert.equal(form.revision,request.revision);assert.ok(req.headers()['x-request-id']);
    if(decisionConflict){status=409;request.status='declined';request.revision++;body={error:'This request has already been decided.'};}
    else{writes.push(form);Object.assign(request,{status:'approved',revision:1,decision_at:day+'T14:00Z'});body={data:request};}
   }else if(p==='/api/farm/purchases'){body={purchases:[],exceptions:[exception],procurement_tasks:[],procurement_people:[],policy:null};}
   else if(p==='/api/managers')body=[];
   else if(p==='/api/ceo/control'||p.endsWith('/report')){
    body={...original.report,from:q.get('from'),to:q.get('to'),scope,decisions:{operational_requests:[],handovers:[],corrections:[]},cash:fundsBody(q)};
   }else if(p==='/api/operations/funds')body=fundsBody(q);
   else if(p==='/api/operations/funds/pending-expenses/'+cost.id&&req.method()==='POST'){
    const form=req.postDataJSON();assert.equal(form.action,'decline');assert.ok(form.request_id);writes.push(form);cost.status='declined';body={status:'posted',decision:'declined',data:{id:cost.id}};
   }else if(!['GET','HEAD'].includes(req.method()))throw Error('Unexpected write to '+p);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(home);await page.getByRole('link',{name:/Requests \/ purchases/}).click();
  await expect(page).toHaveURL(new RegExp('request_id='+request.id));await page.getByRole('button',{name:'Approve',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Decision note').fill('Approved after checking the request');
  await dialog.getByRole('button',{name:'Confirm decision'}).click();await dialog.waitFor({state:'hidden'});await page.getByText('Decision saved.',{exact:false}).waitFor();
  await page.goBack();await page.getByRole('heading',{name:'Needs your attention'}).waitFor();
  await expect(page.getByRole('link',{name:/Requests \/ purchases/})).toContainText('0 requests');
  assert.equal(writes.length,1);
  const emergency=page.getByRole('link',{name:/Confirm expense funding.*Electrician/});
  if(!await emergency.isVisible())await page.locator('#overview-attention summary').click();
  await emergency.click();
  await dialog.waitFor();await expect(dialog).toContainText('Emergency pump repair');
  await dialog.getByLabel('How was it paid?').selectOption('bimbo_transfer');
  await dialog.getByText('No payer is listed for this source on the expense date.').waitFor();
  await dialog.getByRole('link',{name:'Record a missing owner transfer'}).click();await dialog.waitFor();
  await expect(dialog.getByLabel('Cash recipient')).toHaveValue('');
  await expect(dialog.getByLabel('Cash activity date')).toHaveValue('');await expect(dialog.getByLabel('Cash activity date')).toHaveAttribute('max',day);
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('link',{name:'Return to emergency expense'}).click();await dialog.waitFor();await expect(dialog).toContainText('Emergency pump repair');
  assert.equal(writes.length,1);
  await page.goto(home);
  const reviewed=page.getByRole('link',{name:new RegExp('Funding source needs confirmation.*1,004')});
  if(!await reviewed.isVisible()){await page.locator('#overview-attention summary').click();}
  await reviewed.click();await dialog.waitFor();
  await expect(dialog).toContainText('1,004.00');await expect(dialog).toContainText(day);
  await dialog.getByLabel('Decision',{exact:true}).selectOption('decline');await dialog.getByLabel('Reason',{exact:true}).fill('Verified this isolated funding request');
  await dialog.getByRole('button',{name:/Decline/}).click();await dialog.waitFor({state:'hidden'});
  await page.goBack();await page.getByRole('heading',{name:'Needs your attention'}).waitFor();
  if(await page.locator('#overview-attention summary').count())await page.locator('#overview-attention summary').click();
  assert.equal(await reviewed.count(),0);assert.equal(writes.length,2);assert.deepEqual(errors,[]);
  // Two outstanding requests should open a short decision list, even with a longer funding queue.
  request.status='pending';request.revision++;
  requests.push({...request,id:uid(),description:'A separate pending request'});
  await page.goto(home);await page.getByRole('link',{name:/Requests \/ purchases/}).click();
  await page.getByRole('button',{name:'Show all attention items'}).waitFor();
  const attention=page.locator('#overview-attention');
  assert.equal(await attention.getByRole('link',{name:/Request awaiting decision/}).count(),2);
  assert.equal(await attention.getByRole('link',{name:/Review funding/}).count(),0);
  await attention.getByRole('link',{name:/Cutlass/}).click();await page.getByRole('button',{name:'Approve',exact:true}).click();
  await dialog.getByLabel('Decision note').fill('Checking a simultaneous decision');decisionConflict=true;
  await dialog.getByRole('button',{name:'Confirm decision'}).click();await dialog.waitFor({state:'hidden'});
  await page.getByRole('status').filter({hasText:'already been decided'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Approve',exact:true}).count(),0);assert.equal(writes.length,2);
  await page.close();console.log('PASS real overview, request, funding and emergency routes at '+width+'px');
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
