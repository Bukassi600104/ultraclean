# Farm Livestock Categories Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. The user has approved implementation, push and the live Vercel update, preserving existing records/workflows.

**Goal:** Record Bimbo's livestock categories consistently across new stock, sales, mortality and inventory views without changing historical records, current totals, accounts or financial rules.

**Architecture:** Keep existing product keys and aggregate inventory intact. Add structured chicken type, growth stage and optional sex, shared between forms and server validation. Classified quantities use a guarded, linked stock-group ledger; existing stock remains visibly unclassified until explicitly allocated by an admin. Product totals and group deductions are written in one transaction.

**Tech Stack:** Existing Next.js 14, React, TypeScript, Zod and Supabase/PostgreSQL stack; no new product dependencies.

**Spec:** Bimbo's typed correction and the two screenshots supplied October 16, 2026, interpreted below. Typed corrections take precedence over conflicting screenshot wording. Open questions are approval gates for affected values, not permission to guess.

## Observed baseline and constraints

- Reviewed source commit: `e7dfb7cae9aa44b1083b568cd56640f627e412b2`; production state must be rechecked before implementation/release.
- Manager Stock currently posts product, action, quantity, date, reason, notes and retry ID to `/api/farm/inventory/transaction`.
- `lib/farm-products.ts` already defines catfish, goat, chicken, pig, turkey and cattle. Preserve these keys, plus existing other/crops/custom inventory behavior and Ram report sections.
- Stock validation has no structured stage or chicken subtype. Existing sales have gender support in their persisted/write paths; inspect its exact live values before mapping sex labels.
- Inventory transactions run through `farmWrite`/the protected V2 write boundary. Retain date locks, closed-day checks, receipts, corrections, attribution and sale linkage.
- No account, website, Property, Content, feed-funding or financial-calculation changes belong in this work.
- Do not edit/replay migrations 012/013; any required database change is a new forward migration after live-schema inspection and isolated rehearsal.
- No guessed stock count, retrospective pricing change, category assignment or reconstructed audit history. Original NULL classification stays unknown.
- New stage classification concerns animal inventory, not feed types or feed-bag balances.

## Proposed catalogue

| Product | Type | Growth-stage options | Sex labels when known |
|---|---|---|---|
| Catfish | None | Fingerlings; Juvenile | Unspecified unless existing valid records require otherwise |
| Goat | None | Weaner; Adolescent; Adult | Billy goat; Nanny goat; Unknown |
| Chicken | Broiler | Chick; 2 weeks old | Preserve existing supported sex values; no inferred assignment |
| Chicken | Layer | Chick; Point of lay; Layers | Preserve existing supported sex values; no inferred assignment |
| Pig | None | Weaner; Grower; Adult | Preserve supported optional sex values; no added taxonomy assumed |
| Turkey | None | Poult; Grower; Juvenile; Finisher | Tom; Hen; Unknown |
| Cattle | None | Calf; Weaner; Stocker/Feeder; Fattening; Finished Adult | Cow; Bull; Unknown |

Normalize new displayed `Winners`/`Weaners` wording to `Weaner`; do not rewrite old free-text notes. Consolidate the duplicated Pig heading. The typed correction explicitly reinstates Pig Weaner despite the screenshot strike-through. Keep existing product options not mentioned in the correction.

### Confirmed by Bimbo and the user

1. Goat numbers specify display order only: Weaner, Adolescent, Adult. They are not counts and will not seed stock.
2. The cattle label is Stocker/Feeder.
3. Both Tom and Hen have Poult, Grower, Juvenile and Finisher options. Sex and growth stage are independent; young animals may remain Unknown when sex is not established.

## Intended behavior

