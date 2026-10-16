# Farm livestock correction release

The user approved implementation, GitHub push and the live Vercel update after confirming Goat numbers are category order, Stocker/Feeder is the cattle label, and Tom/Hen each use all four turkey stages. No screenshot numbers seed stock.

## Preservation and migration

Baseline: main `e7dfb7cae9aa44b1083b568cd56640f627e412b2`, Supabase `gsxqrjywtugeuexrjcln`, Vercel project `ultratidy` (`prj_9WsH2D8DLOtXVo3lHPLSve4R3Og4`). Original public schema contains 47 tables and five profiles. Existing stock: Catfish 2234, Chicken 2, Goat 14, Pig 0, Turkey 8. No cattle quantity is invented.

Migration `20261016225631_farm_livestock_categories.sql` adds two RLS-protected tables and nullable links on sales and stock movements. Existing rows are not backfilled. Aggregate quantities remain authoritative; the remaining quantity is explicitly Unclassified. An admin can allocate verified animals or transfer a group to another stage with a reason and no increase to aggregate stock.

The original V2 write function source is retained under a private renamed function. Its guarded public wrapper preserves actor checks, date locks, closure, correction requests and receipts, and adds atomic group bookkeeping. Direct API mutation of the new ledger is denied. Classified additions, deductions, reversals, corrections and retries must leave both aggregate and group balances valid. Existing legacy sale amounts and movement meaning remain unchanged.

Private full production backup captured October 17, 2026: 706094 bytes; SHA256 `1dcb2502e39d62a143ed6d46e9ca553cb2a48f74571d68638a54517aad914661`. Stored outside the repository under the local Codex backups directory. Native PostgreSQL 17 restore and migration rehearsal preserved every original row across 82 public/auth/storage tables, with two new empty tables and identical original core function source. Restore emitted one warning because the isolated restore excludes the managed `supabase_realtime` publication; table restoration and row comparisons succeeded. No production business data was used for write tests.

DDL uses a five-second lock timeout and sixty-second statement timeout. Stage a production build before the brief farm-write pause, apply this migration only, compare original public-table fingerprints (ignoring only the two new NULL link fields), promote the compatible build, verify live routes and remove the pause. New group events remain empty until real activity or an explicit verified allocation.

## Verification

* Catalogue: 16 checks.
* Actual correction parsers/API permissions: 18 checks.
* Native isolated PostgreSQL ledger: 48 checks including two-connection last-animal, retry and close/write races. Covers legacy row preservation, category changes followed by sale voids, recursive batch/request context, invalid group combinations, atomic rollback and closed dates.
* Styled React/browser forms: 22 checks at 390, 768 and 1440 widths; screenshot inspected. Covers dependent category options, both turkey sexes, actual stock/sale/mortality payloads, failed-save retention and admin allocation.
* Existing V2 database: 67; original API: 38; financial/mortality: 11; authentication: 38; routing: 88; account API: 62.
* Existing farm operations API: 44; feed API: 25; daily-feed API: 18; CEO API: 25; complete-record CEO financial calculations passed.
* Independent reviewer found no remaining high/medium issues after corrections and independently passed 48 isolated ledger checks.

Final lint and production build passed (117 static pages). Existing styled browser checks also passed: farm operations 74, feed 26, CEO 35. Built application GET-only smoke checks passed 25 checks. Live release results follow after activation.

The original farm V2 mobile browser suite also passed 19 checks after updating its synthetic category endpoint fixture and scoping visible product labels. No production component change was needed for that fixture correction.

## Production activation, October 17, 2026

Staged production build `dpl_9Xm8tdemtsND6ZpmkDWRCU7tmMiS` reached READY on implementation commit `bbec580770c0b38483f89af11c225f2c12dc5c3a`. Farm writes were paused during the schema transition. The new migration was applied successfully through the Supabase plugin; the plugin-generated migration journal timestamp was aligned to the checked-in version `20261016225631` without replaying the migration.

Before/after fingerprints proved all 47 original public tables unchanged. The five original auth users and their full stored rows also matched, as did profiles, aggregate stock, original core write source, date-lock source and inventory-trigger source. The two new tables have RLS enabled and started empty. Live PostgREST checks confirmed both new relationships and the complete balance RPC; all original quantities remained Unclassified.

The exact staged production build was promoted and verified as the deployment serving `farm.primefieldagric.com`. Sixteen live GET checks passed across farm/CEO/Property/Content login routes, public websites, mobile manifests and anonymous private-access denials, including the new category endpoint. No live business test records were created. Farm writes were resumed, and a fresh Supabase plugin query confirmed zero release-pause triggers. The local isolated PostgreSQL server was stopped cleanly.

The accompanying follow-up commit contains test-fixture and documentation updates only; application behavior matches the staged and verified implementation build. GitHub main synchronization is the final release bookkeeping step.

## Rollback limits

Retain the additive schema, links and ledger after any classified activity. Do not replay old migrations, rebuild stock, replace prices or restore the old unguarded write entry point. If an application regression needs rollback, pause affected farm writes and deploy a compatible correction; keep ledger guards until verified. A backup restore requires deliberate reconciliation of all subsequent real business activity and is not a routine application rollback. Accounts, passwords, funding rules and other apps are outside this change.
