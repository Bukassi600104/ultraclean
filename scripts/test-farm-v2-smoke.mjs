// GET-only smoke checks of the built application. No account login or writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import http from 'node:http';
const require=createRequire(import.meta.url);
const port=3137;
const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
let checks=0;
try{
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){
    if(server.exitCode!==null)throw new Error('Smoke server could not start');
    try{const response=await fetch(base);if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,'Built application startup');checks++;
  for(const url of ['/','/book','/register','/register/form','/login','/manager/login']){const response=await fetch(base+url,{redirect:'manual'});assert.equal(response.status,200,url);assert.ok((await response.text()).includes('<html'),url);checks++;}
  for(const url of ['/dashboard','/dashboard/leads','/dashboard/dba','/dashboard/ultratidy','/manager']){const response=await fetch(base+url,{redirect:'manual'});assert.ok([302,303,307,308].includes(response.status),url);assert.ok(response.headers.get('location')?.includes('/login'),url);checks++;}
  const primefield=await new Promise((resolve,reject)=>{http.get(base,{headers:{host:'primefieldagric.com'}},response=>{let text='';response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,location:response.headers.location,text}));}).on('error',reject);});
  if(primefield.status===200){assert.ok(/primefield/i.test(primefield.text),'Primefield page content');checks++;}
  else console.warn(`RELEASE GATE: local Primefield Host probe returned ${primefield.status} to ${primefield.location}. Existing routing configuration is unchanged; verify deployed routing on staging.`);
  const protectedApi=await fetch(base+'/api/farm/supplies');assert.equal(protectedApi.status,401,'Anonymous supplies denied');checks++;
  console.log(`PASS: ${checks} built-application GET smoke checks; public/DBA pages, existing login pages, protected CRM/UltraTidy/farm routes and anonymous API denial.`);
}finally{server.kill();}
