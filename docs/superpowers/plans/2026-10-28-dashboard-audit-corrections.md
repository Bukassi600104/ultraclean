# Bimbo Dashboard Audit Corrections Implementation Plan

> Implementation has not been authorized by this planning request. Use the executing-plans skill when the user later asks to proceed; complete each section and its verification before release.

**Goal:** Correct the audit's accounting, mortality, navigation, accessibility and account-test findings without disturbing Bimbo's live records or workflows.

**Architecture:** Keep the current Next.js applications and shared financial services. Use one date-aware mortality calculation and exact decimal aggregation over text-preserved database values. Add explicit parent navigation and accessible labels around existing forms, then verify behavior using isolated fixtures and read-only production comparisons.

**Tech stack:** Next.js 14, React 18, TypeScript, Supabase/PostgREST, existing Playwright and Node test scripts. Avoid new product dependencies and schema changes unless the preferred approach proves unworkable.

**Spec and evidence:** `C:/Users/USER/Desktop/Client Projects/Bimbo/reports/Bimbo Dashboard Production Audit 2026-10-27.md`; the approved goals and addendum in `C:/Users/USER/.codex/attachments/6c30f97e-cd75-4e4f-ba4f-1101368df740/Pasted text.txt` and `C:/Users/USER/.codex/attachments/cca65452-3fb5-43f2-beed-e5d86dd0c2da/Pasted text.txt`; previous dashboard remediation plan in `docs/superpowers/plans/2026-10-27-dashboard-audit-remediation.md`.

## Global constraints

- Live production: preserve all records, account identities, passwords, stock, attribution, historical amounts and existing URLs/workflows. Do not delete or rewrite production business data.
- The user explicitly chose to leave missing September/October farm records untouched. Never derive expenses from transfer descriptions, invent receipts, opening feed counts, property/content sales or historical currency.
- Use a fresh isolated checkout of the current deployed revision for future implementation. Record Git/Vercel/Supabase baselines, check current deployment and establish a verified restorable backup appropriate to the actual change before release.
- Do not deploy, push to an auto-deploying branch, apply migrations, or change production data during planning. Require fresh explicit authorization for the reviewed release; any needed production migration requires separate review, a restorable backup and isolated rehearsal.
- The desired path is code-only: PostgREST supports `numeric_column::text` in a select, allowing exact decimal input without schema changes. Verify compatibility against the configured version using a read-only request. If that is unavailable, stop the accounting release and design a separately reviewed, backward-compatible read-only database routine; never alter stored amounts to make the implementation easier. Reference: https://docs.postgrest.org/en/stable/references/api/tables_views.html#casting-columns.
- Test mutations against isolated fixtures only. Production visual checks use the temporary CEO account and read-only interactions. Keep this account until the user explicitly says testing is finished; current instruction prohibits deletion.

## Review focus

- A mortality correction or reversal dated outside the selected period still affects which original movement is active; apply reversal logic before filtering by the movement's operational date.
- The live farm numeric columns have unrestricted scale, including historical fractional residue. Never round individual rows or reduce stored precision; add exact input values first and round the final result for display.
- Opening balances, mixed funding sources, voids, feed and date boundaries must reconcile across complete lists, even above 100 records or on partial failure.
- Direct links, browser refresh, mobile layouts and existing unsaved/offline forms must have safe, predictable parent navigation; never auto-submit, erase drafts or use an external browser-history destination.
- Auth roles, empty data, failed API requests, missing account baselines and mixed currencies must not display misleading zeroes, fabricated profit or guessed currency.

## Task 1: Baseline and reproduction

**Files to inspect:** `lib/farm-inventory.ts`, `lib/ceo-overview.ts`, `app/(dashboard)/dashboard/farm/page.tsx`, `lib/farm-finance*.ts`, `lib/ceo-calculations.ts`, `app/(manager)/manager/layout.tsx`, `components/property/PropertyShell.tsx`, `components/content/ContentShell.tsx`, `scripts/test-manager-accounts-ui.mjs`.

- [ ] Record current deployment SHA, database identity, schema types, current read-only aggregate totals and existing account/record counts. Record snapshot time, since Bimbo's team can legitimately add data during the work. Do not compare two times as though legitimate activity were a regression.
- [ ] Reproduce the 27 October audit on isolated fixtures: October 1–27 CEO mortality 7 vs farm-detail all-history 1,682; existing decimal residue; missing field/control labels; missing main manager Back actions; account UI test `process is not defined`.
- [ ] Read `AGENTS.md`, current migrations and local release instructions. Confirm the intended patch is code-only; if database changes become necessary, pause the affected release and produce an independently rehearsed migration plan.

