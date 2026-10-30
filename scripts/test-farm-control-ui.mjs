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
const id='00000000-0000-4000-8000-000000000001';
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {FarmControl} from './components/dashboard/farm/FarmControl';import {FarmReportingSettings} from './components/dashboard/farm/FarmReportingSettings';createRoot(document.getElementById('root')).render(location.search.includes('settings')?<FarmReportingSettings/>:<FarmControl/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'next-link',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'import React from "react";export default function Link(p){return React.createElement("a",p,p.children)}',loader:'js',resolveDir:process.cwd()}));}}]});
const folder=mkdtempSync(path.join(os.tmpdir(),'farm-today-ui-')),css=path.join(folder,'styles.css');execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root" class="p-4"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
console.log('UI bundle ready');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[],posts=[];let counts=[];
page.on('pageerror',e=>errors.push(e.message));
const source=JSON.parse(readFileSync(path.join(os.tmpdir(),'primefield-control-fixture.json'),'utf8'));
const {typescriptLoader}=await import('../tests/helpers/load-typescript.mjs');
const load=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>({rpc:async()=>({data:source,error:null})})}});
const result=await load('lib/farm-control.ts').getFarmControl(source.report.scope,source.report.from,source.report.to);
await page.route('**/api/**',async route=>{const req=route.request();let body=result;if(req.method()==='POST'){posts.push(req.postDataJSON());body={data:req.postDataJSON().payload};}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
try{
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('heading',{name:'Needs attention now'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Report must fit viewport');
  assert.match(await page.locator('body').innerText(),/Actual collections/);
  assert.equal(await page.getByRole('link',{name:'Download Excel'}).getAttribute('href').then(h=>h.startsWith('/api/farm/control/export?')),true);
  await page.goto('http://127.0.0.1:'+server.address().port+'/?settings=1');
  await page.getByLabel('Your timezone (IANA name)').fill('America/Toronto');
  await page.getByLabel('Reason for this change').fill('Actual owner preferences');
  await page.getByRole('button',{name:'Save preferences'}).click();await page.getByRole('status').filter({hasText:'preferences saved'}).waitFor();
  assert.equal(posts.at(-1).payload.exchange_rate,null,'No demo rate is supplied');
  const box=await page.locator('form').boundingBox();assert.ok(box.width<=672&&Math.abs(box.x+box.width/2-width/2)<3,'Settings stay centred');
 }
 assert.deepEqual(errors,[]);console.log('PASS actual CEO control and configuration UI at four widths, no invented rates, export links and readable empty results');
}finally{await browser.close();await new Promise(r=>server.close(r));}
