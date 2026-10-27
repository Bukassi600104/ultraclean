// Actual CEO React + actual sidebar + project Tailwind. Only transport/auth/Next primitives are isolated.
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
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {DashboardHeader} from './components/dashboard/DashboardHeader';import {Sidebar} from './components/dashboard/Sidebar';createRoot(document.getElementById('root')).render(<div data-hq className="flex h-screen"><Sidebar/><main className="flex-1 min-w-0 overflow-y-auto"><DashboardHeader title="Audit page"/></main></div>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-next-auth',setup(builder){builder.onResolve({filter:/^(next\/(link|navigation|image)|@\/contexts\/AuthContext)$/},args=>({path:args.path,namespace:'mock'}));builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`:args.path==='next/image'?`import React from 'react';export default function Image({priority,...props}){return React.createElement('img',props);}`:args.path==='next/navigation'?`export const usePathname=()=>new URL(location.href).searchParams.get('path')||'/dashboard';`:`export const useAuth=()=>({profile:{name:'Bimbo',role:'admin'},signOut:()=>{}});`,loader:'js',resolveDir:process.cwd()}));}}]});
const artifacts=mkdtempSync(path.join(os.tmpdir(),'dashboard-navigation-ui-')),cssPath=path.join(artifacts,'styles.css');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',cssPath],{stdio:'pipe'});
const styles=readFileSync(cssPath,'utf8');
const server=http.createServer((req,res)=>{if(req.url.startsWith('/bundle.js')){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url.startsWith('/styles.css')){res.setHeader('Content-Type','text/css');res.end(styles);}else if(req.url==='/bossbiz-logo.png'){res.setHeader('Content-Type','image/png');res.end(readFileSync('public/bossbiz-logo.png'));}else{res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}});
const faults=[],calls=[];page.on('pageerror',error=>faults.push(error.message));

const routes=['appointments','leads','blog','courses','dba','farm','managers','settings','ultratidy',...['sales','expenses','inventory','supplies','feed-stock','daily-feed','daily-reports','operational-requests'].map(r=>'farm/'+r),...['inflow','expenses','inventory'].map(r=>'ultratidy/'+r),...['products','sales','products/new','products/edit/example'].map(r=>'dba/'+r),'blog/new','blog/edit/example','leads/example'];let checks=0;
try {
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of routes){await page.goto(origin+'/?path='+encodeURIComponent('/dashboard/'+path));const back=page.getByRole('link',{name:/^Back to/});await back.waitFor();assert.equal(await back.count(),1);assert.ok((await back.getAttribute('href')).startsWith('/dashboard'));assert.ok((await back.evaluate(el=>el.getBoundingClientRect().height))>=44);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;}
  await page.screenshot({path:artifacts+'/navigation-'+width+'.png',fullPage:true});
 }
 assert.deepEqual(faults,[]);console.log(`PASS ${checks} real header/browser route checks across 390/768/1440; screenshots ${artifacts}`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
