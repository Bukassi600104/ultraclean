# Primefield V2: implementation and controlled release

## Status and preservation boundary

Prepared locally for review. **No production migration, push, deployment, account change, historical recalculation or inventory backfill has been performed.** Applying SQL, releasing the application, and resuming farm writes require explicit release authorization.

The configured project is `gsxqrjywtugeuexrjcln`, also referenced by the existing image configuration. Its relationship to the Vercel production environment must be confirmed before SQL is applied. A restorable full production backup has not been verified; this remains a release gate, not a completed check.

Read-only catalog and fingerprint capture is available through `node scripts/farm-v2-baseline.mjs <private-output-path>`. The capture contains schema definitions, policies, triggers, aggregate totals and whole-row fingerprints; it excludes credentials and raw records. The development capture is stored outside the checkout in the operating system temporary directory. Re-capture and retain it in an approved private location before release; it is **not** a restorable backup.

## Audited current behavior

| Area | Verified baseline | V2 behavior |
|---|---|---|
| Sales | Generated quantity × price despite nullable weight | Explicit basis for new rows; persisted database total |
| Legacy sales | No reliable basis/linkage | Existing total retained; no inferred basis or stock deduction |
| Inventory | Insert trigger updates current stock | Immutable original movements, linked compensation and trusted actors |
| Sales inventory | No sales trigger or create-route movement | New V2 sale and quantity deduction commit together |
| Managers | Service-role APIs bypass insert-only RLS; saved edits/deletes allowed | Confirm before save; request admin corrections afterward |
| Daily records | Open upsert could reopen; writes inconsistently guarded | Create-if-absent, idempotent close, actual-date guards |
| Supplies | Missing API authorization; quantity trigger; cascade-delete FK | Guarded endpoints; signed adjustments; archive retains history |
| Funds | Create/read only; no void metadata | Admin correction/void; manager reads only |
| Finance | Different formulas and limited list queries | Shared full-scope aggregation with funding separation |
| Feed | Dedicated table; no source field; no general feed expenses found | Owner-funded; dedicated workflow prevents new duplicate general-feed entries |
| Products | Duplicated lists; cattle absent | Shared product registry including cattle |

Read-only snapshot: 87 general expenses (all `bimbo_transfer`), 29 feed purchases, 2 sales with weight, and zero closed daily records. The oldest general expense was April 9, 2026. These are observations of the configured project, not assertions that no other production database exists. Synthetic tests include legacy closed dates to prove they remain closed.

Relevant tables: `farm_sales`, `farm_expenses`, `farm_fund_transfers`, `farm_feed_purchases`, `farm_daily_feed`, `farm_daily_records`, `farm_inventory`, `farm_inventory_transactions`, `farm_supply_inventory`, `farm_supply_transactions`, and existing `profiles` for verified roles. The new activity, request and receipt tables contain V2 metadata only.

Affected interfaces are confined to farm APIs, manager farm pages, dashboard farm pages, shared farm validation/types, and the existing farm offline queue. Public-site, UltraTidy, DBA, CRM and account authentication implementations are unchanged.

## Migration 012: exact effects

Apply **only** `supabase/migrations/012_primefield_v2.sql` once, against the confirmed, freshly audited live schema. Do not run `scripts/run-migrations.mjs` without a specific reviewed migration: its default replays all files. Do not run the original seed/full migration.

| Change | Existing-row effect | Legacy NULL/backfill | Rollback |
|---|---|---|---|
| `total_amount DROP EXPRESSION` | Stored numeric totals are retained | No recalculation | Do not restore expression after V2 sales; it would recalculate amounts |
| Nullable `pricing_basis` | Existing rows remain legacy | NULL allowed; no guessed values | Retain column when reverting app behavior |
| Void/archive metadata | Old records stay active | Nullable actor/time/reason; no backfill | Preserve metadata and exclusion logic after any void/archive |
| Revision counter default 0 | Establishes V2 concurrency baseline | Not a claim about past edits | Keep counter for compatible correction APIs |
| Movement linkage/correction fields | Old movements remain unlinked | NULL allowed; no retrospective sale movement | Retain links/compensation records |
| Supply movement date | Old rows retain NULL | New writes supply operational date; old timestamps remain unchanged | Keep date column; do not fabricate historical dates |
| Product/feed constraints | Existing accepted values remain accepted | No inserted/reseeded farm product rows | Cannot remove new values once used |
| Activity/requests/receipts | No historical audit reconstruction | New records only | Keep audit evidence and retry receipts |
| Guarded write functions and grants | Accounts and read policies preserved | No row changes from grants | Older direct-write APIs are incompatible; do not redeploy them unchanged |

Migration preconditions reject missing core live tables/fields and an unexpected generated formula. Named existing product/feed constraints must match the captured catalog. Verify all new object names are unused before release; this is a forward-only migration, not a rerunnable reset.

The migration runs in a transaction, uses a 5-second lock timeout and a 60-second statement timeout. On a timeout or failed constraint check the transaction must roll back; investigate instead of retrying blindly. A single farm transaction advisory lock serializes writes and daily closure for this small operational workload, preventing inconsistent lock order and close/write races.

The service-role-only `farm_v2_write` validates the server-supplied actor against an active profile. Authenticated/anonymous direct farm writes and RPC execution are denied. All corrections require a reason; financial/item corrections require the revision shown to the operator. Stock-count correction requires the displayed stock value. Audit failure rolls back the correction.

