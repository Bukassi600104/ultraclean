# CEO Dashboard Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after the user approves implementation. Steps use checkbox syntax for tracking. This document authorizes no implementation or release by itself.

**Goal:** Resolve the navigation and financial-reporting findings in both audits, and give Bimbo a clear section for each business while preserving production records, access and established workflows.

**Architecture:** Reuse the existing dashboard header, financial service, protected APIs, UI components and installed Recharts library. Add consistent navigation and read-only analytics; correct filtering and presentation at their existing boundaries. Preserve the distinction between software defects, missing business records and accounting measures that the system cannot yet establish.

**Tech Stack:** Existing Next.js 14, React, TypeScript, Tailwind, shadcn/ui, Recharts, Zod and Supabase/PostgreSQL. No new dependencies or schema migrations are expected.

**Spec:** [Bimbo Dashboard Audit Report](</C:/Users/USER/Desktop/Client Projects/Bimbo/reports/Bimbo Dashboard Audit Report.md>), both reports, dated 27 October 2026, plus the user's requirement for separate vertically stacked business analytics sections.

## Global Constraints

- This is live production. Preserve existing records and workflows.
- Planning only at this stage: do not change application code, run migrations, enter/correct financial records, push or deploy.
- Baseline at audit: local and deployed commit `0e95383d98636a7e5323155d319cf87996d387d1`; Supabase `gsxqrjywtugeuexrjcln`; Vercel project `ultratidy`, ID `prj_9WsH2D8DLOtXVo3lHPLSve4R3Og4`. Recheck these before implementation/release.
- Preserve all routes, account roles, passwords, access restrictions, saved drafts, offline retries, correction requests, closure controls, sale/stock linkage and audit history.
- Do not recalculate saved historical sale amounts, assign missing attribution, change funding sources or infer missing transactions.
- Keep existing create, save, correction, transfer and close-day workflows. Analytics must not become another writer to the business ledgers.
- Preserve existing API envelopes and query parameters. New response fields and filters are additive.
- Keep existing screen defaults familiar: CEO homepage is month-to-date, manager Cash is today, manager weekly cards begin Sunday, dedicated Farm overview is all recorded history through today. Make the periods explicit and allow like-for-like comparisons.
- Keep NGN, CAD and other recorded currencies separate. Do not introduce exchange rates or a mixed-currency grand total.
- Keep owner funding, sales revenue, cash balances and recorded operating results visibly distinct. Do not call owner transfers revenue or call sales less recorded expenses complete profit.
- No production test transactions or sample business data. Use isolated synthetic fixtures for write-path regression checks.
- New production migration, push to the auto-deploying branch or deployment requires explicit approval for this remediation release. Earlier releases are not approval for this plan.

## Review Focus

1. Direct entry into a nested page must have a deterministic safe parent link, even without browser history; navigation away from an unsaved form must retain existing draft/confirmation behavior. Task 2 tests this.
2. Changing date filters while a slow request is outstanding must not show stale figures or append records from the prior filter. Tasks 3 and 7 test this.
3. More than 100 records, equal timestamps, voided entries and uneven expense/feed distributions must not truncate, duplicate or reorder totals and history. Tasks 3 through 5 test this.
4. Missing records, failed requests, missing audience baselines and absent rent schedules must remain distinguishable from genuine zero activity. Tasks 1, 4, 6 and 7 test this.
5. Historical financial periods must not silently turn current inventory, occupancy or account snapshots into historical measurements. Tasks 6 and 7 test this.

## Coverage of Both Reports

| Finding or requirement | Task |
|---|---|
| 20 pages lack dedicated Back links; existing seven must remain usable | 2 |
| Four Farm pages highlight both parent and child sidebar entries | 2 |
| Differing daily, weekly, monthly and all-history figures | 3, 6, 7 |
| Missing September/October expense entries | 1, 8 |
| Manager Sales totals limited to 100 rows | 4 |
| Manager expense failure displays false zeros | 4 |
| History date filters can hide older matching records | 3 |
| Inconsistent whole-naira versus kobo presentation | 4 |
| Combined general/feed expense pagination is incorrect | 5 |
| UltraTidy financial summary omitted; DBA lacks its own section | 6, 7 |
| One full section per business, with meaningful visual analysis | 6, 7 |
| Content/Property/DBA lack actual business records | 1, 7, 8 |
| Current snapshots and period activity can be confused | 6, 7 |
| Full profit, overdue rent and conversion analysis require defined inputs | 6, 8 |
| Production preservation, release and rollback | 9 |

## Task 1: Establish a Reconciled Baseline and Record Data Limitations

