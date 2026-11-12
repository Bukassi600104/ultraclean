import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {chromium, expect as playwrightExpect} from '@playwright/test';

const require = createRequire(import.meta.url);
const expect = playwrightExpect.configure({timeout:20000});
const {build} = require(path.join(os.tmpdir(), 'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js'));
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const actor = uuid(501), period = uuid(601), secondPeriod = uuid(602), otherManager = uuid(502);
const initial = {business: 'farm', actorId: actor, managerId: actor, periodId: period, mode: 'personal', status: 'active', role: 'manager'};
const mockScope = `
  import {useCallback, useSyncExternalStore} from 'react';
  let scope = ${JSON.stringify(initial)};
  const subscribe = fn => {window.addEventListener('test-identity',fn); return () => window.removeEventListener('test-identity',fn);};
  window.changeScope = fields => {scope = {...scope,...fields}; window.dispatchEvent(new Event('test-identity'));};
  export const useManagerPeriod = () => useSyncExternalStore(subscribe, () => scope);
  export function useAuth() {const s = useManagerPeriod(); return {profile:{id:s.actorId,role:s.role,suspended:s.suspended}};}
  export function useManagerFetch() {
    const s = useManagerPeriod();
    return useCallback((input, init={}) => {
      const headers = new Headers(init.headers);
      headers.set('X-Manager-Actor', s.actorId);
      headers.set('X-Manager-Period', s.periodId ?? 'legacy');
      return fetch(input, {...init, headers});
    }, [s]);
  }
`;
const bundle = await build({
  stdin: {contents: `import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
    import {FarmLogFollowups} from './components/manager/FarmLogFollowups';
    import {confirmUnsavedNavigation} from './lib/confirm-navigation';
    function App() {
      const [online,setOnline]=useState(navigator.onLine);
      useEffect(()=>{const change=()=>setOnline(navigator.onLine);window.addEventListener('offline',change);window.addEventListener('online',change);return()=>{window.removeEventListener('offline',change);window.removeEventListener('online',change)};},[]);
      return <main onClickCapture={confirmUnsavedNavigation}><FarmLogFollowups pathname={location.pathname} online={online}/></main>;
    }
    createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader:'tsx'},
  bundle:true, write:false, platform:'browser', format:'iife', jsx:'automatic', alias:{'@':process.cwd()},
  define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'isolated-identity',setup(b) {
    b.onResolve({filter:/^@\/contexts\/(AuthContext|ManagerPeriodContext)$/},()=>({path:'identity', namespace:'test-scope'}));
    b.onLoad({filter:/.*/,namespace:'test-scope'},()=>({contents:mockScope,loader:'js',resolveDir:process.cwd()}));
  }}],
});
const temp = mkdtempSync(path.join(os.tmpdir(),'farm-log-followups-ui-')), css = path.join(temp, 'style.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',css,'--content','./components/{manager/FarmLogFollowups,ui/dialog}.tsx'],{stdio:'pipe'});
const server=http.createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(css));}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:375,height:748}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  await context.route(/^https?:\/\//, route=>new URL(route.request().url()).origin===origin ? route.fallback() : route.abort());
  const errors=[], posts=[], offsets=[];
  page.on('pageerror',error=>errors.push(error.message));
  function daily(n,body) {
    return {message_id:uuid(n), record_id:uuid(100+n), resource:'farm_daily_reports', body,
      created_at:'2026-11-12T12:17:00Z', report_date:'2026-11-11', area:'farm1_pond2',batch_name:null,batch_id:null};
  }
  const batch = {...daily(2,'Release the water today'), resource:'farm_batch_records', batch_id:uuid(205), batch_name:'Broilers, Pen C',area:null};
  const tasks = new Map([
    [actor+period,[daily(1,'Change water tomorrow'),batch,...Array.from({length:19},(_,i)=>daily(3+i,'Follow-up '+(3+i)))]],
    [actor+secondPeriod, [daily(31,'New handover follow-up')]],
    [otherManager+secondPeriod,[daily(32,'Other supervisor follow-up')]],
  ]);
  let denyRead=false, denyWrite=false, failRead=false, failWrite=false, invalidAck=false;
  let held=null;
  await context.route('**/api/farm/log-followups*',async route=>{
    const request=route.request(), headers=request.headers(), key=headers['x-manager-actor']+headers['x-manager-period'];
    const rows=tasks.get(key) || [];
    let status=200, body;
    if(request.method()==='GET') {
      const offset=Number(new URL(request.url()).searchParams.get('offset'));offsets.push(offset);
      body={items:rows.slice(offset,offset+20),total:rows.length};
      if(denyRead || failRead){status=denyRead?403:503;body={error:'Unavailable'};}
      if(held && held.key===key){const gate=held;held=null;gate.seen();await gate.wait;}
    } else {
      const payload=request.postDataJSON();posts.push(payload);
      if(denyWrite || failWrite){status=denyWrite?401:500;body={error:'Unavailable'};}
      else if(invalidAck){body={data:{message_id:uuid(999),completed_at:'2026-11-12T14:00:00Z'}};}
      else {
        tasks.set(key,rows.filter(row=>row.message_id!==payload.message_id));
        body={data:{message_id:payload.message_id,completed_at:'2026-11-12T14:00:00Z'}};
      }
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const trigger=page.locator('button[aria-haspopup="dialog"]').filter({hasText:'Daily Log follow-ups'});
  const dialog=page.getByRole('dialog',{name:'Daily Log follow-ups'});
  const listItem=body=>dialog.getByRole('listitem').filter({has:page.getByText(body,{exact:true})});
  const focus=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const switchScope=changes=>page.evaluate(fields=>window.changeScope(fields),changes);
  const count=n=>expect(trigger).toContainText(n+' to do');

  // Same-page links must open the actual message, even when another report is already open.
  await page.goto(origin+'/manager/daily-report/history?report_id='+uuid(911));
  await count(21);await trigger.click();
  await expect(dialog.getByRole('listitem')).toHaveCount(20);
  const first=listItem('Change water tomorrow');
  await expect(first).toContainText('Catfish · Farm 1 · Pond 2');
  await expect(first).toContainText('11 Nov 2026');
  await expect(first).toContainText('13:17 (Nigeria time)');
  const dailyHref=await first.getByRole('link').getAttribute('href');
  assert.equal(new URL(dailyHref,origin).pathname,'/manager/daily-report/history');
  assert.equal(new URL(dailyHref,origin).searchParams.get('report_id'),uuid(101));
  assert.equal(new URL(dailyHref,origin).searchParams.get('message_id'),uuid(1));
  const batchHref=new URL(await listItem(batch.body).getByRole('link').getAttribute('href'),origin);
  assert.equal(batchHref.pathname,'/manager/today');
  for(const [name,id] of Object.entries({record_id:batch.record_id,batch_id:batch.batch_id,date:batch.report_date,message_id:batch.message_id}))assert.equal(batchHref.searchParams.get(name),id);
  await page.evaluate(()=>{document.body.dataset.unsavedChanges='true';});
  page.once('dialog',prompt=>prompt.dismiss());
  await first.getByRole('link').click();
  await expect(dialog).toBeVisible();assert.match(page.url(),/report_id=00000000-0000-4000-8000-000000000911$/);
  page.once('dialog',prompt=>prompt.accept());
  await first.getByRole('link').click();
  await expect(page).toHaveURL(origin+dailyHref);
  await count(21);assert.equal(posts.length,0,'Opening a message must keep it on the to-do list');
  await trigger.click();
  await dialog.getByRole('button',{name:'Next'}).click();
  await expect(dialog.getByText('Follow-up 21',{exact:true})).toBeVisible();
  assert.ok(offsets.includes(20));await expect(dialog.getByRole('listitem')).toHaveCount(1);

  // A failed write or a response acknowledging a different message leaves the original to do visible.
  const last=listItem('Follow-up 21');
  failWrite=true;await last.getByRole('button',{name:'Mark done'}).click();
  await expect(dialog.getByText(/Couldn't confirm completion/)).toBeVisible();await count(21);
  failWrite=false;invalidAck=true;await last.getByRole('button',{name:'Mark done'}).click();
  await expect.poll(()=>posts.length).toBe(2);await expect(last.getByRole('button',{name:'Mark done'})).toBeEnabled();
  await expect(last).toBeVisible();await count(21);invalidAck=false;
  await last.getByRole('button',{name:'Mark done'}).click();
  await count(20);await expect(dialog.getByText('Change water tomorrow',{exact:true})).toBeVisible();
  assert.deepEqual(posts[0],posts[1]);assert.deepEqual(posts[1],posts[2]);assert.equal(posts[0].message_id,uuid(21));
  await expect(dialog.getByText('Follow-up 21',{exact:true})).toHaveCount(0);

  // Older, in-memory results can be used offline. Loss of access clears them immediately.
  await context.setOffline(true);
  await expect(dialog.getByText(/^Offline\./)).toBeVisible();
  await expect(trigger).toContainText('20 to do · Offline');
  await expect(listItem(batch.body).getByRole('button',{name:'Mark done'})).toBeDisabled();
  tasks.get(actor+period).unshift(daily(35,'Check the valve after lunch'));
  await context.setOffline(false);await count(21);
  await expect(dialog.getByText('Check the valve after lunch',{exact:true})).toBeVisible();
  failRead=true;await focus();await expect(dialog.getByText(/Couldn't refresh follow-ups/)).toBeVisible();
  await expect(trigger).toContainText('21 to do · Refresh needed');
  await expect(listItem(batch.body)).toBeVisible();
  failRead=false;denyRead=true;await dialog.getByRole('button',{name:'Try again'}).click();
  await expect(trigger).toContainText('Unavailable');await expect(dialog.getByRole('listitem')).toHaveCount(0);
  denyRead=false;await dialog.getByRole('button',{name:'Try again'}).click();await count(21);
  denyWrite=true;await listItem(batch.body).getByRole('button',{name:'Mark done'}).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(0);await expect(trigger).toContainText('Unavailable');
  denyWrite=false;await dialog.getByRole('button',{name:'Try again'}).click();await count(21);

  // A slow request from the prior responsibility period cannot repopulate the current list.
  let release, started;
  const waiting = new Promise(resolve=>{started=resolve;});
  held = {key:actor+period, seen:started, wait:new Promise(resolve=>{release=resolve;})};
  await focus();await waiting;await switchScope({periodId:secondPeriod});await count(1);
  await trigger.click();await expect(dialog.getByText('New handover follow-up')).toBeVisible();
  release();await expect(dialog.getByText(batch.body)).toHaveCount(0);
  await switchScope({actorId:otherManager,managerId:otherManager});await count(1);await trigger.click();
  await expect(dialog.getByText('Other supervisor follow-up')).toBeVisible();await expect(dialog.getByText('New handover follow-up')).toHaveCount(0);
  for(const change of [{status:'awaiting_handover'}, {status:'closed'}, {status:'active',suspended:true}, {suspended:false,role:'admin'}]){
    await switchScope(change);await expect(trigger).toHaveCount(0);await expect(dialog).toHaveCount(0);
  }

  // Installed Farm app path, desktop layout and automatic refresh while it remains open.
  await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/expenses');await count(21);await trigger.click();
  const link=listItem(batch.body).getByRole('link');
  assert.equal(new URL(await link.getAttribute('href'),origin).pathname,'/today');
  await page.clock.install();
  await link.click();await expect(page).toHaveURL(/\/today\?.*message_id=/);await count(21);
  tasks.get(actor+period).unshift(daily(36,'Check the afternoon reading'));
  await page.clock.fastForward(60001);await page.clock.runFor(200);await count(22);await trigger.click();
  await expect(dialog.getByText('Check the afternoon reading',{exact:true})).toBeVisible();
  for(const width of [375,390,768,1440]){
    await page.setViewportSize({width,height:820});
    assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth && el.scrollWidth<=el.clientWidth+1));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Farm supervisor follow-ups: device widths, both report links, guarded navigation, explicit completion and retry, page boundaries, foreground/online/timer refresh, access revocation and account/period isolation.');
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));rmSync(temp,{recursive:true,force:true});
}
