import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const require=createRequire(import.meta.url),{chromium}=require('@playwright/test');
const {build}=await import(pathToFileURL(path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/esbuild/lib/main.js')));
const contents=`import React from 'react';import {createRoot} from 'react-dom/client';import {AuthProvider,useAuth} from './contexts/AuthContext';
window.mode='reject';
function Probe(){const auth=useAuth();return <><p>{auth.isLoading?'Loading':auth.error||auth.profile?.name||'Signed out'}</p><button onClick={auth.retry}>Retry</button><input aria-label="Draft"/></>}
createRoot(document.getElementById('root')).render(<AuthProvider><Probe/></AuthProvider>);`;
const boundary=`export function createClient(){return {auth:{getUser:async()=>{if(window.mode==='reject')throw Error('private provider detail');return {data:{user:{id:'A'}}}},onAuthStateChange:callback=>{window.authEvent=callback;return {data:{subscription:{unsubscribe(){}}}}}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:window.mode==='profile-error'?null:{id:'A',name:'Bimbo',role:'admin'}})})})})}}`;
const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},plugins:[{name:'auth-transport',setup(builder){builder.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:'client',namespace:'test'}));builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:boundary,loader:'js'}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/bundle.js"></script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('AUTH_UNAVAILABLE',{exact:true}).waitFor();
 assert.doesNotMatch(await page.locator('body').innerText(),/private provider detail/);
 await page.evaluate(()=>window.mode='ok');await page.getByRole('button',{name:'Retry'}).click();await page.getByText('Bimbo',{exact:true}).waitFor();
 await page.getByLabel('Draft').fill('retain');await page.evaluate(()=>window.authEvent('TOKEN_REFRESHED',{user:{id:'A'}}));assert.equal(await page.getByLabel('Draft').inputValue(),'retain');
 await page.evaluate(()=>window.authEvent('SIGNED_OUT',null));await page.getByText('Signed out',{exact:true}).waitFor();
 await page.evaluate(()=>{window.mode='profile-error';window.authEvent('SIGNED_IN',{user:{id:'A'}})});await page.getByText('PROFILE_UNAVAILABLE',{exact:true}).waitFor();
 console.log('PASS actual AuthProvider: rejection recovery, safe diagnostic, session refresh, signout and profile error');
}finally{await browser.close();await new Promise(r=>server.close(r));}
