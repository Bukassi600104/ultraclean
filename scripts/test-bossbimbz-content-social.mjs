import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');let role='content_manager';const cache=new Map();
function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;function resolve(name){if(name==='@/lib/auth')return {requireContentManager:async()=>{if(!['admin','content_manager'].includes(role))throw Error('Unauthorized');return {id:'synthetic-actor',role}}};if(name==='@/lib/supabase/server')return {createServerClient:()=>{throw Error('No database in crypto tests')}};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');return require(name)}new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports}
process.env.CONTENT_TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
const social=load('lib/content-social.ts');let checks=0;
const first=social.encryptSocialToken('synthetic-secret'),second=social.encryptSocialToken('synthetic-secret');assert.notEqual(first,second);assert.equal(social.decryptSocialToken(first),'synthetic-secret');assert.ok(!first.includes('synthetic-secret'));checks+=3;
const parts=first.split('.');parts[3]=Buffer.from('modified').toString('base64');assert.throws(()=>social.decryptSocialToken(parts.join('.')));checks++;
const state=social.socialState('actor');assert.equal(social.verifySocialState(state,'actor'),true);assert.equal(social.verifySocialState(state,'other'),false);assert.equal(social.verifySocialState(state+'altered','actor'),false);checks+=3;
assert.equal(social.socialConfig().configured,false);checks++;
for(const action of ['authorize','sync','disconnect']){const handler=load(`app/api/content/social/instagram/${action}/route.ts`),verb=action==='authorize'?'GET':'POST';assert.equal((await handler[verb]()).status,403);checks++;}
role='admin';assert.equal((await load('app/api/content/social/instagram/authorize/route.ts').GET()).status,503);checks++;
process.env.INSTAGRAM_APP_ID='synthetic-id';process.env.INSTAGRAM_APP_SECRET='synthetic-only';process.env.INSTAGRAM_REDIRECT_URI='https://example.invalid/api/content/social/instagram/callback';process.env.INSTAGRAM_API_VERSION='v24.0';
assert.equal(social.socialConfig().configured,true);checks++;
const response=await load('app/api/content/social/instagram/authorize/route.ts').GET();assert.equal(response.status,307);assert.equal(new URL(response.headers.get('location')).host,'www.instagram.com');const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=lax/i);checks+=5;
const callback=load('app/api/content/social/instagram/callback/route.ts');const invalid={nextUrl:new URL('https://example.invalid/api/content/social/instagram/callback?state=forged&code=synthetic'),cookies:{get:()=>({value:'forged'})}};assert.equal((await callback.GET(invalid)).status,400);checks++;
console.log(`PASS: ${checks} actual social crypto/OAuth/role checks. No provider or database requests.`);