**Files:** Read the audit report, `lib/farm-finance.ts`, `lib/farm-finance-calculations.ts`, `lib/ceo-overview.ts` and the relevant API handlers. Update release evidence alongside this plan during implementation; keep private record snapshots outside Git.

**Deliverable:** A timestamped reconciliation of the same records and periods before any financial UI change, with confirmed gaps documented separately from software defects.

- [x] Verify branch, working tree, production deployment and configured database. Preserve unrelated local changes. Inspect any newer migrations or schema drift before relying on the audit baseline.
- [x] Read active transfers, general expenses, feed purchases and sales. Compare independent database sums with the existing financial service for today, this week, this month and all recorded history. Include opening balances before each selected period.
- [x] Reproduce the audit snapshot only if records remain unchanged: owner transfers NGN 12,436,406; owner general expenses NGN 6,745,674; feed NGN 2,716,232; owner balance NGN 2,974,500; sales cash NGN 2,808,800. New legitimate activity is not a regression; record the new baseline instead.
- [x] Confirm last financial entry dates and counts for every business. The audit found no general expenses after 25 August or feed purchases after 28 August; do not assume this remains true at execution time.
- [x] Record which requested measures are supported by stored fields and which remain unavailable. Do not interpret an empty ledger as proof of no real business activity.

**Verification:** Source sums and service outputs agree to displayed currency precision for identical scopes; exceptions are explained before proceeding. A confirmed ledger/formula discrepancy pauses only affected accounting work while independent navigation work continues.

## Task 2: Consistent Back Navigation and a Single Active Sidebar Destination

**Files:** Modify `components/dashboard/DashboardHeader.tsx`, `components/dashboard/Sidebar.tsx`; create `lib/dashboard-navigation.ts`; update dashboard pages under `app/(dashboard)/dashboard/` as needed. The four wrapper pages for Farm Daily Reports, Operational Requests, Feed Stock and Daily Feed must use the same dashboard header without altering their manager equivalents. Add `scripts/test-dashboard-navigation.mjs`.

**Interfaces:** `dashboardBackLink(pathname)` returns a fixed internal `href` and `label`, or null on the CEO homepage. DashboardHeader consumes this rule. Existing header title, subtitle and actions contracts remain supported.

- [x] Add failing route-rule and styled browser checks for all 27 dashboard page types, including dynamic edit/detail routes, direct URL entry and the four admin wrapper pages. Assert one visible Back action per page and none on the CEO homepage.
- [x] Implement explicit parents: top-level business/list/settings/account pages return to CEO Dashboard; Farm children return to Farm Overview; UltraTidy children return to UltraTidy Overview; DBA lists return to DBA Overview; new/edit products return to Products; new/edit blog posts return to Blog; lead details return to Leads.
- [x] Put the shared Back action in DashboardHeader. Replace the seven older standalone Back controls with this single consistent control, avoiding duplicate Back buttons. Retain the four form Cancel actions and all existing save/draft handling. Do not use browser history as the sole destination.
- [x] Select the longest matching sidebar destination so Supplies, Feed Inventory, Daily Reports and Operational Requests do not also highlight Farm. Retain all 15 destinations, desktop collapse, mobile menu and sign-out behavior.
- [x] Verify Property and Content's existing admin-only CEO return links and their own Overview navigation remain available; do not add duplicate dashboard chrome to their manager apps.
- [x] Run `node scripts/test-dashboard-navigation.mjs`. Check keyboard access, accessible names, touch targets and 390/768/1440 widths. Review and commit the navigation-only change.

## Task 3: Correct History Filtering Before Pagination

**Files:** Modify `app/api/farm/sales/route.ts`, `app/api/farm/expenses/route.ts`, `app/api/farm/feed-purchases/route.ts`, `app/(manager)/manager/records/page.tsx`; extend `scripts/test-farm-v2-api.mjs`, `scripts/test-farm-v2-ui.mjs`.

**Interfaces:** Add optional `from` and `to` query parameters to the existing list handlers; preserve `date`, page, limit and `{data,total}`. Apply real calendar-date validation, inclusive bounds and existing authorization/void exclusions before database count, ordering and range. Conflicting exact-date/range inputs return 400; existing exact-date-only callers continue working.

- [x] Add failing fixtures where the first unfiltered page is outside the requested dates but later records match, including more than 100 rows. Cover general expenses and feed as well as sales, invalid dates, empty matches, request failure and rapid filter changes.
- [x] Pass filters to the server from Records; remove post-pagination filtering as the authoritative mechanism. Use stable descending date, creation time and ID ordering in the handlers.
- [x] Reset pagination on filter/tab changes; cancel or ignore obsolete responses. Distinguish loading, unavailable and genuinely empty results; do not silently convert HTTP errors into empty lists.
- [x] Preserve infinite scrolling, correction-request controls, original record dates and read permissions. Run `node scripts/test-farm-v2-api.mjs` and `node scripts/test-farm-v2-ui.mjs`; verify all new cases and existing behavior. Review and commit.

