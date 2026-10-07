// Actual routes + actual auth guards. Only session and database transports are synthetic.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');let profile=null,calls=[];
const query={select(){return this},order(){return this},eq(){return this},range(){return this},then(resolve){resolve({data:[],count:0,error:null})}};
const db={from(){calls.push('read');return {...query}},rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'synthetic-saved'},error:null}}};
const cache=new Map();function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
new Function('require','module','exports',source)(name=>{
 if(name==='next/server')return {NextResponse:{json:(data,init)=>Response.json(data,init)}};
 if(name==='next/headers')return {cookies:()=>({getAll:()=>[],set:()=>{}})};
 if(name==='@supabase/ssr')return {createServerClient:()=>({auth:{getUser:async()=>({data:{user:profile?{id:profile.id}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})})};
 if(name==='@/lib/supabase/server')return {createServerClient:()=>db};
 if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.join(path.dirname(file),name)+'.ts');return require(name);
},mod,mod.exports);return mod.exports;}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://isolated.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic';
const actor='00000000-0000-4000-8000-000000000001',retry='00000000-0000-4000-8000-000000000002';
const endpoints=[
 {role:'manager',file:'app/api/farm/daily-reports/route.ts',kind:null,denied:401,body:{report_date:'2026-10-05',sections:{farm1:{},farm2:{},livestock:{},crops:{},people:{},problems:{}},decision_required:false}},
 {role:'property_manager',file:'app/api/property/[kind]/route.ts',kind:'properties',denied:403,body:{name:'Isolated property',address:'Isolated address',status:'active',currency:'NGN',request_id:retry}},
 {role:'content_manager',file:'app/api/content/[kind]/route.ts',kind:'records',denied:403,body:{request_id:retry,data:{title:'Isolated content',platform:'instagram',content_type:'reel',status:'draft'}}}
];let checks=0;
for(const endpoint of endpoints){const api=load(endpoint.file),ctx={params:{kind:endpoint.kind}};
 for(const role of [null,'manager','property_manager','content_manager','admin']){
  for(const suspended of role?[false,true]:[false]){
   profile=role?{id:actor,role,suspended}:null;const allowed=!!role&&!suspended&&(role==='admin'||role===endpoint.role);
   for(const verb of ['GET','POST']){
    calls=[];const request=new Request('http://isolated.invalid/api',{method:verb,...(verb==='POST'?{body:JSON.stringify(endpoint.body),headers:{'X-Request-ID':retry}}:{})});
    const response=await api[verb](request,ctx);if(allowed)assert.ok(response.status>=200&&response.status<300,`${endpoint.role} ${role} ${verb}: ${response.status}`);else{assert.equal(response.status,endpoint.denied);assert.equal(calls.length,0);}checks++;
    if(allowed&&verb==='POST'){assert.equal(calls.find(c=>typeof c==='object').args.p_actor,actor);checks++;}
   }
  }
 }
}
console.log(`PASS: ${checks} actual domain API/real session guard checks; all roles, suspended users, anonymous and trusted actors. No network database.`);
