// Independent lost-response/reload regression against actual React components.
// All network responses and sessions are synthetic; no environment files or live calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import {ContentWorkspace} from './components/content/ContentWorkspace';import {ContentIdentity} from './components/content/ContentIdentity';import {FarmOperationalRequests} from './components/manager/FarmOperations';const farm=new URL(location.href).searchParams.get('screen')==='farm';createRoot(document.getElementById('root')).render(farm?<FarmOperationalRequests/>:<ContentIdentity actorId='00000000-0000-4000-8000-000000000001'><ContentWorkspace kind='sales'/></ContentIdentity>);`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-next-session',setup(builder){builder.onResolve({filter:/^(next\/link|@\/contexts\/AuthContext)$/},args=>({path:args.path,namespace:'mock'}));builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`:`export const useAuth=()=>({profile:{id:'00000000-0000-4000-8000-000000000001',role:new URL(location.href).searchParams.get('screen')==='farm'?'manager':'content_manager'}});`,loader:'js',resolveDir:process.cwd()}));}}]});
const server=http.createServer((req,res)=>{if(req.url.startsWith('/bundle.js')){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else{res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true}),page=await browser.newPage();
const faults=[],issues=[],calls=[],receipts=new Map(),sales=[],requests=[];let failContent=true,failFarm=true;
page.on('pageerror',error=>faults.push(error.message));
await page.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url()),body=req.postDataJSON()??{},farm=url.pathname.includes('/farm/'),kind=url.pathname.split('/').at(-1);
 if(req.method()==='GET'){const data=farm?requests:kind==='sales'?sales:[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data,total:data.length,has_more:false})});return;}
 const retryId=farm?req.headers()['x-request-id']:body.request_id;calls.push({farm,body,retryId});let row=receipts.get(retryId);
 if(!row){row=farm?{...body,id:crypto.randomUUID(),revision:0,status:'pending',requested_by:'synthetic',requester:{name:'Manager A'},created_at:'2026-10-05T12:00:00Z',report_id:null,ceo_response:null,resolution:null}:{...body.data,id:crypto.randomUUID(),revision:0};receipts.set(retryId,row);(farm?requests:sales).push(row);}
 if(farm&&failFarm){failFarm=false;await route.abort('failed');return;}if(!farm&&failContent){failContent=false;await route.abort('failed');return;}
 await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({data:row})});
});
let checks=0;
try{
 await page.goto(origin);await page.getByRole('button',{name:'Add sale',exact:true}).click();await page.getByLabel('Amount *',{exact:true}).fill('250');await page.getByLabel('Currency (ISO code) *',{exact:true}).fill('CAD');await page.getByLabel('Sale date *',{exact:true}).fill('2026-10-05');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('alert').waitFor();
 if(!(await page.getByLabel('Amount *',{exact:true}).isDisabled()))issues.push('Content unknown-save fields remain editable');else checks++;
 const contentRetry=calls.find(call=>!call.farm).retryId;
 await page.reload();await page.getByRole('button',{name:'Add sale',exact:true}).waitFor();
 if(await page.getByLabel('Amount *',{exact:true}).count()===0)issues.push('Content unknown-save payload/retry lost on reload');
 else {assert.equal(await page.getByLabel('Amount *',{exact:true}).inputValue(),'250');await page.getByRole('button',{name:'Retry same submission',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('form'));assert.equal(calls.filter(call=>!call.farm).at(-1).retryId,contentRetry);assert.equal(sales.length,1);checks+=3;}
 await page.goto(origin+'/?screen=farm');await page.getByLabel('What do you need?',{exact:true}).fill('Replacement pump');await page.getByRole('button',{name:'Submit request',exact:true}).click();await page.getByRole('alert').waitFor();
 if(!(await page.getByLabel('What do you need?',{exact:true}).isDisabled()))issues.push('Farm unknown-save request fields remain editable');else checks++;
 const farmRetry=calls.find(call=>call.farm).retryId;
 await page.reload();await page.getByLabel('What do you need?',{exact:true}).waitFor();assert.equal(await page.getByLabel('What do you need?',{exact:true}).inputValue(),'Replacement pump');await page.getByRole('button',{name:'Retry saved submission',exact:true}).click();await page.getByText('Operational request submitted.',{exact:true}).waitFor();assert.equal(calls.filter(call=>call.farm).at(-1).retryId,farmRetry);assert.equal(requests.length,1);assert.equal(await page.getByText('Manager A',{exact:true}).count(),1);assert.equal(await page.getByText('2026-10-05T12:00:00Z',{exact:true}).count(),1);checks+=5;
 assert.deepEqual(faults,[]);checks++;assert.deepEqual(issues,[],`Independent debugger blockers: ${issues.join('; ')}`);
 console.log(`PASS: ${checks} independent actual React lost-response/reload checks; frozen payload, same retry receipt, one content sale and one farm request.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
