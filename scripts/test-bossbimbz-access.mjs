import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
let profile=null;
const cache=new Map();
function load(filename){
 const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 function resolve(name){
  if(name==='next/headers')return {cookies:()=>({getAll:()=>[],set:()=>{}})};
  if(name==='@supabase/ssr')return {createServerClient:()=>({auth:{getUser:async()=>({data:{user:profile?{id:profile.id}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})})};
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
  if(name.startsWith('.'))return load(path.join(path.dirname(file),name)+'.ts');
  return require(name);
 }
 new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports;
}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://isolated.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-only';
const auth=load('lib/auth.ts');
assert.equal(typeof auth.requirePropertyManager,'function','Property guard is implemented');
assert.equal(typeof auth.requireContentManager,'function','Content guard is implemented');
let checks=2;
const guards={farm:auth.requireManager,property:auth.requirePropertyManager,content:auth.requireContentManager,ceo:auth.requireAdmin};
for(const role of ['admin','manager','property_manager','content_manager']){
 profile={id:'00000000-0000-4000-8000-000000000001',role,suspended:false};
 for(const [domain,guard] of Object.entries(guards)){
  const allowed=role==='admin'||({manager:'farm',property_manager:'property',content_manager:'content'})[role]===domain;
  if(allowed)assert.equal((await guard()).role,role);else await assert.rejects(guard,/Unauthorized/);checks++;
 }
}
for(const guard of Object.values(guards)){profile=null;await assert.rejects(guard,/Unauthorized/);checks++;}
for(const role of ['manager','property_manager','content_manager']){profile={id:'00000000-0000-4000-8000-000000000001',role,suspended:true};for(const guard of [auth.requireManager,auth.requirePropertyManager,auth.requireContentManager]){await assert.rejects(guard,/Unauthorized/);checks++;}}
console.log(`PASS: ${checks} actual server auth guard checks; four roles, anonymous and suspended access. Synthetic session only.`);
