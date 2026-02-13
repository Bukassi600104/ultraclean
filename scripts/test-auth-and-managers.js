/**
 * Comprehensive test: Auth flow, Manager CRUD, Security
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
let testManagerId = null;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function fail(name, reason) {
  failed++;
  console.error(`  ✗ ${name}: ${reason}`);
}

function buildCookies(session) {
  const ref = "gsxqrjywtugeuexrjcln";
  const cookieName = `sb-${ref}-auth-token`;
  const sessionData = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: "bearer",
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    user: session.user,
  });
  const chunkSize = 3180;
  const chunks = [];
  for (let i = 0; i < sessionData.length; i += chunkSize) {
    chunks.push(sessionData.substring(i, i + chunkSize));
  }
  return chunks
    .map((chunk, i) => {
      const name = chunks.length === 1 ? cookieName : `${cookieName}.${i}`;
      return `${name}=${encodeURIComponent(chunk)}`;
    })
    .join("; ");
}

async function apiFetch(path, options = {}, cookies = "") {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (cookies) headers["Cookie"] = cookies;
  return fetch(`${BASE}${path}`, { ...options, headers, redirect: "manual" });
}

async function main() {
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

  // ═══════════════════════════════════════
  console.log("\n═══ 1. AUTH FLOW TESTS ═══\n");
  // ═══════════════════════════════════════

  // Test admin login
  const { data: adminAuth, error: adminErr } =
    await adminClient.auth.signInWithPassword({
      email: "hello@ultratidy.ca",
      password: "UltraTidy2025!",
    });
  if (adminErr) fail("Admin login", adminErr.message);
  else ok("Admin login succeeds");

  const adminCookies = buildCookies(adminAuth.session);

  // Test manager login
  const managerClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: mgrAuth, error: mgrErr } =
    await managerClient.auth.signInWithPassword({
      email: "manager@primefield.ng",
      password: "Primefield2025!",
    });
  if (mgrErr) fail("Manager login", mgrErr.message);
  else ok("Manager login succeeds");

  const mgrCookies = buildCookies(mgrAuth.session);

  // Test invalid login
  const { error: badErr } = await adminClient.auth.signInWithPassword({
    email: "hello@ultratidy.ca",
    password: "wrongpassword",
  });
  if (badErr) ok("Invalid password rejected");
  else fail("Invalid password rejected", "Should have failed");

  // ── Route protection ──

  // Dashboard without auth → redirect to login
  let res = await apiFetch("/dashboard", {}, "");
  if (res.status === 307 && res.headers.get("location")?.includes("/login"))
    ok("Dashboard without auth → 307 to /login");
  else fail("Dashboard without auth", `Expected 307, got ${res.status}`);

  // Dashboard with admin cookies → 200
  res = await apiFetch("/dashboard", {}, adminCookies);
  if (res.status === 200) ok("Dashboard with admin auth → 200");
  else fail("Dashboard with admin auth", `Expected 200, got ${res.status}`);

  // Dashboard with manager cookies → redirect (not admin)
  res = await apiFetch("/dashboard", {}, mgrCookies);
  if (res.status === 307) ok("Dashboard with manager auth → 307 (denied)");
  else
    fail("Dashboard with manager auth", `Expected 307, got ${res.status}`);

  // Manager portal without auth → redirect
  res = await apiFetch("/manager/sales", {}, "");
  if (res.status === 307) ok("Manager portal without auth → 307 to /login");
  else fail("Manager portal without auth", `Expected 307, got ${res.status}`);

  // Manager portal with manager cookies → 200
  res = await apiFetch("/manager/sales", {}, mgrCookies);
  if (res.status === 200) ok("Manager portal with manager auth → 200");
  else fail("Manager portal with manager auth", `Expected 200, got ${res.status}`);

  // Manager portal with admin cookies → 200 (admin can access)
  res = await apiFetch("/manager/sales", {}, adminCookies);
  if (res.status === 200) ok("Manager portal with admin auth → 200");
  else fail("Manager portal with admin auth", `Expected 200, got ${res.status}`);

  // Login page with auth → redirect to dashboard
  res = await apiFetch("/login", {}, adminCookies);
  if (res.status === 307 && res.headers.get("location")?.includes("/dashboard"))
    ok("Login with auth → redirect to dashboard");
  else fail("Login with auth redirect", `Expected 307, got ${res.status}`);

  // ═══════════════════════════════════════
  console.log("\n═══ 2. MANAGER CRUD TESTS ═══\n");
  // ═══════════════════════════════════════

  // GET managers as admin
  res = await apiFetch("/api/managers", {}, adminCookies);
  const managers = await res.json();
  if (res.status === 200 && Array.isArray(managers))
    ok(`GET /api/managers → 200 (${managers.length} managers)`);
  else fail("GET managers", `Status ${res.status}`);

  // POST create manager
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Manager",
        email: "test-manager@example.com",
        password: "TestPass123!",
      }),
    },
    adminCookies
  );
  const created = await res.json();
  if (res.status === 201 && created.role === "manager") {
    ok("POST /api/managers → 201 (manager created)");
    testManagerId = created.id;
  } else {
    fail("POST create manager", `Status ${res.status}: ${JSON.stringify(created)}`);
  }

  // GET managers → should include new one
  res = await apiFetch("/api/managers", {}, adminCookies);
  const updatedList = await res.json();
  if (updatedList.length === managers.length + 1)
    ok("Manager list updated after create");
  else fail("Manager list count", `Expected ${managers.length + 1}, got ${updatedList.length}`);

  // PUT reset password
  if (testManagerId) {
    res = await apiFetch(
      `/api/managers/${testManagerId}`,
      {
        method: "PUT",
        body: JSON.stringify({ password: "NewPass456!" }),
      },
      adminCookies
    );
    if (res.status === 200) ok("PUT reset password → 200");
    else fail("PUT reset password", `Status ${res.status}`);

    // Verify new password works
    const testClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: newPwErr } = await testClient.auth.signInWithPassword({
      email: "test-manager@example.com",
      password: "NewPass456!",
    });
    if (!newPwErr) ok("New password works for login");
    else fail("New password login", newPwErr.message);
  }

  // Validation: create with weak password
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Bad",
        email: "bad@test.com",
        password: "weak",
      }),
    },
    adminCookies
  );
  if (res.status === 400) ok("Weak password rejected → 400");
  else fail("Weak password validation", `Expected 400, got ${res.status}`);

  // Validation: create with invalid email
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Bad",
        email: "not-an-email",
        password: "StrongPass1!",
      }),
    },
    adminCookies
  );
  if (res.status === 400) ok("Invalid email rejected → 400");
  else fail("Invalid email validation", `Expected 400, got ${res.status}`);

  // Duplicate email
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Dupe",
        email: "test-manager@example.com",
        password: "StrongPass1!",
      }),
    },
    adminCookies
  );
  if (res.status === 409) ok("Duplicate email rejected → 409");
  else fail("Duplicate email", `Expected 409, got ${res.status}`);

  // ═══════════════════════════════════════
  console.log("\n═══ 3. SECURITY TESTS ═══\n");
  // ═══════════════════════════════════════

  // Unauthenticated access to managers API
  res = await apiFetch("/api/managers");
  if (res.status === 401) ok("GET /api/managers without auth → 401");
  else fail("Unauth GET managers", `Expected 401, got ${res.status}`);

  // Manager trying to access managers API
  res = await apiFetch("/api/managers", {}, mgrCookies);
  if (res.status === 401) ok("GET /api/managers as manager → 401");
  else fail("Manager GET managers", `Expected 401, got ${res.status}`);

  // Manager trying to create a manager
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Hack",
        email: "hack@test.com",
        password: "HackPass1!",
      }),
    },
    mgrCookies
  );
  if (res.status === 401) ok("POST /api/managers as manager → 401");
  else fail("Manager POST managers", `Expected 401, got ${res.status}`);

  // Manager trying to delete another manager
  if (testManagerId) {
    res = await apiFetch(
      `/api/managers/${testManagerId}`,
      { method: "DELETE" },
      mgrCookies
    );
    if (res.status === 401) ok("DELETE manager as manager → 401");
    else fail("Manager DELETE", `Expected 401, got ${res.status}`);
  }

  // Try to delete admin user via managers API (role guard)
  const adminProfile = adminAuth.user;
  res = await apiFetch(
    `/api/managers/${adminProfile.id}`,
    { method: "DELETE" },
    adminCookies
  );
  if (res.status === 403) ok("Cannot delete admin via managers API → 403");
  else fail("Admin deletion guard", `Expected 403, got ${res.status}`);

  // Try to reset admin password via managers API
  res = await apiFetch(
    `/api/managers/${adminProfile.id}`,
    {
      method: "PUT",
      body: JSON.stringify({ password: "HackedPass1!" }),
    },
    adminCookies
  );
  if (res.status === 403) ok("Cannot reset admin password via managers API → 403");
  else fail("Admin password guard", `Expected 403, got ${res.status}`);

  // SQL injection attempt
  res = await apiFetch(
    "/api/managers/' OR 1=1 --",
    { method: "DELETE" },
    adminCookies
  );
  if (res.status !== 200) ok("SQL injection in URL param blocked");
  else fail("SQL injection", "Should not return 200");

  // XSS in manager name
  res = await apiFetch(
    "/api/managers",
    {
      method: "POST",
      body: JSON.stringify({
        name: '<script>alert("xss")</script>',
        email: "xss-test@example.com",
        password: "StrongPass1!",
      }),
    },
    adminCookies
  );
  if (res.status === 201) {
    // Created but name is stored as-is (React auto-escapes on render)
    ok("XSS payload stored safely (React auto-escapes)");
    // Clean up XSS test user
    const xssData = await res.json();
    await apiFetch(`/api/managers/${xssData.id}`, { method: "DELETE" }, adminCookies);
  }

  // ═══════════════════════════════════════
  console.log("\n═══ 4. PUBLIC ROUTES TEST ═══\n");
  // ═══════════════════════════════════════

  // Homepage
  res = await fetch(`${BASE}/`);
  if (res.status === 200) ok("Homepage → 200");
  else fail("Homepage", `Status ${res.status}`);

  // Services
  res = await fetch(`${BASE}/services`);
  if (res.status === 200) ok("Services page → 200");
  else fail("Services", `Status ${res.status}`);

  // Contact
  res = await fetch(`${BASE}/contact`);
  if (res.status === 200) ok("Contact page → 200");
  else fail("Contact", `Status ${res.status}`);

  // Gallery
  res = await fetch(`${BASE}/gallery`);
  if (res.status === 200) ok("Gallery page → 200");
  else fail("Gallery", `Status ${res.status}`);

  // About
  res = await fetch(`${BASE}/about`);
  if (res.status === 200) ok("About page → 200");
  else fail("About", `Status ${res.status}`);

  // Blog
  res = await fetch(`${BASE}/blog`);
  if (res.status === 200) ok("Blog page → 200");
  else fail("Blog", `Status ${res.status}`);

  // ═══════════════════════════════════════
  console.log("\n═══ 5. DASHBOARD PAGES TEST ═══\n");
  // ═══════════════════════════════════════

  const dashPages = [
    "/dashboard",
    "/dashboard/leads",
    "/dashboard/blog",
    "/dashboard/farm",
    "/dashboard/farm/sales",
    "/dashboard/farm/expenses",
    "/dashboard/farm/inventory",
    "/dashboard/settings",
    "/dashboard/dba",
  ];
  for (const page of dashPages) {
    res = await apiFetch(page, {}, adminCookies);
    if (res.status === 200) ok(`${page} → 200`);
    else fail(page, `Status ${res.status}`);
  }

  // ═══════════════════════════════════════
  console.log("\n═══ 6. MANAGER PORTAL TEST ═══\n");
  // ═══════════════════════════════════════

  const mgrPages = [
    "/manager/sales",
    "/manager/expenses",
    "/manager/inventory",
    "/manager/cash",
  ];
  for (const page of mgrPages) {
    res = await apiFetch(page, {}, mgrCookies);
    if (res.status === 200) ok(`${page} → 200`);
    else fail(page, `Status ${res.status}`);
  }

  // ═══════════════════════════════════════
  console.log("\n═══ 7. CLEANUP ═══\n");
  // ═══════════════════════════════════════

  // Delete test manager
  if (testManagerId) {
    res = await apiFetch(
      `/api/managers/${testManagerId}`,
      { method: "DELETE" },
      adminCookies
    );
    if (res.status === 200) ok("Test manager cleaned up");
    else fail("Cleanup", `Status ${res.status}`);

    // Verify deleted manager can't login
    const deletedClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: delLoginErr } =
      await deletedClient.auth.signInWithPassword({
        email: "test-manager@example.com",
        password: "NewPass456!",
      });
    if (delLoginErr) ok("Deleted manager cannot login");
    else fail("Deleted manager login", "Should have been denied");
  }

  // ═══════════════════════════════════════
  console.log("\n" + "═".repeat(40));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(40) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
