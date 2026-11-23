import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import os from 'node:os';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test'),{build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const contents=`import React from 'react';import {createRoot} from 'react-dom/client';import {AuthProvider} from './contexts/AuthContext';import {DashboardShell} from './components/dashboard/DashboardShell';import ManagerLayout from './app/(manager)/manager/layout';import CeoLogin from './app/(dashboard)/login/page';import FarmLogin from './app/(manager)/manager/login/page';import PropertyLogin from './components/property/PropertyLogin';import ContentLogin from './app/(content)/content/login/page';const app=new URL(location.href).searchParams.get('app');window.mode='reject';createRoot(document.getElementById('root')).render(<AuthProvider>{app==='ceo'?<DashboardShell><CeoLogin/></DashboardShell>:app==='farm'?<ManagerLayout><FarmLogin/></ManagerLayout>:app==='property'?<PropertyLogin/>:<ContentLogin/>}</AuthProvider>);`;
const auth=`const app=new URL(location.href).searchParams.get('app'),role={ceo:'admin',farm:'manager',property:'property_manager',content:'content_manager'}[app];let signed=false;export function createClient(){return {auth:{signInWithPassword:async()=>{if(window.mode==='reject')throw Error('Connection failed');signed=true;return {data:{user:{id:'actor'}},error:null}},getUser:async()=>({data:{user:signed?{id:'actor'}:null}}),signOut:async()=>{signed=false;return {}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:window.mode==='missing-profile'?null:{id:'actor',role:window.fixtureRole||role,name:'Staff',email:'staff@example.invalid',suspended:false},error:null})})})})}}`;
const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'transport-next',setup(b){b.onResolve({filter:/^(next\/(link|image|navigation)|@\/lib\/supabase\/client)$/},a=>({path:a.path,namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path.endsWith('/client')?auth:a.path==='next/navigation'?`const app=new URL(location.href).searchParams.get('app');export const usePathname=()=>app==='farm'?'/manager/login':'/login';export const useRouter=()=>({push:path=>window.destination=path,replace:path=>window.destination=path,refresh(){}});`:`import React from 'react';export default function Primitive({children,priority,...props}){return React.createElement('${a.path.endsWith('image')?'img':'a'}',props,children)}`,loader:'jsx',resolveDir:process.cwd()}));}}]});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({serviceWorkers:'block'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const ceoHost='https://leads.ultratidycleaning.com';
const farmHost='https://farm.primefieldagric.com';
const origins=new Set([ceoHost,farmHost,'http://localhost']);
const html='<div id="root"></div><script src="/bundle.js"></script>';
// Intercept every request before navigation, including document loads when a new account signs in.
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(!origins.has(url.origin))return route.abort();
  if(url.pathname==='/bundle.js')return route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text});
  if(url.pathname==='/dashboard')return route.fulfill({contentType:'text/html',body:'<h1>Dashboard destination</h1>'});
  if(route.request().resourceType()==='document')return route.fulfill({contentType:'text/html',body:html});
  return route.fulfill({status:204});
});

async function enterCredentials(app,host,path){
  await page.goto(host+path+'?app='+app);
  await page.locator('input[type="email"]').fill('staff@example.invalid');
  await page.locator('input[type="password"]').fill('SyntheticPassword123');
  return page.locator('form button[type=submit], form button:not([type])').last();
}
let checks=0;
try{
  for(const [app,host,path,destination] of [
    ['ceo',ceoHost,'/login','/dashboard'],['farm',farmHost,'/login','/sales'],
    ['property',ceoHost,'/property/login','/property'],['content',ceoHost,'/content/login','/content'],
  ]){
    const button=await enterCredentials(app,host,path);
    if(app==='ceo'){
      await page.getByText('Sign in to your dashboard',{exact:true}).waitFor();
      assert.equal(await page.getByText(/control cent(?:er|re)/i).count(),0);
      checks+=2;
    }
    for(const mode of ['reject','missing-profile']){
      await page.evaluate(mode=>window.mode=mode,mode);
      await button.click();
      await page.waitForFunction(()=>!document.querySelector('form button:disabled'));
      assert.equal(await page.evaluate(()=>window.destination),undefined);
      assert.equal(new URL(page.url()).pathname,path);
      checks+=2;
    }
    await page.evaluate(()=>window.mode='ok');
    if(app==='ceo'){
      await page.evaluate(()=>window.fixtureRole='content_manager');
      await button.click();
      await page.getByText('Sign in with your CEO account to open this dashboard.',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.destination),undefined);
      assert.equal(new URL(page.url()).pathname,'/login');
      await page.evaluate(()=>window.fixtureRole='admin');
      await button.click();
      await page.waitForURL(ceoHost+'/dashboard');
      checks+=3;
    }else{
      await button.click();
      await page.waitForFunction(()=>!!window.destination);
      assert.equal(await page.evaluate(()=>window.destination),destination);
      checks++;
    }
  }
  const contentButton=await enterCredentials('content',ceoHost,'/content/login');
  await page.evaluate(()=>{window.mode='ok';window.fixtureRole='admin';});
  await contentButton.click();
  await page.waitForFunction(()=>window.destination==='/content');
  checks++;
  assert.deepEqual(errors,[]);
  console.log('PASS '+checks+' isolated login form and layout checks, including CEO hard navigation, account switching, and dedicated staff portals');
}finally{await browser.close();}