## Task 2: Consistent farm mortality and periods

**Modify:** `lib/farm-inventory.ts`, `lib/ceo-overview.ts`, `app/(dashboard)/dashboard/farm/page.tsx`; related tests in `scripts/test-farm-v2-calculations.mjs`, `scripts/test-dashboard-analytics.mjs` and `scripts/test-farm-v2-ui.mjs`.

**Interface:** shared `mortalityByProduct(transactions, {from?: string, to: string})` returns product totals and overall total; `from` absent means all history through `to`.

- [ ] Add failing tests proving original movements, reversals and replacements are processed before date filtering; include same-day, correction outside period, future entries, no start date, empty rows and >500 movements.
- [ ] Use the shared helper in both CEO and Farm Overview. With October 1–27 selected, both show the same period total, 7 on the audited snapshot; all-history results are explicitly labelled and bounded by the selected end date. No inventory data is changed.
- [ ] Test that complete movement pages are read and an error shows unavailable rather than a stale or invented result. Run the three targeted scripts and verify both views for identical dates on isolated data.

## Task 3: Exact accounting and cross-app reconciliation

**Modify:** `lib/farm-finance.ts`, `lib/farm-finance-calculations.ts`, `lib/ceo-calculations.ts`, `lib/ceo-overview.ts`, applicable financial API/consumer files and `lib/utils.ts`; extend `scripts/test-farm-v2-calculations.mjs`, `scripts/test-dashboard-analytics.mjs`, `scripts/test-bossbimbz-ceo-data.mjs`, `scripts/test-bossbimbz-ceo-api.mjs`, `scripts/test-farm-v2-api.mjs`, `scripts/test-bossbimbz-property-ui.mjs` and `scripts/test-bossbimbz-content-ui.mjs` where their contracts are affected.

**Interface:** server reads monetary `numeric` fields as decimal text, retains complete original scale, and computes amounts with exact signed decimal arithmetic. `calculateFarmFinance` keeps existing fields and meaning; add exact string representation only if necessary for safe transport. Existing numeric JSON fields remain numbers when representable to the documented displayed precision; never silently emit an inaccurate amount for values beyond that range. Date, currency and pagination contracts remain stable.

- [ ] Validate text casts and null/type behavior in a read-only production query; verify all callers and existing field types before changing the read path. Do not rely on a JSON number converted back to text after precision has already been lost.
- [ ] Write failing tests for `0.1 + 0.2`, negative values, sub-kobo legacy amounts including `2716231.9999999`, same-day and historical scopes, very large values, missing/invalid amounts, mixed funding, voids, 501+ rows and independent query failure. Include feed exactly once and NULL legacy funding treated as owner-funded.
- [ ] Aggregate at full stored scale; do not round each historical row. Round each final displayed aggregate to two places with a single documented rule (nearest, half away from zero) and explicitly show any rounding adjustment needed to make displayed bridge components reconcile. Ensure large or unrepresentable results are explicit rather than silently imprecise.
- [ ] Preserve the existing formulas: owner funds = transfers − owner general expenses − feed purchases; sales cash = sales − sales-funded general expenses; operational expenses = general expenses + feed; operational result = sales − operational expenses. Check opening and closing balances for identical dates and carry negative signs correctly.
- [ ] Apply equivalent exact aggregation to Property, Content and UltraTidy financial summaries, without combining currencies or changing recorded transaction amounts. Ensure Property's all-history view is clearly labelled and matches the CEO view when scopes match. DBA currency stays unknown until Bimbo supplies an authoritative convention; do not relabel its historical sales as a guessed currency.
- [ ] Compare isolated server/API/UI results with independent SQL numeric sums and realistic historical snapshots. Recheck CEO, manager cash, manager home, Farm Overview, Property and Content for matching scopes; do not assert bank reconciliation without actual statements and receipts. Confirm unsupplied records remain untouched and the dashboard continues to flag the data gap.

## Task 4: Return navigation and screen layout

**Modify:** `app/(manager)/manager/layout.tsx`, `components/manager/ManagerSidebar.tsx` only where needed, `components/property/PropertyShell.tsx`, `components/content/ContentShell.tsx`, and existing navigation helpers/tests. Preserve `components/dashboard/DashboardHeader.tsx` and existing CEO mappings except where a confirmed error requires a fix.