- Add Stock: Date, Animal Type, Chicken Type when applicable, Growth Stage, optional known Sex, Quantity, Reason/Source and Notes. Keep the Date control and its existing closure restrictions; use a clear `Add Stock` heading.
- Changing product/type clears incompatible stage/sex selections before saving. New classified animal entries require a valid stage and positive whole-animal quantity. Preserve compatible legacy/custom input contracts.
- Forms retain the manager's input after a failed save; retrying an accepted request must not add animals twice. Offline/pending older payloads remain distinguishable as unclassified; never invent a stage to force validation through.
- Sales and mortality use a known stock group or explicit Unclassified/Unknown stock. Deductions cannot silently take animals from another stage or sex. Sex may be unknown, especially for young animals.
- Inventory shows the existing product totals and expandable classified groups, plus Unclassified stock. The total must equal the classified groups plus Unclassified; never calculate current category balances using only the latest 200 history rows.
- Existing animals may be allocated into verified groups by an admin with a reason, without increasing total stock. Such allocation is a new audited event, not a historical stock arrival.
- Normal growth is not a new arrival or a sale. If stage changes are needed, use an explicit audited transfer between valid groups with the same product (and chicken type), zero change to aggregate stock, and no automatic aging. Saved-record corrections remain admin-only; managers request them as before.
- Daily reports retain their existing free-text/versioned structure. Update relevant help labels/options and display category details where linked stock is shown; do not turn reports into a second inventory writer.

## File responsibilities

- New `lib/farm-livestock-categories.ts`: catalogue, stable keys, option filtering and valid product/type/stage/sex combinations; imports unchanged product keys from `lib/farm-products.ts`.
- New `components/manager/LivestockClassificationFields.tsx`: shared dependent selectors and accessible labels.
- `lib/validations.ts`, `lib/farm-v2.ts`, `types/index.ts`: additive contracts, compatibility/version handling and persisted response types.
- Manager pages `stock/page.tsx`, `mortality/page.tsx`, `sales/page.tsx`, `sales/[product]/page.tsx`, `inventory/page.tsx`: capture and display the same classification consistently. Preserve dedicated Stock/Mortality workflows.
- `app/api/farm/inventory/transaction/route.ts`, `app/api/farm/inventory/route.ts`, sale/correction handlers under `app/api/farm/`: authenticated validation and authoritative group writes/reads.
- Admin `app/(dashboard)/dashboard/farm/inventory/page.tsx`, sales page, `components/manager/InventoryActivity.tsx` and relevant correction controls: classification details, verified allocations, audited corrections and transfers.
- `lib/ceo-overview.ts`, `components/dashboard/CeoDashboard.tsx`: expose category detail while keeping financial calculations and product summary totals unchanged.
- Relevant report display components: matching labels only; legacy report strings stay readable.
- New migration allocated through `supabase migration new farm_livestock_categories`: additive classification/link fields, stock-group balances/events, validation constraints, guarded routines and least-privilege policies. Exact live column names and existing gender values must be inspected before final DDL is written.
- New focused tests `scripts/test-farm-livestock-categories.mjs`, `scripts/test-farm-livestock-ledger.mjs`, `scripts/test-farm-livestock-ui.mjs`; retain and run applicable existing V2/report/CEO tests.

## Review focus

1. Legacy unclassified animals must not be silently assigned a stage or become unavailable to an older valid stock/sale workflow.
2. Turkey sex must not be used as growth stage; chicken subtype and stage must remain compatible after selection changes.
3. Correction reversals, voids and retries must preserve category attribution and never duplicate product/group deductions.
4. A group shortage cannot consume another group's stock, even when the aggregate product balance is sufficient.
5. Classification, allocation and transfer must never modify pricing or count existing animals as a new stock arrival.

## Task 1 — Confirm catalogue and preserve baseline

- [x] Resolve the three questions above and record the approved options.
- [x] Inspect the current live schema, constraints, inventory trigger, V2 routines, grants and authoritative stock totals read-only; capture private baseline fingerprints and accounts. Stop affected work on unexpected schema/accounting drift.
- [x] Add failing catalogue tests for every listed combination, wrong chicken stages, independent Turkey sex, unknown sex, product switching and retained unrelated products.
- [x] Implement the shared catalogue and selectors minimally; run those tests.
- [x] Review and commit this self-contained catalogue deliverable.

## Task 2 — Preserve legacy totals and implement guarded classification

