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

Property/content APIs and SQL are implemented and reviewed. Actual-domain handler tests execute real session guards for anonymous, active, suspended and cross-domain users; linked content platforms cannot invalidate saved lead/performance attribution. Token handling uses actor/platform-bound signed state, secure cookies, randomized authenticated encryption and service-only guarded token routines. Provider responses, account selection, expired credentials and reauthorization have isolated success/failure tests. No social connection is represented as authorized without an actual grant; live consent and developer configuration remain external prerequisites.

Prospective feed stock is NULL until an administrator records a real opening count. Future receipt and daily-feed links are unique, movements append-only, and shared V2/date locks protect consumption and closing. Tracked source corrections cannot silently change physical bags. The parent additionally ran 16 real PostgreSQL multi-connection checks in a temporary loopback cluster: same-retry use/receipt once, competing last-bag use, closing/write wait and atomic rollback. This is distinct from PGlite assertions; production migrations have not been installed.

## Existing risks and release limits

- Legacy `scripts/test-final.js` and `scripts/test-auth-and-managers.js` contain credential-bearing authentication test patterns. Do not execute these against live production, publish their contents or include secret values in reports. Existing exposed credentials require owner-controlled revocation/rotation and repository-history remediation before release; this task does not print or test them.
- Existing `requireAdmin` does not inspect suspension; the farm subdomain's `/login` branch redirects an authenticated profile before its role check, and direct `/manager` middleware omits suspension. Other farm-host routes verify role/suspension and sign out suspended users. Actual farm write guards deny suspended managers; new domain guards and the CEO API reject suspended administrators too. These inherited distinctions were preserved rather than described as a missing farm-host guard.
- Synthetic authorization tests verify source behavior, not deployed RLS state, host DNS or real OAuth consent. Staging checks and coordinated release authorization remain required before production deployment.
