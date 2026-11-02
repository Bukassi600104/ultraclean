import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript'),cache=new Map();
let actor,profile,user,calls,profileFailure,authFailure,auditFailure,audits;
function reset(role='manager'){
 actor={id:'boss',role:'admin',suspended:false};profile={id:'staff',role,suspended:true};
 user={id:'staff',email:'same@example.com',password:'unchanged',app_metadata:{manager_access_removed:true,manager_access_removed_at:'2026-11-01T12:00:00Z',manager_access_removed_by:'boss',manager_setup_pending:true,unrelated:'preserve'}};
 calls=[];profileFailure=false;authFailure=false;auditFailure=false;audits=[];
}
const db={async rpc(name,args){assert.equal(name,'staff_restoration_audit');const row={record_type:'staff_account',record_id:args.p_target,operation:'restore_requested',actor_id:args.p_actor,reason:args.p_reason,before_value:{role:profile.role,suspended:profile.suspended,access_removed:true},after_value:null};calls.push(['audit',row]);if(auditFailure)return {data:null,error:{message:'private'}};const saved={id:`audit-${audits.length+1}`,...structuredClone(row)};audits.push(saved);return {data:saved.id,error:null}},from(name){assert.equal(name,'profiles');let update;const q={select(){return q},eq(key,id){assert.equal(key,'id');assert.equal(id,'staff');return q},single(){return Promise.resolve({data:structuredClone(profile),error:null})},update(value){update=value;return q},then(resolve){calls.push(['profile',update]);if(!profileFailure)Object.assign(profile,update);resolve({error:profileFailure?{message:'private'}:null})}};return q},auth:{admin:{async getUserById(){return {data:{user:structuredClone(user)},error:null}},async updateUserById(id,value){calls.push(['auth',value]);if(authFailure)return {error:{message:'private'}};Object.assign(user,value);return {error:null}}}}};
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;function resolve(name){if(name==='@/lib/auth')return {requireAdmin:async()=>{if(actor.role!=='admin'||actor.suspended)throw Error('denied');return actor}};if(name==='@/lib/supabase/server')return {createServerClient:()=>db};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');return require(name)}new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports}
const {POST}=load('app/api/managers/[id]/restore/route.ts');
const request=(body={reason:'  Same person returning  ',confirm_same_person:true})=>new Request('http://localhost/api/managers/staff/restore',{method:'POST',body:JSON.stringify(body)});
const run=body=>POST(request(body),{params:{id:'staff'}});
let checks=0;const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++};
for(const role of ['manager','property_manager','content_manager','farm_vet','farm_accountant']){
 reset(role);const before=structuredClone(user);
 check((await run()).status,200);check(calls.map(c=>c[0]),['profile','audit','auth']);check(profile.suspended,true);check(user.ban_duration,'876000h');check(user.password,before.password);check(user.email,before.email);check(profile.role,role);
 check(user.app_metadata.unrelated,'preserve');check(user.app_metadata.manager_setup_pending,true);check(user.app_metadata.manager_access_removed,false);check(user.app_metadata.manager_access_removed_at,before.app_metadata.manager_access_removed_at);
 const audit=user.app_metadata.manager_access_restorations[0];check(audit.actor_id,'boss');check(audit.reason,'Same person returning');check(audit.confirmed_same_person,true);check(audit.removed_at,before.app_metadata.manager_access_removed_at);check(Number.isNaN(Date.parse(audit.restored_at)),false);check(audit.audit_id,audits[0].id);check(audits[0].operation,'restore_requested');check(audits[0].after_value,null);check(audits[0].before_value,{role,suspended:true,access_removed:true});check(JSON.stringify(audits).includes('password'),false);
 calls=[];check((await run()).status,200);check(calls,[]);check(user.app_metadata.manager_access_restorations.length,1);
 // A later removal retains prior audit records and permits a fresh restoration.
 user.app_metadata.manager_access_removed=true;check((await run()).status,200);check(user.app_metadata.manager_access_restorations.length,2);check(user.app_metadata.manager_access_restorations[0],audit);
}
for(const body of [{reason:'',confirm_same_person:true},{reason:'x',confirm_same_person:false},{reason:'x'},{reason:'x'.repeat(501),confirm_same_person:true},{reason:'x',confirm_same_person:true,password:'new'}]){reset();check((await run(body)).status,400);check(calls,[])}
reset();actor.role='manager';check((await run()).status,401);check(calls,[]);
reset();actor.suspended=true;check((await run()).status,401);check(calls,[]);
reset('admin');check((await run()).status,403);check(calls,[]);
reset();actor.id='staff';check((await run()).status,403);check(calls,[]);
reset();user.app_metadata.manager_access_removed=false;check((await run()).status,409);check(calls,[]);
reset();user.app_metadata.manager_access_restorations={bad:true};check((await run()).status,409);check(calls,[]);
reset();profileFailure=true;check((await run()).status,503);check(calls.map(c=>c[0]),['profile']);check(user.app_metadata.manager_access_removed,true);
reset();profile.suspended=false;authFailure=true;check((await run()).status,503);check(profile.suspended,true);check(user.app_metadata.manager_access_removed,true);authFailure=false;check((await run()).status,200);check(user.app_metadata.manager_access_restorations.length,1);
check(audits.length,2);check(audits.every(row=>row.operation==='restore_requested'&&row.after_value===null),true);
reset();auditFailure=true;check((await run()).status,503);check(calls.map(c=>c[0]),['profile','audit']);check(user.app_metadata.manager_access_removed,true);check(profile.suspended,true);
reset();const outcomes=await Promise.all([run({reason:'First administrator request',confirm_same_person:true}),run({reason:'Second administrator request',confirm_same_person:true})]);check(outcomes.map(result=>result.status),[200,200]);check(audits.length,2);check(audits.map(row=>row.reason).sort(),['First administrator request','Second administrator request']);check(profile.suspended,true);check(user.ban_duration,'876000h');
console.log(`PASS: ${checks} isolated restoration checks; no production accounts changed.`);