## Accounting and historical meaning

- Owner balance = active owner transfers − owner-funded general expenses − dedicated feed purchases.
- Sales cash balance = active saved sales − sales-funded general expenses.
- Operational expenses = general expenses + feed purchases, once.
- Daily operational result = daily revenue − daily operational expenses; this is not a cash-wallet total.
- Opening balance excludes that date's transfers and spending. NULL legacy general-expense sources remain owner-funded without modifying rows.

No existing general feed entries were found and no code path currently writes a dedicated feed purchase into general expenses. No historical deduplication was attempted. If a fresh production audit discovers disputed funding or duplicate entries, stop that accounting change and obtain evidence before changing historical treatment.

V2 sales reduce tracked inventory by quantity. A sale/negative movement exceeding recorded availability is rejected prospectively; existing legacy quantities are not constrained or rebuilt. Resolve inaccurate current stock through an audited admin adjustment before recording a sale.

Legacy sale correction keeps its stored amount unless Bimbo explicitly corrects `total_amount`; it never invents pricing basis or reverses an unlinked sale movement. V2 sale correction recalculates from explicit basis and reverses/replaces only linked stock movements. Original mortality stays in history; reversed originals are excluded from active mortality figures.

## Reproducible local verification

Runtime dependencies for isolated tests live outside the project; they do not alter its package manifest or lockfile:

```powershell
npm install --prefix "$env:TEMP\primefield-v2-test-runtime" --no-audit --no-fund @electric-sql/pglite esbuild
node scripts/test-farm-v2.mjs
node scripts/test-farm-v2-api.mjs
node scripts/test-farm-v2-calculations.mjs
node scripts/test-farm-v2-ui.mjs
node scripts/test-farm-v2-smoke.mjs
npm run lint
npm run build
npx playwright test
```

The SQL suite uses PostgreSQL in WASM with a sanitized schema fixture and synthetic users/records. It does not load `.env.local` or contact Supabase. API checks use mocked authentication/database transports and actual route handlers. Mobile component checks mount actual React pages with synthetic API responses; they do not establish real sessions. Neither substitutes for authenticated end-to-end staging tests or real multi-connection PostgreSQL concurrency tests.

## Local validation results

- 63 isolated PostgreSQL assertions passed, including migration parsing, legacy-value preservation, V2 pricing, compensation, role denial, closure, retries, stale revisions, funds, supply archiving and atomic rollback.
- 38 actual API-handler checks passed with mocked auth/database transport.
- 11 financial/mortality checks passed, including >100-row totals, negative balances and reversal-aware mortality.
- 19 mobile browser component checks passed using actual page components and synthetic API responses.
- 13 GET-only checks of the built application passed: public/DBA pages, existing login pages, protected CRM/UltraTidy/farm redirects, and anonymous farm API denial.
- The local Primefield Host probe returned HTTP 308 to `https://primefieldagric.com/`; it did not establish that the deployed page renders. The original middleware/redirect configuration is unchanged. Verify staging domain behavior before release; do not assume this redirect proves a live outage or silently alter shared routing.
- `npm run lint` and production builds passed.
- A final read-only comparison matched all 11 live table fingerprints and row counts to the initial baseline, including profiles. Production data remained unchanged during this implementation.
- Existing public-site Playwright suite: 80/81 initially passed. The first homepage load took 12.361 seconds against an 8-second assertion; its targeted rerun passed in 2.4 seconds. No public-site code was changed to mask this result.

The farm checks are local isolated verification. Existing real accounts, a full restored production dataset and multi-connection concurrency have not been exercised by these tests.

## Authorized release sequence — pending approval

1. Confirm Vercel production uses the audited Supabase project; verify domain/environment mapping without exposing keys.
2. Obtain a full backup including relevant schema/data, verify it restores into an isolated Supabase/PostgreSQL project, and compare legacy row counts, totals, accounts, closed dates and inventory quantities.
3. Re-audit schema drift. Rehearse migration 012 and the compatible application on that restored copy. Validate existing admin/manager login, all farm workflows, concurrent close/write and repeated/offline submissions. Do not use real production credentials for automated write tests.
4. Prepare a farm-write maintenance pause covering every deployment sharing the database. Prevent old tabs/offline clients and old API versions from submitting writes during transition. Leave public marketing pages available.
5. After explicit production approval, retain a fresh backup and baseline, apply migration 012 once, then release the compatible application. Old generated-column write behavior and V2 schema must not run together against active traffic.
6. Verify stored legacy totals, counts, closed statuses and stock match baseline; run controlled approved V2 smoke operations and confirm role denial, history, balances and retry behavior. Resume farm writes only when these checks pass.

If release fails, keep farm writes paused. Prefer fixing the compatible application forward. Do not restore the old generated expression, delete new audit/movement records, reopen dates, or discard V2 transactions. A backup restore after live activity would lose subsequent work and is not an automatic rollback; it requires a separately reviewed recovery plan and explicit authorization.

## Remaining release gates

- Verified full backup restore and migration rehearsal using the complete production dataset.
- Confirmation of the Vercel production project/database mapping.
- Authenticated staging checks for existing users and genuine multi-session concurrency.
- Staging/deployed Primefield host routing verification following the local HTTP 308 probe.
- Coordinated maintenance pause and explicit production migration/deployment approval.

These gates are intentionally unresolved locally. No production migration or deployment should be inferred from passing local checks.
