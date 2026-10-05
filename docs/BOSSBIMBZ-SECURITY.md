# BossBimbz security review

Scope: feature branch `bossbimbz-operations-expansion`; source and isolated synthetic-session tests only. No production writes, live user sessions, credentials, deployment or paid services are used by these checks.

## Authorization evidence

- `node scripts/test-bossbimbz-access.mjs`: PASS, 31 checks execute the real server guards. Anonymous requests, every manager cross-domain combination and suspended managers are denied; admin supervision and each manager's own domain are allowed. The Supabase transport/session is synthetic; no real database is contacted.
- `node scripts/test-bossbimbz-routing.mjs`: initial RED, 22 failures and 51 passing checks. The test executes the actual middleware transpiled with TypeScript. Only Next response primitives and session/profile transport are substituted. RED exposed unprotected `/property` and `/content` page prefixes and the generic login's incorrect `/dashboard` destination for both new manager roles.
- After middleware correction: GREEN, all 73 route checks pass. No expected-denial assertions were relaxed between RED and GREEN.
- Required landing contract: property manager `/property`, content manager `/content`, admin `/dashboard`; existing farm manager generic login continues to `https://farm.primefieldagric.com`. Dedicated operational login pages remain public. Page route protection supplements server guards; it does not replace API authorization.

The routing matrix includes anonymous and unknown profiles, every cross-role route denial, allowed own-domain/admin pages, suspended new-domain users, root/nested paths, generic login and current farm/leads host behavior.

## Database and API review

The new farm migration `20261005113523_bossbimbz_operations.sql` enables RLS for reports, requests, events and receipts. Authenticated read policies constrain manager reads to their own report/request/event records; active farm membership gates access. Direct table writes are revoked. The transactional write function accepts a trusted server actor, rechecks active farm role and ownership, reserves CEO decisions/reviews to admin, validates revisions, and records immutable events. Execution is revoked from anonymous and authenticated clients and granted only to the server service role. Protected V2 files 012/013 must remain unchanged.

`lib/supabase/server.ts` uses the service-role client, which bypasses RLS. Every private API therefore needs an explicit real server guard before any query, identity derived from the authenticated profile, and explicit ownership filters for manager reads. RLS alone cannot protect a service-role API.

Property/content API and SQL review remains pending until those modules are present. Token security review remains pending until social integration source exists; no social connection can be represented as authorized before owner OAuth consent.

## Existing risks and release limits

- Legacy `scripts/test-final.js` and `scripts/test-auth-and-managers.js` contain credential-bearing authentication test patterns. Do not execute these against live production, publish their contents or include secret values in reports. Existing exposed credentials require owner-controlled revocation/rotation and repository-history remediation before release; this task does not print or test them.
- Existing admin guard does not inspect suspension; current farm subdomain login redirects any authenticated profile before a role/suspension check, and direct `/manager` middleware does not inspect suspension. These are inherited behavior; actual farm write guards still deny suspended managers. Record separately from the new-domain isolation fix.
- Synthetic authorization tests verify source behavior, not deployed RLS state, host DNS or real OAuth consent. Staging checks and coordinated release authorization remain required before production deployment.