- [x] Write failing isolated database/API tests for classified additions, explicit unclassified legacy payloads, classification allocations with zero aggregate change and groups-plus-unclassified equality.
- [x] Allocate a forward migration. Add nullable classification links to relevant new records and an append-only group event ledger; reference original inventory movements, sales, reversals and retry receipts. Do not backfill historic rows.
- [x] Extend guarded write routines through the new migration, preserving all original financial calculations, role checks, date/closing locks and response envelopes. Lock product and group balances consistently, reject negative group/unclassified balances, and commit group events and main movements atomically.
- [x] Ensure corrections/voids reverse original group allocation, apply the replacement exactly once, and retain before/after values, actor, date and reason. Legacy corrections do not acquire guessed categories.
- [x] Add full-record aggregation/read endpoints and explicit Unclassified reporting; prohibit direct balance overwrites and client bypass.
- [x] Exercise concurrency, lost response/retry, invalid category, insufficient group stock, closed-day submission, forbidden manager correction, rollback-on-error and existing-account preservation tests.
- [x] Rehearse the migration against an isolated restored copy; compare original rows and product totals. Review and commit.

## Task 3 — Update stock, deductions and admin controls together

- [x] Write failing browser/API checks for Add Stock dependent selectors, correct payload/persisted result, clear validation, retained failed-save data and duplicate-safe retries.
- [x] Add structured classification to Add Stock and new sales/mortality where relevant. Retain original date, quantity and reason controls, pending-entry behavior and original cash/pricing rules.
- [x] Keep explicit legacy/unclassified entry paths compatible during transition. Do not allow old submissions to subtract from a classified group implicitly.
- [x] Add admin-only allocation and category correction controls. Add manual stage transfer only as a zero-total, audited operation, following the agreed manager correction-request boundary.
- [x] Test examples: adding 10 Pig Weaners adds 10 once; selling 3 deducts 3 from that group; recording 1 mortality deducts 1 and counts 1 death; transferring 4 to Grower leaves the total unchanged; all operations and reversals remain linked.
- [x] Test closure, validation, stale record and provider-failure states. Review and commit.

## Task 4 — Make inventory and reports agree

- [x] Write failing tests for category breakdowns alongside legacy Unclassified stock, more than 200 movements, corrected mortality and unchanged CEO financial/product totals.
- [x] Display type/stage/known sex in manager inventory/history and admin inventory/sales/corrections; expose concise category details on the CEO dashboard.
- [x] Align category wording in relevant daily-report help/display without rewriting older report versions or inferring stock from free text. Keep Ram and other existing report sections.
- [x] Run actual styled UI checks at 390/768/1440 widths, including long labels, empty groups, unknown sex, filtered views, errors, accessible selectors and touch controls. Inspect screenshots, review and commit.

## Task 5 — Verify and coordinate production release

- [x] Run `npm run lint`, `npm run build`, the focused catalogue/ledger/UI tests and applicable existing farm V2, sales, finance, corrections, closure, feed, report, CEO and account-access regression checks.
- [x] Verify all requested catalogue values appear and persist; no protected non-farm implementation, account role, password or historical financial amount changed.
- [x] Document backup/restore evidence, legacy NULL behavior, migration preconditions, locking implications and rollback limitations. An old app must not be restored if it would ignore category allocations and corrupt classified stock.
- [x] Obtain explicit authorization for this correction release. Earlier production approvals do not authorize deployment of a plan requested for review.
- [x] Recheck the production project, branch and commit; take a fresh restorable backup and use a brief farm-write pause if required for the coordinated routine/schema transition.
- [x] Apply only the approved new migration, deploy compatible code, verify stock invariants, live access and aliases, then remove any pause. Confirm original profiles, quantities and history are preserved. Do not seed screenshot numbers.

## Acceptance summary

All specified animals, types, stages and known-sex labels are supported consistently; unrelated products stay intact. Legacy history remains readable and unclassified where unknown. New additions/deductions, corrections and manual stage changes preserve both group and aggregate quantities. Financial meaning, manager correction permissions, closed dates, retry safety, accounts and the other apps remain protected. Implementation and production release were subsequently authorized by the user; execution evidence is recorded in the accompanying release report.
