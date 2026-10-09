import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
let actor={id:'admin',role:'admin',suspended:false},profiles=[],users={},calls=[],profileError=false,authError=false;
const cache=new Map();
const db={from(){let match=null,roles=null,update=null,single=false;const q={select(){return q},eq(k,v){match=[k,v];return q},in(k,v){roles=v;return q},order(){return q},range(){return q},update(v){update=v;return q},single(){single=true;return q},then(resolve){let rows=profiles.filter(p=>(!match||p[match[0]]===match[1])&&(!roles||roles.includes(p.role)));if(update){calls.push(['profile',update]);if(!profileError)rows.forEach(p=>Object.assign(p,update))}resolve({data:single?rows[0]??null:rows,error:profileError?{message:'private error'}:null})}};return q},auth:{admin:{async createUser(v){calls.push(['create',v]);const id='new-user';users[id]={id,app_metadata:v.app_metadata??{}};profiles.push({id,role:'manager',name:null,suspended:false});return {data:{user:users[id]},error:null}},async getUserById(id){return {data:{user:users[id]??null},error:null}},async updateUserById(id,v){calls.push(['auth',v]);if(authError)return {data:{user:null},error:{message:'private auth error'}};users[id]={...users[id],...v};return {data:{user:users[id]},error:null}},async deleteUser(id){calls.push(['delete',id]);return {error:null}}}}};
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;function resolve(name){if(name==='@/lib/auth')return {requireAdmin:async()=>{if(actor.role!=='admin'||actor.suspended)throw Error('denied');return actor}};if(name==='@/lib/supabase/server')return {createServerClient:()=>db};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');return require(name)}new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports}
const collection=load('app/api/managers/route.ts'),item=load('app/api/managers/[id]/route.ts');
const req=(method,body)=>new Request('http://localhost/api/managers',{method,body:body===undefined?undefined:JSON.stringify(body)}),ctx=id=>({params:{id}});
let checks=0;const check=(a,b)=>{assert.equal(a,b);checks++};
for(const role of ['manager','property_manager','content_manager']){
 profiles=[];users={};calls=[];
 check((await collection.POST(req('POST',{name:'Staff Name',email:'staff@example.com',password:'Secure123!',role}))).status,201);
 check(profiles[0].role,role);
 profiles.push({id:'existing',role,name:'Existing',suspended:false});users.existing={id:'existing',app_metadata:{other:'preserve'}};
 check((await collection.GET()).status,200);check((await (await collection.GET()).json()).length,2);
 check((await item.PUT(req('PUT',{suspended:true}),ctx('existing'))).status,200);check(profiles[1].suspended,true);check(users.existing.ban_duration,'876000h');
 check((await item.PUT(req('PUT',{suspended:false}),ctx('existing'))).status,200);check(profiles[1].suspended,false);check(users.existing.ban_duration,'none');
 check((await item.DELETE(req('DELETE'),ctx('existing'))).status,200);check(profiles[1].suspended,true);check(users.existing.app_metadata.manager_access_removed,true);check(users.existing.app_metadata.other,'preserve');check(calls.some(c=>c[0]==='delete'),false);
 check((await item.PUT(req('PUT',{suspended:false}),ctx('existing'))).status,409);
 check((await item.DELETE(req('DELETE'),ctx('existing'))).status,200);
}
check((await collection.POST(req('POST',{name:'Staff Name',email:'staff@example.com',password:'Secure123!',role:'admin'}))).status,400);
profiles.push({id:'boss',role:'admin'});users.boss={id:'boss',app_metadata:{}};
check((await item.DELETE(req('DELETE'),ctx('boss'))).status,403);
check((await item.PUT(req('PUT',{suspended:true}),ctx('boss'))).status,403);
check((await item.PUT(req('PUT',{}),ctx('existing'))).status,400);
actor.role='property_manager';check((await collection.GET()).status,401);check((await collection.POST(req('POST',{}))).status,401);check((await item.DELETE(req('DELETE'),ctx('existing'))).status,401);actor.role='admin';
profileError=true;calls=[];check((await collection.POST(req('POST',{name:'Staff Name',email:'staff@example.com',password:'Secure123!',role:'content_manager'}))).status,500);check(calls.some(c=>c[0]==='delete'),true);profileError=false;
profiles=[{id:'failure',role:'manager',suspended:false}];users.failure={id:'failure',app_metadata:{}};authError=true;
check((await item.PUT(req('PUT',{suspended:true}),ctx('failure'))).status,503);check(profiles[0].suspended,true);
console.log(`PASS: ${checks} manager-account API checks (isolated Auth/database doubles; no live accounts changed).`);