## Task 4: Complete Daily Totals, Honest Errors and Consistent Money Formatting

**Files:** Modify manager Sales, Expenses, Cash, home and Records pages; relevant dashboard Farm overview/Sales/Expenses pages; extend `lib/utils.ts` with the shared display formatter if no equivalent exists. Extend `scripts/test-farm-v2-calculations.mjs`, `scripts/test-farm-v2-ui.mjs`, `scripts/test-farm-v2-api.mjs`.

**Interfaces:** `formatCurrency(value, currency)` displays monetary amounts to two decimal places with a single correct sign. It formats values only; it does not modify saved amounts or pricing calculations. Existing balance fields and funding formulas retain their meaning.

- [x] Add failing checks for 101 sales in one day, a summary failure, partial list failure, 100.25, -100.25, zero, retry after failure and a negative owner balance. Assert CEO and manager display identical values for identical fields/scopes.
- [x] Read manager daily Sales KPI and product-chart data from `/api/farm/balance?date=D&from=D&to=D`, using `revenue` and `sales_by_product`. Keep its recent-record list paginated separately; never derive a complete KPI from that list.
- [x] Give manager Expenses explicit summary/list error states. Failed initial loading must show unavailable with Retry rather than zero. Preserve user input and drafts; mark any retained older result stale until refreshed.
- [x] Replace inconsistent monetary rounding/display in the audited farm surfaces with the formatter, including the manager home's duplicate-negative-sign case. Do not alter quantities, units, stored totals or monetary writes.
- [x] Label every summary with its actual period. Retain familiar defaults and distinguish general expenses, feed, owner funds and sales cash. Use Recorded operating result rather than Net Profit where only recorded sales and operating expenses are established.
- [x] Run the three extended farm scripts. Confirm void exclusions, feed counted once, legacy meanings and current manager create/correction workflows remain intact. Review and commit.

## Task 5: Correct the Combined General-Expense and Feed History

**Files:** Create `app/api/farm/expense-history/route.ts`; modify `app/(dashboard)/dashboard/farm/expenses/page.tsx`; extend `scripts/test-farm-v2-api.mjs` and `scripts/test-farm-v2-ui.mjs`.

**Interfaces:** Admin-only GET accepts category, optional inclusive dates, page and limit. Returns `{data,total,page,limit}`, where each row retains the current display shape `{_type: 'expense' | 'feed', data: originalRecord}`. Existing expense and feed endpoints and write handlers remain unchanged.

- [x] Add failing checks for 20 general plus 20 feed entries: exactly 20 rows on each of two pages, no third page; test uneven distributions, tied timestamps, feed-only/category filters, voided expenses, more than 100 rows, and failure of either source.
- [x] Build one server-ordered result before slicing the combined page. For each included source, read the first `page × limit` filtered records in bounded batches, merge by descending date/created_at/ID with type as the final tie-breaker, then slice once. Use exact filtered counts for the combined total. This preserves complete pagination without adding a database view or RPC.
- [x] Do not return a misleading partial success if one source fails. Preserve original record types/IDs and correction controls; reset the page when filters change and ignore obsolete responses.
- [x] Label a page subtotal as a page subtotal. Any full-period financial KPI must continue using the complete financial service, independent of list pagination.
- [x] Run the extended API/UI scripts; verify stable ordering across pages and unchanged correction refresh behavior. Review and commit.

## Task 6: Extend Existing Read-Only Aggregates for All Businesses

**Files:** Modify `lib/farm-finance-calculations.ts`, `lib/ceo-calculations.ts`, `lib/ceo-overview.ts`, `app/api/ceo/overview/route.ts`; extend `scripts/test-farm-v2-calculations.mjs`, `scripts/test-bossbimbz-ceo-data.mjs` and `scripts/test-bossbimbz-ceo-api.mjs`.

**Interfaces:** Preserve all existing finance/overview fields. Add per-business daily trend and breakdown arrays, separate by recorded currency. Add a farm `period_reconciliation` with opening/closing owner and sales-cash balances, period owner transfers, owner general expenses, feed purchases, sales and sales-funded expenses. Existing `opening_balance` keeps its current selected-day meaning.

