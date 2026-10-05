# BossBimbz operations expansion: regression record

## Protected baseline

- Date: October 5, 2026.
- Branch: `bossbimbz-operations-expansion`.
- Protected source: `574eee3f6358c03707adfb547deb9d289b1aeaf0`.
- Working tree was clean when baseline checks started.
- Scope: local isolated tests, source/contract review, and GET-only smoke of the existing build. No migration replay, account changes, commits, push, deployment, or production business writes.
- Release authority and historical evidence remain in `docs/PRIMEFIELD-V2-RELEASE.md`. That document's October 3 production checks are historical evidence, not fresh October 5 verification.

## Reproducible baseline results

Run from the repository root with the existing project dependencies. The WASM PostgreSQL and esbuild runtime lives in `%TEMP%/primefield-v2-test-runtime`; no package or lockfile changes are required.

| Command | Result | What it proves |
|---|---|---|
| `node scripts/test-farm-v2.mjs` | PASS, 67 assertions | Synthetic legacy preservation, V2 pricing/inventory, closed dates, retries, corrections, supply archive, rollback, and migration 013 direct service-role write denial |
| `node scripts/test-farm-v2-api.mjs` | PASS, 38 checks | Actual handlers with mocked transport: anonymous denial, manager correction denial, trusted actor, persisted sales total |
| `node scripts/test-farm-v2-calculations.mjs` | PASS, 11 checks | Complete financial totals, date scopes, legacy NULL funding source, feed cost, voids, negative balances, mortality reversals |
| `node scripts/test-farm-v2-smoke.mjs` | PASS, 13 GET checks | Existing built public/DBA/login pages, protected CRM/UltraTidy/farm redirects and anonymous supplies API denial |
| `node scripts/test-farm-v2-ui.mjs` | PASS, 19 checks | Actual mobile components: inventory, cattle, requests, sale confirmation/saved total, supply history, admin corrections |

Smoke reused `.next/BUILD_ID` from October 3 rather than claiming a fresh source build. Its local Primefield Host probe returned HTTP 308 to the existing HTTPS domain. This is an explicit staging hostname verification gate; it does not prove rendering or a production outage. Smoke starts a temporary local server on port 3137 and terminates it after checks.

Do not execute `scripts/test-auth-and-managers.js` as an isolated test. It initializes live Supabase clients with embedded credential literals and performs account operations. Credential values must not be reproduced in regression reports. Existing secret material needs separate remediation before that legacy script can be treated as a safe test.

## Farm preservation contracts

1. Keep `admin` and `manager` unchanged. `manager` means the existing Primefield role; never broaden `is_manager()` or `requireManager()` to include the new roles.
2. Keep `farm_v2_write` restricted to active `admin`/`manager` profiles and executable only through the trusted service-role RPC boundary. Migration 013 direct farm DML revocations remain in force during application rollback.
3. Retain historical stored sales amounts, nullable legacy pricing basis, movement links, compensations, revision checks, void/archive metadata, closed dates, trusted actors and append-only farm audit. No backfill/recalculation or reseeding.
4. Reuse `farm-finance-calculations.ts`, `farm-finance.ts` and reversal-aware mortality behavior for CEO aggregation. Owner funds, sales cash, and daily operational result have distinct established meanings. Dedicated feed purchase cost is counted once.
5. `farm_daily_records` retains its day-state responsibility. Reports use dedicated new models; operational requests stay separate from correction requests.
6. New property/content records and audit belong to their own table namespaces, never farm history.

## Minimal additive auth/routing extension

| Boundary | Baseline | Needed extension |
|---|---|---|
| Profile role check | Checked-in schema accepts `admin`, `manager` | Forward-only validated CHECK accepting those plus `property_manager`, `content_manager`; no existing profile updates |
| Role types | `lib/auth.ts`, `types/index.ts`, `contexts/AuthContext.tsx` contain two-role unions | Add the two role literals consistently |
| Domain authorization | `requireManager()` accepts active farm manager/admin | Separate property/content helpers that whitelist their own role plus admin; farm helper unchanged |
| Main login | Client page and middleware send every non-farm-manager profile to `/dashboard` | Explicit role-to-home mapping; unknown/missing/suspended profiles must not gain private access |
| Farm login/domain | Farm hostname permits admin/manager; farm login rejects other roles | Preserve denial for both new roles |
| Leads hostname | Admin-only page access and existing dashboard redirect | Preserve CRM restriction; if new portals are served here, explicitly permit only their own protected prefixes before the admin dashboard rule |
| Generic protected paths | `/dashboard` admin-only; `/manager` farm-only | Add dedicated property/content route checks and server layouts, preserving old prefixes |
| Auth callback | Default destination `/dashboard`; optional `next` | Resolve new-role destination safely or let role-aware middleware redirect; keep redirects local and role-authorized |
| Existing manager CRUD | `/api/managers` only creates/updates farm `manager` | Preserve current contract; use explicit separate account management extension if new-role provisioning is needed |

Baseline suspension inconsistency: farm hostname and `requireManager()` reject suspended profiles; generic `/manager` middleware queries only `role`. `requireAdmin()` does not check suspension. New module guards should reject suspension consistently. Any change to existing admin behavior must be deliberate and verified, rather than an incidental role expansion.

## Cross-role proof required at checkpoints

Existing farm API tests mock `requireManager()` by returning a manager for any non-admin truthy role. They do **not** prove property/content denial. Add targeted tests with actual auth helpers under a mocked session/profile transport or equally faithful explicit role whitelists.

Required denial matrix: manager cannot write property/content; property manager cannot access farm/content operations; content manager cannot access farm/property operations; anonymous users cannot access private operational APIs. Admin must retain intended supervision. Test rejected calls before any service-role database transport is invoked, and test database RPC actor rejection independently.

Checkpoint A must compare original-column counts/fingerprints, constraints/grants, unchanged roles and farm V2 tests on isolated migration fixtures/restored data. B reruns established farm workflow suites after reports/requests. C and D require all role pairs, CRUD input validation, references, history, replay handling and farm regression. E requires preserved dashboard actions/navigation, authoritative totals and responsive empty/loading/error states. Fresh lint, build and public Playwright results are mandatory final gates.

## Limits of baseline evidence

No real account/password/session was used, and no fresh production schema/data fingerprint was captured here. Isolated fixture tests are not a full restored production rehearsal or multi-connection concurrency test. Current production row preservation cannot be asserted from local tests alone. Future production release requires the approved read-only before/after comparison and verified backup/recovery workflow, without replaying migrations 012 or 013.
