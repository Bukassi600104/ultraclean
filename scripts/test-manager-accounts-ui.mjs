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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/(dashboard)/dashboard/managers/page';createRoot(document.getElementById('root')).render(<Page/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'}});
const artifacts=mkdtempSync(path.join(os.tmpdir(),'manager-accounts-ui-')),cssPath=path.join(artifacts,'styles.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',cssPath],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text)}else if(req.url==='/styles.css'){res.end(readFileSync(cssPath))}else{res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
let rows=[],calls=[],failLoad=false;const faults=[];page.on('pageerror',e=>faults.push(e.message));
await page.route('**/api/managers**',async route=>{const r=route.request(),body=r.postDataJSON(),method=r.method();calls.push({method,body});if(method==='GET'){await route.fulfill({status:failLoad?503:200,json:failLoad?{error:'Unable to load accounts'}:rows});return}if(method==='POST')rows.push({...body,id:String(rows.length+1),created_at:'2026-10-09T10:00:00Z',suspended:false,access_removed:false});if(method==='PUT')Object.assign(rows.find(x=>x.id===r.url().split('/').at(-1)),body);if(method==='DELETE')Object.assign(rows.find(x=>x.id===r.url().split('/').at(-1)),{suspended:true,access_removed:true});await route.fulfill({status:method==='POST'?201:200,json:{success:true}})});
let checks=0;
try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('heading',{name:'Manage Accounts',exact:true}).waitFor({timeout:5000});
 for(const role of ['manager','property_manager','content_manager']){
  await page.getByRole('button',{name:'Add Manager',exact:true}).click();await page.getByLabel('App access',{exact:true}).selectOption(role);await page.getByLabel('Full Name',{exact:true}).fill('Test '+role);await page.getByLabel('Email Address',{exact:true}).fill(role+'@example.com');await page.getByLabel('Password',{exact:true}).fill('Secure123!');await page.getByLabel('Confirm Password',{exact:true}).fill('Secure123!');await page.getByRole('button',{name:'Create Account',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(calls.filter(x=>x.method==='POST').at(-1).body.role,role);checks++;
 }
 await page.getByRole('button',{name:'Suspend',exact:true}).first().click();await page.getByRole('button',{name:'Reactivate',exact:true}).waitFor();checks++;
 await page.getByRole('button',{name:'Reactivate',exact:true}).click();await page.getByRole('button',{name:'Suspend',exact:true}).first().waitFor();checks++;
 await page.getByRole('button',{name:'Remove access',exact:true}).first().click();assert.match(await page.getByRole('alertdialog').innerText(),/historical|past entries/i);await page.getByRole('button',{name:'Yes, Remove Access',exact:true}).click();await page.getByText('Access removed',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Reactivate',exact:true}).count(),0);checks+=2;
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(artifacts,`accounts-${width}.png`),fullPage:true});checks++}
 failLoad=true;await page.reload();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/load/i);checks++;assert.deepEqual(faults,[]);checks++;
 console.log(`PASS: ${checks} actual account-page browser checks; three app selections, create, suspend/reactivate, safe removal, load errors and responsive layout. ${artifacts}`);
}finally{await browser.close();await new Promise(r=>server.close(r))}
