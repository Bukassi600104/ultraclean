/**
 * Final test: Fresh session per section to avoid refresh token rotation issues.
 * Tests auth, manager CRUD, security, all routes.
 */
const { createClient } = require("@supabase/supabase-js");

const BASE = "http://localhost:3000";
const SUPABASE_URL = "https://gsxqrjywtugeuexrjcln.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzeHFyanl3dHVnZXVleHJqY2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTAwODMsImV4cCI6MjA4NjQ2NjA4M30.1saBTigbC0HU9sNuSEkxMXwDtIhgnYv6SIHXtemluww";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzeHFyanl3dHVnZXVleHJqY2xuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg5MDA4MywiZXhwIjoyMDg2NDY2MDgzfQ.4zi9-LFfqGbKM_sHHE8hj7LYvr0yJCOGrUwKM2NSNIQ";

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  ✓ ${name}`); }
function fail(name, reason) { failed++; console.error(`  ✗ ${name}: ${reason}`); }

// Get a FRESH session each time to avoid refresh token rotation issues
async function freshSession(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  const ref = "gsxqrjywtugeuexrjcln";
  const cookieName = `sb-${ref}-auth-token`;
  const sessionData = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: "bearer",
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: data.session.user,
  });
  const chunkSize = 3180;
  const chunks = [];
  for (let i = 0; i < sessionData.length; i += chunkSize) chunks.push(sessionData.substring(i, i + chunkSize));
  return chunks.map((c, i) => {
    const name = chunks.length === 1 ? cookieName : `${cookieName}.${i}`;
    return `${name}=${encodeURIComponent(c)}`;
  }).join("; ");
}

async function apiFetch(path, options = {}, cookies = "") {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (cookies) headers["Cookie"] = cookies;
  return fetch(`${BASE}${path}`, { ...options, headers, redirect: "manual" });
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // ═══ 1. AUTH FLOW ═══
  console.log("\n═══ 1. AUTH FLOW ═══\n");

  const adminCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  ok("Admin login succeeds");

  const mgrCookies = await freshSession("manager@primefield.ng", "Primefield2025!");
  ok("Manager login succeeds");

  // Bad password
  const badClient = createClient(SUPABASE_URL, ANON_KEY);
  const { error: badErr } = await badClient.auth.signInWithPassword({ email: "hello@ultratidycleaning.com", password: "wrong" });
  if (badErr) ok("Invalid password rejected"); else fail("Invalid password", "Should fail");

  // Route protection (use fresh cookies for EACH protected route test)
  let res = await apiFetch("/dashboard", {}, "");
  if (res.status === 307) ok("Dashboard no auth → 307"); else fail("Dashboard no auth", `${res.status}`);

  res = await apiFetch("/dashboard", {}, adminCookies);
  if (res.status === 200) ok("Dashboard admin → 200"); else fail("Dashboard admin", `${res.status}`);

  // Fresh manager cookies for this test
  const mgrCookies2 = await freshSession("manager@primefield.ng", "Primefield2025!");
  res = await apiFetch("/dashboard", {}, mgrCookies2);
  if (res.status === 307) ok("Dashboard manager → 307 (denied)"); else fail("Dashboard manager", `${res.status}`);

  res = await apiFetch("/manager/sales", {}, "");
  if (res.status === 307) ok("Manager portal no auth → 307"); else fail("Manager no auth", `${res.status}`);

  const mgrCookies3 = await freshSession("manager@primefield.ng", "Primefield2025!");
  res = await apiFetch("/manager/sales", {}, mgrCookies3);
  if (res.status === 200) ok("Manager portal manager → 200"); else fail("Manager portal", `${res.status}`);

  const adminCookies2 = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  res = await apiFetch("/login", {}, adminCookies2);
  if (res.status === 307) ok("Login with auth → redirect"); else fail("Login redirect", `${res.status}`);

  // ═══ 2. MANAGER CRUD ═══
  console.log("\n═══ 2. MANAGER CRUD ═══\n");
  await delay(1000);

  const crudCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");

  // GET managers
  res = await apiFetch("/api/managers", {}, crudCookies);
  const mgrs = await res.json();
  if (res.status === 200 && Array.isArray(mgrs)) ok(`GET managers → 200 (${mgrs.length})`);
  else fail("GET managers", `${res.status}`);

  // POST create
  const crudCookies2 = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  res = await apiFetch("/api/managers", {
    method: "POST",
    body: JSON.stringify({ name: "Test Mgr", email: "test-mgr@example.com", password: "TestPass123!" }),
  }, crudCookies2);
  const created = await res.json();
  let testId = null;
  if (res.status === 201 && created.role === "manager") {
    ok("POST create → 201"); testId = created.id;
  } else fail("POST create", `${res.status}: ${JSON.stringify(created)}`);

  // PUT reset password
  if (testId) {
    const crudCookies3 = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
    res = await apiFetch(`/api/managers/${testId}`, {
      method: "PUT",
      body: JSON.stringify({ password: "NewPass456!" }),
    }, crudCookies3);
    if (res.status === 200) ok("PUT reset password → 200"); else fail("PUT reset", `${res.status}`);

    // Verify new password
    await delay(500);
    const testClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: newPwErr } = await testClient.auth.signInWithPassword({
      email: "test-mgr@example.com", password: "NewPass456!",
    });
    if (!newPwErr) ok("New password works"); else fail("New password", newPwErr.message);
  }

  // Validation tests
  const valCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  res = await apiFetch("/api/managers", {
    method: "POST", body: JSON.stringify({ name: "Bad", email: "bad@test.com", password: "weak" }),
  }, valCookies);
  if (res.status === 400) ok("Weak password → 400"); else fail("Weak pw", `${res.status}`);

  const valCookies2 = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  res = await apiFetch("/api/managers", {
    method: "POST", body: JSON.stringify({ name: "Bad", email: "not-email", password: "StrongPass1!" }),
  }, valCookies2);
  if (res.status === 400) ok("Invalid email → 400"); else fail("Invalid email", `${res.status}`);

  // ═══ 3. SECURITY ═══
  console.log("\n═══ 3. SECURITY ═══\n");
  await delay(1000);

  // Unauth
  res = await apiFetch("/api/managers");
  if (res.status === 401) ok("GET managers unauth → 401"); else fail("Unauth GET", `${res.status}`);

  // Manager can't manage managers
  const secMgrCookies = await freshSession("manager@primefield.ng", "Primefield2025!");
  res = await apiFetch("/api/managers", {}, secMgrCookies);
  if (res.status === 401) ok("Manager can't list managers → 401"); else fail("Mgr list", `${res.status}`);

  const secMgrCookies2 = await freshSession("manager@primefield.ng", "Primefield2025!");
  res = await apiFetch("/api/managers", {
    method: "POST", body: JSON.stringify({ name: "H", email: "h@t.com", password: "Hack1234!" }),
  }, secMgrCookies2);
  if (res.status === 401) ok("Manager can't create managers → 401"); else fail("Mgr create", `${res.status}`);

  // Can't delete admin
  const secAdminCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  const adminSupa = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth } = await adminSupa.auth.signInWithPassword({ email: "hello@ultratidycleaning.com", password: "UltraTidy2025!" });
  res = await apiFetch(`/api/managers/${adminAuth.user.id}`, { method: "DELETE" }, secAdminCookies);
  if (res.status === 403) ok("Can't delete admin → 403"); else fail("Admin delete guard", `${res.status}`);

  // ═══ 4. PUBLIC ROUTES ═══
  console.log("\n═══ 4. PUBLIC ROUTES ═══\n");
  for (const path of ["/", "/services", "/contact", "/gallery", "/about", "/blog"]) {
    res = await fetch(`${BASE}${path}`);
    if (res.status === 200) ok(`${path} → 200`); else fail(path, `${res.status}`);
  }

  // ═══ 5. DASHBOARD PAGES ═══
  console.log("\n═══ 5. DASHBOARD PAGES ═══\n");
  await delay(1000);
  const dashCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
  const dashPages = ["/dashboard", "/dashboard/leads", "/dashboard/blog", "/dashboard/farm", "/dashboard/settings"];
  for (const path of dashPages) {
    res = await apiFetch(path, {}, dashCookies);
    if (res.status === 200) ok(`${path} → 200`); else fail(path, `${res.status}`);
  }

  // ═══ 6. MANAGER PAGES ═══
  console.log("\n═══ 6. MANAGER PAGES ═══\n");
  await delay(1000);
  const mgrPageCookies = await freshSession("manager@primefield.ng", "Primefield2025!");
  const mgrPages = ["/manager/sales", "/manager/expenses", "/manager/inventory", "/manager/cash"];
  for (const path of mgrPages) {
    res = await apiFetch(path, {}, mgrPageCookies);
    if (res.status === 200) ok(`${path} → 200`); else fail(path, `${res.status}`);
  }

  // ═══ 7. CLEANUP ═══
  console.log("\n═══ 7. CLEANUP ═══\n");
  if (testId) {
    await delay(500);
    const cleanCookies = await freshSession("hello@ultratidycleaning.com", "UltraTidy2025!");
    res = await apiFetch(`/api/managers/${testId}`, { method: "DELETE" }, cleanCookies);
    if (res.status === 200) ok("Test manager deleted"); else fail("Cleanup", `${res.status}`);

    await delay(500);
    const delClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: delErr } = await delClient.auth.signInWithPassword({ email: "test-mgr@example.com", password: "NewPass456!" });
    if (delErr) ok("Deleted manager can't login"); else fail("Deleted login", "Should fail");
  }

  // ═══ RESULTS ═══
  console.log("\n" + "═".repeat(40));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(40) + "\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
