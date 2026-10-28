import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {mkdtempSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const bundle=await build({stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import {ManagerPeriodProvider} from "./contexts/ManagerPeriodContext";import {ManagerHandoverGate} from "./components/manager/ManagerHandover";createRoot(document.getElementById("root")).render(<ManagerPeriodProvider business="farm" actorId="test-manager"><ManagerHandoverGate><h1>Ordinary workspace</h1></ManagerHandoverGate></ManagerPeriodProvider>);',resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'test-auth-link',setup(builder){builder.onResolve({filter:/^(next\/link|next\/navigation|@\/contexts\/AuthContext)$/},args=>({path:args.path,namespace:'test'}));builder.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='next/navigation'?'export const usePathname=()=>location.pathname;':args.path==='next/link'?'import React from "react";export default function Link(props){return <a {...props}/>;}':'export const useAuth=()=>({profile:{id:"test-manager",role:"manager"}});',loader:'jsx',resolveDir:process.cwd()}));}}]});
const artifacts=mkdtempSync(path.join(os.tmpdir(),'manager-handover-ui-')),css=path.join(artifacts,'styles.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css],{stdio:'pipe'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':req.url==='/styles.css'?'text/css':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:req.url==='/styles.css'?readFileSync(css):'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script src="/bundle.js"></script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:700}});
let checks=0,fail=true,writes=0,active=false;
const item=(id,label,quantity,resource='farm_inventory')=>({itemId:id,label,quantity,resource,recordId:id,unit:resource==='farm_feed_stock'?'unopened bags':'animals',status:'pending',details:[],version:'1'.repeat(32)});
const fish=item('fish','catfish','40'),goat=item('goat','goat','0'),feed=item('feed','Fish feed · local',null,'farm_feed_stock');
function state(){return {sessionId:'session',periodId:'period',snapshotVersion:'1'.repeat(32),asOf:'2026-10-28T09:00:00Z',status:active?'active':'awaiting_handover',steps:[{id:'stock',title:'Livestock and stock',items:[fish,goat]},{id:'feed',title:'Feed',items:[feed]}],issues:[fish,goat,feed].filter(i=>i.status==='cannot_confirm'||i.quantity===null).map(i=>({itemId:i.itemId,label:i.label,status:i.status,countNeeded:i.quantity===null}))};}
await page.route('**/api/operations/manager-context*',route=>route.fulfill({json:{actorId:'test-manager',managerId:'test-manager',periodId:'period',mode:'personal',status:active?'active':'awaiting_handover',business:'farm',startsOn:'2026-10-28'}}));
await page.route('**/api/operations/handover',async route=>{if(fail)return route.fulfill({status:503,json:{error:'Inventory is temporarily unavailable'}});if(route.request().method()==='POST'){writes++;const body=route.request().postDataJSON();for(const choice of body.items){const target=[fish,goat,feed].find(i=>i.itemId===choice.itemId);target.status=choice.status;}if(body.operation==='finalize')active=true;}await route.fulfill({json:state()});});
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/manager/sales');await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('checkbox').count(),0);assert.equal(await page.getByRole('heading',{name:'Ordinary workspace'}).count(),0);checks+=2;
 fail=false;await page.getByRole('button',{name:'Refresh inventory'}).click();await page.getByRole('checkbox',{name:/Catfish/}).waitFor();
 assert.equal(await page.locator('input[type=number]').count(),0);checks++;
 await page.getByRole('checkbox',{name:/Catfish/}).focus();await page.keyboard.press('Space');await page.getByText('1 of 3 confirmed',{exact:true}).waitFor();checks++;
 await page.reload();await page.getByRole('checkbox',{name:/Catfish/}).waitFor();assert.equal(await page.getByRole('checkbox',{name:/Catfish/}).isChecked(),true);checks++;
 await page.getByRole('checkbox',{name:/Goat/}).click();await page.getByText('2 of 3 confirmed',{exact:true}).waitFor();await page.getByRole('button',{name:'Next step'}).click();
 assert.equal(await page.getByRole('checkbox').isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Finish handover'}).isDisabled(),true);checks+=2;
 await page.getByRole('button',{name:'Cannot confirm',exact:true}).click();await page.getByText('Flagged for Bimbo to review',{exact:true}).waitFor();checks++;
 fish.quantity='39';fish.version='2'.repeat(32);fish.status='pending';feed.quantity='4';feed.version='2'.repeat(32);feed.status='pending';
 await page.reload();await page.getByRole('checkbox',{name:/Catfish/}).waitFor();assert.equal(await page.getByRole('checkbox',{name:/Catfish/}).isChecked(),false);assert.equal(await page.getByRole('checkbox',{name:/Goat/}).isChecked(),true);checks+=2;
 for(const width of[390,768,1440]){await page.setViewportSize({width,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(artifacts,'handover-'+width+'.png'),fullPage:true});checks++;}
 await page.getByRole('checkbox',{name:/Catfish/}).click();await page.getByRole('button',{name:'Next step'}).click();await page.getByRole('checkbox').click();await page.getByText('3 of 3 confirmed',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:560});await page.getByRole('button',{name:'Finish handover'}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('[role=dialog]')).opacity==='1');const bounds=await dialog.boundingBox();assert.ok(bounds.x>=15&&bounds.x+bounds.width<=375&&bounds.height<=530);checks++;
 await page.screenshot({path:path.join(artifacts,'confirmation-phone.png'),fullPage:true});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 assert.equal(await page.getByRole('button',{name:'Finish handover'}).evaluate(el=>el===document.activeElement),true,'Closing confirmation must restore focus');checks++;
 await page.getByRole('button',{name:'Finish handover'}).click();await page.getByRole('button',{name:'Yes, I have checked everything'}).click();await page.getByRole('heading',{name:'Ordinary workspace'}).waitFor();assert.equal(active,true);assert.ok(writes>=4);checks+=2;
 console.log('PASS '+checks+' actual handover browser checks: gated deep link, saved ticks, unknown/zero, changed items, keyboard, focus and 390/768/1440 layout. '+artifacts);
}finally{await browser.close();await new Promise(r=>server.close(r));}
