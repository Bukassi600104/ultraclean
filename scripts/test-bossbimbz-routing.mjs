import assert from 'node:assert/strict';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';
let profile = null, signedOut = 0, authenticatedWithoutProfile = false;
const sessionCookie={name:'rotated-fixture',value:'fresh',path:'/',httpOnly:true};
const response = {kind:'next',cookies:{getAll:()=>[sessionCookie]}};
const db = {
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile }) }) }) }),
  auth: { signOut: async () => { signedOut++; } },
};
const {middleware} = typescriptLoader({
  'next/server': { NextResponse: {
    next: () => response,
    json: (body,options) => ({kind:'json',body,status:options.status}),
    redirect: (url) => {
      const returned=[];
      return {kind:'redirect',url:new URL(String(url)),cookies:{set:cookie=>returned.push(cookie),getAll:()=>returned}};
    },
    rewrite: (url) => ({ kind: 'rewrite', url: new URL(String(url)) }),
  } },
  '@/lib/supabase/middleware': { updateSession: async () => ({
    supabaseResponse: response, user: profile ? { id: profile.id } : authenticatedWithoutProfile ? {id:'missing-profile'} : null, supabase: db,
  }) },
})('middleware.ts');
function request(route, host = 'localhost') {
  const url = new URL(`https://${host}${route}`);
  url.clone = () => new URL(url.href);
  return { url:url.href, nextUrl: url, headers: new Headers({ host }) };
}
let checks = 0;
const failures = [];
async function test(label, work) {
  try { await work(); checks++; } catch (error) { failures.push(`${label}: ${error.message}`); }
}
const domains = { manager: '/manager', property_manager: '/property', content_manager: '/content', admin: '/dashboard' };
const paths = ['/manager', '/manager/sales', '/property', '/property/units', '/content', '/content/performance', '/dashboard', '/dashboard/leads', '/dashboard/properties', '/dashboard/content'];
for (const role of [null, 'admin', 'manager', 'property_manager', 'content_manager', 'unknown']) {
  profile = role ? { id: 'synthetic-user', role, suspended: false } : null;
  for (const route of paths) await test(`${role || 'anonymous'} ${route}`, async () => {
    const own = domains[role];
    const allowed = role === 'admin' || (own && (route === own || route.startsWith(`${own}/`)));
    const result = await middleware(request(route));
    assert.equal(result.kind, allowed ? 'next' : 'redirect');
    if (!allowed) assert.notEqual(result.url.pathname, route, 'denial must leave requested private page');
  });
}
for (const role of ['property_manager', 'content_manager']) {
  profile = { id: 'synthetic-user', role, suspended: true };
  for (const route of [domains[role], `${domains[role]}/records`]) await test(`suspended ${role} ${route}`, async () => {
    const result = await middleware(request(route));
    assert.equal(result.kind, 'redirect');
    assert.notEqual(result.url.pathname, route);
  });
}
profile = null;
for (const route of ['/login', '/manager/login', '/property/login', '/content/login', '/', '/services']) {
  await test(`public ${route}`, async () => assert.equal((await middleware(request(route))).kind, 'next'));
}
for (const [role, landing] of Object.entries(domains)) {
  profile = { id: 'synthetic-user', role, suspended: false };
  await test(`${role} generic login landing`, async () => {
    const result = await middleware(request('/login'));
    assert.equal(result.kind, 'redirect');
    if (role === 'manager') assert.equal(result.url.href, 'https://farm.primefieldagric.com/');
    else assert.equal(result.url.pathname, landing);
  });
}
for (const role of [null, 'admin', 'manager', 'property_manager', 'content_manager']) {
  profile = role ? { id: 'synthetic-user', role, suspended: false } : null;
  await test(`${role || 'anonymous'} farm host`, async () => {
    const result = await middleware(request('/sales', 'farm.primefieldagric.com'));
    assert.equal(result.kind, role === 'admin' || role === 'manager' ? 'rewrite' : 'redirect');
    assert.equal(result.url.pathname, role === 'admin' || role === 'manager' ? '/manager/sales' : '/login');
  });
  await test(`${role || 'anonymous'} leads host`, async () => {
    const result = await middleware(request('/dashboard/leads', 'leads.ultratidycleaning.com'));
    assert.equal(result.kind, role === 'admin' ? 'next' : 'redirect');
  });
}
// Follow the whole redirect chain. A protected page can deny access and its login can still send the browser to the wrong workspace.
const leadsHost = 'leads.ultratidycleaning.com';
async function finalPath(start) {
  let path = start;
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await middleware(request(path, leadsHost));
    if (result.kind === 'next') return new URL(path, 'https://' + leadsHost).pathname;
    assert.equal(result.kind, 'redirect');
    assert.equal(result.url.host, leadsHost, 'CEO entry stays on the CEO host');
    path = result.url.pathname + result.url.search;
  }
  assert.fail('CEO entry entered a redirect loop');
}
for (const role of [null, 'admin', 'content_manager', 'manager', 'property_manager', 'farm_vet', 'farm_accountant', 'unknown']) {
  profile = role ? { id:'synthetic-user', role, suspended:false } : null;
  for (const entry of ['/', '/dashboard', '/login']) {
    await test('CEO entry with ' + (role || 'anonymous') + ' at ' + entry, async () => {
      assert.equal(await finalPath(entry), role === 'admin' ? '/dashboard' : '/login');
    });
  }
}
profile = {id:'synthetic-user',role:'admin',suspended:false};
await test('CEO redirects deliver the refreshed session cookie', async () => {
  for(const start of ['/','/login']){
    const redirect=await middleware(request(start,leadsHost));
    assert.deepEqual(redirect.cookies.getAll(),[sessionCookie]);
  }
});
profile = {id:'synthetic-user',role:'admin',suspended:true};
await test('suspended CEO cannot enter the dashboard', async () => assert.equal(await finalPath('/dashboard'), '/login'));
for (const role of ['admin','content_manager']) {
  profile = {id:'synthetic-user',role,suspended:false};
  await test('explicit Content workspace remains accessible to ' + role, async () => {
    assert.equal(await finalPath('/content'), '/content');
    assert.equal(await finalPath('/content/login'), '/content/login');
  });
}
profile = { id: 'synthetic-user', role: 'manager', suspended: true };
await test('suspended farm host signs out', async () => {
  signedOut = 0;
  const result = await middleware(request('/sales', 'farm.primefieldagric.com'));
  assert.equal(result.kind, 'redirect'); assert.equal(signedOut, 1);
});
profile=null;for(const host of ['localhost','farm.primefieldagric.com','leads.ultratidycleaning.com'])for(const asset of ['/farm-manifest.json','/property-manifest.json','/content-manifest.json','/property-sw.js','/content-sw.js'])await test('public install asset '+host+asset,async()=>{assert.equal((await middleware(request(asset,host))).kind,'next')});
for(const role of ['manager','admin','property_manager',null]){profile=role?{id:'synthetic-user',role,suspended:false}:null;for(const route of ['/manager','/manager/feed-stock','/manager/onboarding'])await test('farm canonical '+role+route,async()=>{const result=await middleware(request(route,'farm.primefieldagric.com'));assert.equal(result.kind,role==='manager'||role==='admin'?'next':'redirect');});}
for(const host of ['localhost','farm.primefieldagric.com','leads.ultratidycleaning.com']) {
 profile={id:'synthetic-user',role:'admin',suspended:false};
 await test('explicit reauthentication '+host,async()=>assert.notEqual((await middleware(request('/login?reauth=1',host))).kind,'redirect'));
 profile=null;authenticatedWithoutProfile=true;
 await test('unavailable profile cannot loop '+host,async()=>assert.notEqual((await middleware(request('/login',host))).kind,'redirect'));
 authenticatedWithoutProfile=false;
 profile={id:'synthetic-user',role:'admin',suspended:true};
 await test('suspended login cannot loop '+host,async()=>assert.notEqual((await middleware(request('/login',host))).kind,'redirect'));
}
profile=null;await test('expired farm API returns 401, not login HTML',async()=>{const result=await middleware(request('/api/farm/daily-reports/submit','farm.primefieldagric.com'));assert.equal(result.kind,'json');assert.equal(result.status,401);});
if (failures.length) {
  console.error(`FAIL: ${failures.length} route checks; ${checks} passed. Actual middleware with synthetic sessions only.`);
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else console.log(`PASS: ${checks} actual middleware route checks; role separation, anonymous access, suspension, login and existing host behavior.`);