- [x] Add failing calculation/API checks for matching periods, true opening balances, an empty period with prior activity, 501+ records, voids, legacy NULL sources, negative amounts/results, separate currencies, missing baselines, query failures and exact source-to-summary reconciliation.
- [x] Extend the existing farm calculation in one place: daily revenue/expense/operating-result series; product sales and expense categories; the period funding bridge. Closing owner balance must equal opening owner balance plus period transfers minus period owner expenses and feed. Sales cash uses its own corresponding bridge. Do not combine funding with revenue.
- [x] Add `summarizeUltraTidy(rows, scope)` and `summarizeDba(rows, scope)` in `lib/ceo-calculations.ts`. UltraTidy uses recorded CAD inflow/expenses, daily series and service/category breakdowns. DBA uses recorded sales and product breakdowns; expenses/profit remain unavailable because this ledger does not establish them. Confirm its existing currency convention from the schema/UI before labelling amounts.
- [x] Extend `summarizeContent` with mentorship/affiliate and platform/content attribution breakdowns. Audience observations remain account snapshots; do not sum follower counts over dates or sum reach snapshots as unique period reach. Growth requires comparable observations for the same account; absent baseline means unavailable. Lead status distributions describe current status of leads recorded in the selected period, not historical conversion as of the period end.
- [x] Extend `summarizeProperties` with recorded rent/expense trends and property-level breakdowns. Current occupancy uses current occupied/vacant/unavailable unit counts and states the denominator. Past-date occupancy and overdue rent remain unavailable unless authoritative historical occupancy/rent schedules support them. Maintenance estimates remain separate from actual posted expenses.
- [x] Read all relevant records with the existing complete-record pagination pattern. Add independent `ultratidy` and `dba` section results; failure in one business must not blank the others. Return explicit unavailable/empty states and latest-entry metadata, not fabricated revenue or profit.
- [x] Run the three extended scripts. Assert that daily series and breakdowns add to their own period/currency totals; compare new farm totals with unchanged existing fields. Review and commit.

## Task 7: Present Full-Width Business Sections and Useful Analytics

**Files:** Modify `components/dashboard/CeoDashboard.tsx`; create `components/dashboard/BusinessFinancialCharts.tsx` for repeated read-only Recharts presentation; modify dedicated Farm, UltraTidy and DBA overview pages only where needed to share aggregate results/period labels. Extend `scripts/test-bossbimbz-ceo-ui.mjs`, `scripts/test-bossbimbz-ceo-api.mjs` and `scripts/test-farm-v2-ui.mjs`.

**Interfaces:** Consume Task 6's existing/additive API results. Charts receive the already aggregated series/breakdowns; they never fetch or sum a first page of history. Retain protected section links, date inputs, Refresh and Apply actions.

- [x] Add failing styled browser checks for the five business sections, their order, matching-period drill-downs, incomplete/empty data, partial failures, rapid Apply/Refresh actions, keyboard/screen-reader access and 390/768/1440 widths.
- [x] Stack full-width sections in this order: Primefield, UltraTidy, DBA, Content, Property. Place CRM/decisions/reports after the business sections so they do not compete with or fragment the financial overview. Preserve those actions and destinations.
- [x] Primefield: show period revenue, general/feed expenses and recorded operating result; separate owner funds and sales cash; opening-to-closing funding reconciliation; income/expense trend, product sales and expense-category charts; existing current inventory/feed/mortality details.
- [x] UltraTidy: show recorded inflow, expenses, operating result, trend, inflow by service and expenses by category. DBA: show recorded revenue, sale count, sales trend and product contribution; explain unavailable cost/profit measures.
- [x] Content: show recorded mentorship/affiliate revenue by currency, published content/leads, sales attribution and comparable audience observations. Property: show recorded rent, expenses/net cash result, current occupancy, property breakdowns, trends and open work. Show unavailable measures honestly rather than inferring profit or unpaid rent.
- [x] Reuse Recharts: line/bar charts for time and comparisons; donut/pie charts only for nonnegative category shares. Do not hide deficits, draw misleading negative pie slices, invent empty-series values or rely on colour alone. Each chart has a textual total and accessible table/description, currency, units and period.
- [x] Add CEO period presets Today, This week, This month and Custom, retaining the current default. Keep manager defaults unchanged but label them. Allow comparable periods on dedicated financial overviews; use complete server aggregates for their KPIs, preserving original histories/forms. Dedicated UltraTidy/DBA overviews may consume their section of the existing CEO endpoint rather than calculate from capped list responses.
- [x] Distinguish period flows, balances as at the end date and current snapshots. Show last-recorded dates and a neutral completeness notice where recent expenses are absent; do not claim spending was zero or accuse a user of omissions.
- [x] Run the three extended scripts and inspect actual rendered screenshots at all three widths. Verify original dashboard links, manager workflows, PWA entry points and no horizontal overflow. Review and commit.

