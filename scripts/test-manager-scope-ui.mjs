import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const contents=[
 'import React from "react";import {createRoot} from "react-dom/client";import {AuthProvider} from "./contexts/AuthContext";',
 'import {ManagerPeriodProvider,useManagerPeriod,useManagerFetch,useQueueIdentity} from "./contexts/ManagerPeriodContext";import {savePending,getPendingCount} from "./lib/offline-storage";',
 'window.fixtureActor={id:"A",role:"property_manager"};',
 'function Probe(){const scope=useManagerPeriod(),send=useManagerFetch(),identity=useQueueIdentity();return <><h1>{scope.actorId}</h1><input aria-label="Current work"/><p>{getPendingCount(identity)} own entries</p><button onClick={async()=>{const id=savePending("/api/property/properties",{name:"A work"},identity);try{await send("/api/property/properties",{method:"POST",body:"{}"});localStorage.removeItem(id)}catch{}}}>Send</button></>}',
 'createRoot(document.getElementById("root")).render(<AuthProvider><ManagerPeriodProvider business="property"><Probe/></ManagerPeriodProvider></AuthProvider>);'
].join('\n');
const boundary='export function createClient(){return {auth:{getUser:async()=>({data:{user:window.fixtureActor}}),onAuthStateChange:callback=>{window.authEvent=callback;return {data:{subscription:{unsubscribe(){}}}}}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:window.fixtureActor})})})})}}';
const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'synthetic-auth-boundary',setup(builder){builder.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:'client',namespace:'test'}));builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:boundary,loader:'js'}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/bundle.js"></script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),page=await browser.newPage();let checks=0,headers;
await page.route('**/api/operations/manager-context*',async route=>{const actor=await page.evaluate(()=>window.fixtureActor.id);await route.fulfill({json:{actorId:actor,managerId:actor,mode:'personal',periodId:'period-'+actor,business:'property',startsOn:'2026-10-28',status:'active'}})});
await page.route('**/api/property/properties',async route=>{headers=route.request().headers();await new Promise(r=>setTimeout(r,300));await route.fulfill({json:{data:{id:'saved'}}}).catch(()=>{});});
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('heading',{name:'A',exact:true}).waitFor();checks++;
 await page.getByLabel('Current work').fill('Keep this on session refresh');
 await page.evaluate(()=>window.authEvent('TOKEN_REFRESHED',{user:window.fixtureActor}));assert.equal(await page.getByLabel('Current work').inputValue(),'Keep this on session refresh');checks++;
 const sent=page.waitForRequest('**/api/property/properties');await page.getByRole('button',{name:'Send'}).click();await sent;
 await page.evaluate(()=>{window.fixtureActor={id:'B',role:'property_manager'};window.authEvent('SIGNED_IN',{user:window.fixtureActor});});
 await page.getByRole('heading',{name:'B',exact:true}).waitFor();assert.equal(await page.getByLabel('Current work').inputValue(),'');checks++;
 assert.match(await page.locator('body').innerText(),/0 own entries/);checks++;
 assert.equal(headers['x-manager-actor'],'A');assert.equal(headers['x-manager-period'],'period-A');checks+=2;
 await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('farm_pending_')).length),1);checks++;
 console.log('PASS '+checks+' actual Auth/provider browser checks: refresh retains work, identity switch clears screen and aborts stale submission without deleting its queue');
}finally{await browser.close();await new Promise(r=>server.close(r));}
