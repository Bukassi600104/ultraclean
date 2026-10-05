import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
let profile = null, signedOut = 0;
const response = { kind: 'next' };
const db = {
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile }) }) }) }),
  auth: { signOut: async () => { signedOut++; } },
};
const module = { exports: {} };
const source = ts.transpileModule(readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('require', 'module', 'exports', source)((name) => {
  if (name === 'next/server') return { NextResponse: {
    redirect: (url) => ({ kind: 'redirect', url: new URL(String(url)) }),
    rewrite: (url) => ({ kind: 'rewrite', url: new URL(String(url)) }),
  } };
  if (name === '@/lib/supabase/middleware') return { updateSession: async () => ({
    supabaseResponse: response, user: profile ? { id: profile.id } : null, supabase: db,
  }) };
  throw Error(`Unexpected middleware dependency: ${name}`);
}, module, module.exports);
function request(route, host = 'localhost') {
  const url = new URL(`https://${host}${route}`);
  url.clone = () => new URL(url.href);
  return { nextUrl: url, headers: new Headers({ host }) };
}
let checks = 0;
const failures = [];
async function test(label, work) {
  try { await work(); checks++; } catch (error) { failures.push(`${label}: ${error.message}`); }
}
const domains = { manager: '/manager', property_manager: '/property', content_manager: '/content', admin: '/dashboard' };
const paths = ['/manager', '/manager/sales', '/property', '/property/units', '/content', '/content/performance', '/dashboard', '/dashboard/leads'];
for (const role of [null, 'admin', 'manager', 'property_manager', 'content_manager', 'unknown']) {
  profile = role ? { id: 'synthetic-user', role, suspended: false } : null;
  for (const route of paths) await test(`${role || 'anonymous'} ${route}`, async () => {
    const own = domains[role];
    const allowed = role === 'admin' || (own && (route === own || route.startsWith(`${own}/`)));
    const result = await module.exports.middleware(request(route));
    assert.equal(result.kind, allowed ? 'next' : 'redirect');
    if (!allowed) assert.notEqual(result.url.pathname, route, 'denial must leave requested private page');
  });
}
for (const role of ['property_manager', 'content_manager']) {
  profile = { id: 'synthetic-user', role, suspended: true };
  for (const route of [domains[role], `${domains[role]}/records`]) await test(`suspended ${role} ${route}`, async () => {
    const result = await module.exports.middleware(request(route));
    assert.equal(result.kind, 'redirect');
    assert.notEqual(result.url.pathname, route);
  });
}
profile = null;
for (const route of ['/login', '/manager/login', '/property/login', '/content/login', '/', '/services']) {
  await test(`public ${route}`, async () => assert.equal((await module.exports.middleware(request(route))).kind, 'next'));
}
for (const [role, landing] of Object.entries(domains)) {
  profile = { id: 'synthetic-user', role, suspended: false };
  await test(`${role} generic login landing`, async () => {
    const result = await module.exports.middleware(request('/login'));
    assert.equal(result.kind, 'redirect');
    if (role === 'manager') assert.equal(result.url.href, 'https://farm.primefieldagric.com/');
    else assert.equal(result.url.pathname, landing);
  });
}
for (const role of [null, 'admin', 'manager', 'property_manager', 'content_manager']) {
  profile = role ? { id: 'synthetic-user', role, suspended: false } : null;
  await test(`${role || 'anonymous'} farm host`, async () => {
    const result = await module.exports.middleware(request('/sales', 'farm.primefieldagric.com'));
    assert.equal(result.kind, role === 'admin' || role === 'manager' ? 'rewrite' : 'redirect');
    assert.equal(result.url.pathname, role === 'admin' || role === 'manager' ? '/manager/sales' : '/login');
  });
  await test(`${role || 'anonymous'} leads host`, async () => {
    const result = await module.exports.middleware(request('/dashboard/leads', 'leads.ultratidycleaning.com'));
    assert.equal(result.kind, role === 'admin' ? 'next' : 'redirect');
  });
}
profile = { id: 'synthetic-user', role: 'manager', suspended: true };
await test('suspended farm host signs out', async () => {
  signedOut = 0;
  const result = await module.exports.middleware(request('/sales', 'farm.primefieldagric.com'));
  assert.equal(result.kind, 'redirect'); assert.equal(signedOut, 1);
});
if (failures.length) {
  console.error(`FAIL: ${failures.length} route checks; ${checks} passed. Actual middleware with synthetic sessions only.`);
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else console.log(`PASS: ${checks} actual middleware route checks; role separation, anonymous access, suspension, login and existing host behavior.`);