## Task 8: Resolve Business-Data Questions Through Existing Workflows

**Deliverable:** A separate reconciliation checklist, not an automatic data migration. No new business records are created by implementing the UI.

- [ ] Ask Bimbo/the manager for the missing expense/feed entries and supporting dates, amounts and funding sources; compare with existing records to prevent duplicate entry. Do not assume each transfer was spent or infer expenses from free-text reports.
- [ ] If data entry/correction is explicitly authorized, use the existing trusted create/admin correction workflows with real operational dates and reasons. Preserve closed days and audit attribution; do not reopen dates or silently amend legacy history.
- [ ] Establish actual Property/Content/DBA starting records through their existing screens when supplied. Continue to show no records or unavailable until then.
- [ ] Before claiming full business profit or overdue rent, obtain the missing accounting scope and rental billing schedule. Adding cost ledgers, rent schedules or new accounting workflows requires a separate approved scope; this plan does not invent them. Supported recorded cash-flow analytics can ship independently with these measures clearly unavailable.
- [ ] Re-run the same-period reconciliation after authorized real entries. Record whether actual balances are reconciled or still awaiting evidence. Do not mark the accounting-data issue resolved merely because the charts are finished.

## Task 9: Verification, Production Release and Rollback

**Files:** Update this plan's implementation/release evidence when work is actually performed. Keep backups, auth data and private reconciliation material outside the repository.

- [ ] Obtain implementation approval. Then use an isolated branch/worktree as appropriate, recheck the current baseline and keep unrelated changes out of the patch. No release is implied by implementation approval.
- [ ] Run `npm run lint`, `npm run build`, all tests added/extended above, plus existing `scripts/test-bossbimbz-routing.mjs`, `scripts/test-manager-accounts.mjs`, livestock ledger/API/UI tests and applicable feed/report regression tests. Test writes only against isolated fixtures. Run the built GET smoke checks.
- [ ] Prove no account, password, historical amount, funding source, stock quantity or business row is changed by these read-only features. Recheck manager saved-record permissions, offline retry, closed-day controls and mobile installation entry points.
- [ ] Complete a focused independent review of navigation, dates, errors, financial contracts and production compatibility. Record failures and repairs; do not claim a pass from source inspection alone.
- [ ] Obtain explicit approval for the concrete reviewed remediation release. Verify the restorable private production backup and rollback target; inspect schema drift and re-run read-only baseline aggregates immediately before release.
- [ ] Stage a production-environment Vercel build without assigning live domains. Verify the tested commit, configuration, routes and read-only API behavior. This plan expects code-only changes, so no farm-write pause or migration is needed. If a schema change becomes necessary, stop that affected work and revise the migration/backup/rehearsal/release plan before approval.
- [ ] Promote the approved build, push according to the verified Git/Vercel release flow, and verify the final READY commit and branded domain assignments. Confirm zero deployment/alias errors.
- [ ] Check authenticated CEO navigation and each business section, compare CEO and manager figures for the same scope, verify empty/error states, and perform public/CRM/DBA/Property/Content smoke checks without creating production test entries. If authenticated access is unavailable, record the exact unverified items and do not describe them as completed.
- [ ] Roll back the application to the verified compatible prior deployment if a release regression appears. Because no data/schema changes are planned, rollback must not restore an old database or discard legitimate activity. Recheck live access after rollback/promotion.

## Completion Conditions

- All 27 dashboard page types have the correct single parent-return action; four ambiguous Farm sidebar highlights are resolved; existing Cancel actions and Property/Content return links remain intact.
- Comparable screens agree for the same period and measure, including more than 100 records, fractional currency amounts and negative balances.
- A failed request never presents invented zero finances or false empty history. Date filtering occurs before pagination; combined expense/feed pages have correct global ordering and counts.
- Every business has its own full-width section with complete-record, clearly scoped analytics and accessible charts; unsupported measures remain visibly unavailable.
- Existing records, accounts, quantities and write workflows survive unchanged. No historical financial data is inferred or rewritten.
- Software delivery and real-world accounting reconciliation are reported separately. Missing receipts, business entries, rent schedules or profit definitions remain explicit outstanding inputs until supplied and authorized.
- Production deployment, authenticated verification and rollback readiness are evidenced, not assumed.

**Execution status:** Implementation and production release subsequently authorized and completed. See the accompanying release evidence. Missing-data steps in Task 8 remain deferred by explicit user instruction; no accounting records were invented. Authenticated live walkthrough remains pending sign-in.
