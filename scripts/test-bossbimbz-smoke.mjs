// GET-only checks of the completed build; no account login, tokens or writes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),port=3138,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
let checks=0;
try{
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Built smoke server failed');try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);checks++;
 for(const path of ['/property/login','/content/login']){const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,200,path);assert.match(await response.text(),/Manager/);checks++;}
 for(const path of ['/property','/property/tenancies','/content','/content/sales','/dashboard/farm/daily-reports','/dashboard/farm/operational-requests','/dashboard/farm/feed-stock','/dashboard/farm/daily-feed','/manager/daily-report','/manager/feed-stock']){const response=await fetch(base+path,{redirect:'manual'});assert.ok([302,303,307,308].includes(response.status),path);assert.match(response.headers.get('location'),/login/);checks++;}
 for(const [path,status] of [['/api/property/properties',403],['/api/content/records',403],['/api/content/social/status',403],['/api/ceo/overview',403],['/api/farm/feed-stock',401],['/api/farm/daily-reports',401],['/api/farm/operational-requests',401]]){const response=await fetch(base+path);assert.equal(response.status,status,path);checks++;}
 const manifest=require('../.next/server/app-paths-manifest.json');for(const path of ['/dashboard/farm/daily-feed/page','/dashboard/farm/feed-stock/page','/manager/daily-feed/page']){assert.ok(Object.keys(manifest).some(key=>key.endsWith(path)),`Built target exists: ${path}`);checks++;}
 console.log(`PASS: ${checks} built expansion GET-only smoke checks; genuine routes/login pages and anonymous private denial.`);
}finally{server.kill();}