- [ ] Define deterministic parent routes: manager menu pages → manager overview; manager sale/expense product forms → Sales/Expenses; daily report history → Daily Report; Property and Content inner sections → their own Overview; their Overview retains the existing CEO link for authorized admins. Home and login pages have no misleading Back action.
- [ ] Add a visible, labelled Back action at the top of applicable pages without removing existing sidebar links, Done/Cancel actions, offline conflict banners or draft handling. Map both branded host and `/manager` path variants. Do not use `history.back()` as the only destination.
- [ ] Add tests for every live menu route, nested forms, direct-entry/refresh, login/home, narrow and desktop widths, keyboard access, a minimum 44px touch target, long text, no duplicated active menu item and an offline draft remaining intact after ordinary navigation.
- [ ] Run `node scripts/test-dashboard-navigation.mjs`, `node scripts/test-dashboard-navigation-ui.mjs`, the existing manager/property/content UI suites, and inspect actual rendered screens at 390, 768 and 1440 pixels. Check one explicit real Back interaction per shell on a read-only preview.

## Task 5: Accessible forms and controls

**Modify:** `app/(manager)/manager/sales/[product]/page.tsx`, `components/dashboard/blog/BlogTable.tsx`, `components/dashboard/blog/TipTapEditor.tsx` and any other controls confirmed by the focused audit; extend existing UI tests.

- [ ] Associate visible labels with the date, quantity, weight, unit price, customer and notes inputs using stable `id`/`htmlFor` or wrapping labels. Retain existing values, input constraints, pricing, stock category and keyboard behavior for every product.
- [ ] Give icon-only blog edit links and editor toolbar actions clear accessible names. Test labels, focus order and visible text; do not alter editing, uploads, saving or publishing.
- [ ] Test the unsaved catfish example: 40 fish, 72 kg and ₦3,000/kg displays ₦216,000; ensure no API write occurs in preview. Inspect representative forms, modals and long text on mobile and desktop, including scrollable action buttons.

## Task 6: Repair isolated account-page UI test

**Modify:** `scripts/test-manager-accounts-ui.mjs`; refer to the isolated Next mocks in `scripts/test-dashboard-navigation-ui.mjs`. Do not change production account behavior to satisfy the harness.

- [ ] Reproduce the reported `process is not defined` error. Use existing isolated browser shims for `next/navigation` and `next/link` and any minimal environment setup needed by the actual account page. Capture page errors in failure output.
- [ ] Keep all existing test assertions: create for farm/property/content roles, suspend/reactivate, remove access while preserving history, API errors and 390/768/1440 layouts. No real users or live writes.
- [ ] Run `node scripts/test-manager-accounts-ui.mjs` and `node scripts/test-manager-accounts.mjs`; both must pass independently. Separately verify the live create dialog opens without submitting.

## Task 7: Integrated verification and release preparation

- [ ] Run `npm run lint`, `npm run build`, targeted suites above and applicable farm V2, livestock, daily reports, feed, middleware, CEO, Property, Content and account regressions. Use synthetic writes and dedicated fixtures only; document any failures and resolve them before a release recommendation.
- [ ] Compare baseline and candidate with a consistent, read-only production snapshot. Account for normal concurrent business activity; compare the same snapshot/IDs and values rather than assuming a changing live table is static. Confirm unchanged schemas, policies, historical records, roles and account access. Exercise date filters, Back controls, charts, forms, categories and narrow layouts against a protected preview.
- [ ] Recheck social connection status, actual feed opening counts, missing farm expenses and empty Property/Content ledgers; report what remains unavailable. Do not perform real OAuth authorization or enter missing records without a separate user-provided instruction and genuine values.
- [ ] Prepare a concise review, migration/no-migration statement, immutable source commit, Vercel preview evidence, current production rollback target and backup/restore evidence. Check compatibility and readiness before requesting explicit production release authorization. Rollback the application only; never restore an old database over legitimate new activity.
- [ ] After explicit release approval, deploy the reviewed commit, verify the exact Vercel deployment and live read-only CEO/manager navigation and matching financial scopes, and document results. Keep the temporary CEO account until the user confirms testing is finished and authorizes its cleanup.

## Completion criteria

- Mortality agrees between CEO and Farm Overview for identical dates, including correction/reversal cases; all-history results are labelled.
- Exact calculations and visible reconciliations agree for equivalent periods, funding sources and currencies, including high-precision legacy values, negatives, >500 records and failure cases; historical values remain untouched.
- Explicit Back actions and accessible controls work on the requested shells and sizes while existing workflows, roles, account history and unsaved/offline behavior remain intact.
- The isolated account UI and relevant regression suites pass, and production is updated only after explicit release authorization.
- Real-world reconciliation, social authorization, opening feed counts and mobile installation are described accurately according to available evidence rather than asserted complete.
