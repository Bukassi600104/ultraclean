import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const entries=await Promise.all(['old-release','new-release'].map(async release=>{
  const bundle=await build({
    stdin:{contents:`
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {AppUpdateNotice} from './components/pwa/AppUpdateNotice';
      import {saveFarmMedia,getFarmMedia} from './lib/farm-offline-media';
      const identity={actorId:'isolated-owner',business:'farm',periodId:'isolated-period'};
      window.storePhoto=()=>saveFarmMedia(identity,new Blob(['saved photo']),{activity_date:'2026-11-19',target_resource:'farm_daily_reports'});
      window.savedPhotos=async()=>Promise.all((await getFarmMedia(identity)).map(async row=>[row.id,await row.blob.text()]));
      createRoot(document.getElementById('root')).render(<><AppUpdateNotice/><h1>App home</h1><input aria-label="Work in another tab"/></>);
    `,resolveDir:process.cwd(),loader:'tsx'},
    bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',
    alias:{'@':process.cwd()},define:{'process.env.NEXT_PUBLIC_APP_RELEASE':JSON.stringify(release)},
    plugins:[{name:'next-pathname',setup(plugin){
      plugin.onResolve({filter:/^next\/navigation$/},()=>({path:'nav',namespace:'test'}));
      plugin.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const usePathname=()=>location.pathname;',loader:'js'}));
    }}],
  });
  return [release,bundle.outputFiles[0].text];
}));
const bundles=new Map(entries);
const css=execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','--minify'],{
  encoding:'utf8',stdio:['ignore','pipe','pipe'],
});
const farmHost='farm.primefieldagric.com',mdHost='leads.ultratidycleaning.com',publicHost='www.ultratidycleaning.com';
let liveRelease='new-release',running='new-release',promoted=true;
const releaseChecks=[];
let pageRequests=0;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://'+req.headers.host);
  if(url.pathname==='/api/app-version'){
    releaseChecks.push(url.hostname);
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    return res.end(JSON.stringify({releaseId:liveRelease,notes:['Pellet sizes in Daily Log'],queueFormat:1,promoted}));
  }
  if(url.pathname==='/farm-sw.js'){
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
    return res.end(readFileSync('public/farm-sw.js'));
  }
  if(url.pathname==='/_next/static/fixture.css'){
    res.writeHead(200,{'Content-Type':'text/css'});
    return res.end(css);
  }
  if(url.pathname.startsWith('/_next/static/')){
    res.writeHead(200,{'Content-Type':'text/javascript'});
    return res.end(bundles.get(url.pathname.split('/').at(-1).replace(/\.js$/,'')));
  }
  pageRequests++;
  const prepared=url.pathname==='/offline/farm';
  const release=prepared?'old-release':running;
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
  res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/_next/static/fixture.css"></head><body '+(prepared?'data-farm-offline-shell':'')+'><div id="root"></div><script src="/_next/static/'+release+'.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=host=>'http://'+host+':'+server.address().port;
const hosts=[farmHost,mdHost,publicHost];
const browser=await chromium.launch({headless:true,args:[
  '--no-proxy-server',
  '--host-resolver-rules='+hosts.map(host=>'MAP '+host+' 127.0.0.1').join(','),
]});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const update=page.getByRole('complementary',{name:'App update'});
try{
  for(const [host,route] of [[mdHost,'/login'],[farmHost,'/']]){
    const readsBeforeLaunch=releaseChecks.length;
    await page.goto(origin(host)+route);
    await update.getByText('Pellet sizes in Daily Log',{exact:true}).waitFor();
    assert.equal(await update.getByRole('button',{name:'Update now'}).count(),0,'A current app explains the new release without a reload');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const dimensions=await update.boundingBox();
    assert.ok(dimensions.y>=0 && dimensions.y<60 && dimensions.width<=390);
    await update.getByRole('button',{name:'Got it'}).click();
    await Promise.all([page.waitForResponse('**/api/app-version'),page.reload()]);
    await page.getByRole('heading',{name:'App home'}).waitFor();
    assert.equal(await update.count(),0,'An acknowledged release should stay dismissed');
    assert.ok(releaseChecks.slice(readsBeforeLaunch).includes(host),'The first screen must request fresh version information');
  }

  // A standalone farm app can launch cached with no network. The real worker
  // serves its prepared shell, and reconnect prompts an explicit safe update.
  running='old-release';
  liveRelease='old-release';
  const offlineOrigin=origin('127.0.0.1');
  await page.goto(offlineOrigin+'/manager');
  await update.getByRole('button',{name:'Got it'}).click();
  await page.evaluate(()=>navigator.serviceWorker.register('/farm-sw.js',{scope:'/'}).then(()=>true));
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  assert.equal(await page.locator('[data-farm-offline-shell]').count(),1);
  await page.getByRole('heading',{name:'App home'}).waitFor();
  assert.equal(await update.count(),0);

  liveRelease='new-release';
  running='new-release';
  await context.setOffline(false);
  await update.getByRole('button',{name:'Update now'}).waitFor();
  await page.evaluate(()=>localStorage.setItem('farm_pending_dated',JSON.stringify({endpoint:'/api/farm/credit',data:{request_id:'unchanged'}})));
  const photo=await page.evaluate(async()=>(await window.storePhoto()).id);
  const other=await context.newPage();
  await other.goto(offlineOrigin+'/manager');
  await other.getByLabel('Work in another tab').fill('Keep this tab open');
  await page.bringToFront();
  const requestsBefore=pageRequests;
  await Promise.all([page.waitForNavigation(),update.getByRole('button',{name:'Update now'}).click()]);
  assert.equal(pageRequests,requestsBefore+1,'Reload happens once after the update is chosen');
  await update.getByRole('button',{name:'Got it'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('farm_pending_dated')).data.request_id),'unchanged');
  assert.deepEqual(await page.evaluate(()=>window.savedPhotos()),[[photo,'saved photo']]);
  assert.equal(await other.getByLabel('Work in another tab').inputValue(),'Keep this tab open');
  await update.getByRole('button',{name:'Got it'}).click();

  // A retained MD home page checks again on foregrounding.
  running='old-release';
  liveRelease='old-release';
  await page.goto(origin(mdHost)+'/dashboard');
  await update.getByRole('button',{name:'Got it'}).click();
  liveRelease='new-release';
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await update.getByRole('button',{name:'Update now'}).waitFor();
  await update.getByRole('button',{name:'Later',exact:true}).click();
  assert.equal(await update.count(),0);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await update.getByRole('button',{name:'Update now'}).waitFor();
  running='new-release';
  await Promise.all([page.waitForNavigation(),update.getByRole('button',{name:'Update now'}).click()]);
  await update.getByRole('button',{name:'Got it'}).waitFor();
  assert.equal(await update.getByRole('button',{name:'Update now'}).count(),0);

  promoted=false;
  await Promise.all([page.waitForResponse('**/api/app-version'),page.reload()]);
  await page.getByRole('heading',{name:'App home'}).waitFor();
  assert.equal(await update.count(),0);
  const requestCount=releaseChecks.length;
  await page.goto(origin(publicHost)+'/');
  await page.getByRole('heading',{name:'App home'}).waitFor();
  assert.equal(releaseChecks.length,requestCount);
  console.log('PASS launch checks on both app origins, resumed MD session, actual offline Farm shell, one-click update, saved drafts and photo preservation');
}finally{
  await browser.close();
  await new Promise(resolve=>{
    server.close(resolve);
    server.closeAllConnections();
  });
}
