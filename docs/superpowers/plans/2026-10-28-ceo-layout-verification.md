# CEO control-centre presentation verification

Scope: approved manager handover/funds plan Task 6A. Changes are confined to page presentation, read-error states, identity boundaries and accessibility. Original business save/remove handlers and source figures are retained.

All 32 actual route components render inside the real CEO layout, Sidebar and DashboardHeader with project Tailwind. Next/auth/HTTP boundaries alone are isolated. Fixtures live in test scripts and cannot populate production. Each nested route has one deterministic parent link and one page heading. Ordinary page bodies are constrained and centred; tables retain local horizontal scrolling. Loading, successful empty/zero, unknown attribution/count and failed-source states remain distinct.

| Route under `/dashboard` | Back destination | Content/form/data contract |
|---|---|---|
| `/` | None | Business sections, real measures and drilldowns; independent source failures |
| `/appointments` | CEO | Appointments table; genuine empty list or retry error |
| `/leads` | CEO | Leads table and centred Add Lead dialog |
| `/leads/[id]` | Leads | Constrained detail, notes/status/actions; failed read retains header and Back |
| `/blog` | CEO | Blog list and genuine empty/read-error state |
| `/blog/new` | Blog | Centred constrained editor; real catalog fields, no activity samples |
| `/blog/edit/[id]` | Blog | Centred editor; loading/error/Back instead of a false missing-record redirect |
| `/courses` | CEO | Centred configuration; no substituted price after failed read |
| `/dba` | CEO | Original supported DBA overview, currencies retain source meaning |
| `/dba/products` | DBA | Product table, genuine catalog records only |
| `/dba/products/new` | Products | Centred max-xl product form |
| `/dba/products/edit/[id]` | Products | Centred max-xl original product form; explicit failed read |
| `/dba/sales` | DBA | Sales table and centred Log Sale dialog; saved amounts without currency are labelled unknown, matching the CEO overview |
| `/farm` | CEO | Original authoritative farm ledgers and links to individual records |
| `/farm/sales` | Farm | Original sales table/corrections; failed read does not appear as zero sales |
| `/farm/expenses` | Farm | Combined expense/feed list; current-page total remains labelled |
| `/farm/inventory` | Farm | Physical stock/mortality, bounded tables; explicit failed read |
| `/farm/supplies` | Farm | Bounded stock table, centred edit dialog and independently guarded history |
| `/farm/feed-stock` | Farm | Physical feed, unknown starting counts, optional review and centred record dialogs |
| `/farm/daily-feed` | Farm | Original dated feeding workflow and linked physical activity |
| `/farm/daily-reports` | Farm | One CEO heading, constrained report review and retained original manager draft contract |
| `/farm/operational-requests` | Farm | One CEO heading, constrained audited decision/review; no false empty history after errors |
| `/ultratidy` | CEO | Original CAD ledger summaries and source links |
| `/ultratidy/inflow` | UltraTidy | Bounded table, centred original entry dialog, explicit read errors |
| `/ultratidy/expenses` | UltraTidy | Bounded table, centred original entry dialog, explicit read errors |
| `/ultratidy/inventory` | UltraTidy | Original stock/update dialogs, separately guarded history and stock reads |
| `/properties` | CEO | Internal CEO property reports; actual supported revenue/cost/cash measures |
| `/content` | CEO | Internal CEO content reports; no invented costs/profit or audience growth |
| `/funds` | CEO | Internal custody, source bridge and current decision desk; audited owned retries |
| `/managers` | CEO | Existing account actions and centred account/period dialogs |
| `/managers/[id]` | Manage Accounts | Individual business/period reports, work separate from assets and custody |
| `/settings` | CEO | Centred account forms, wrapping long saved identity and existing Manage Accounts link |

Verification uses `scripts/test-ceo-control-center-ui.mjs`: 390/768/1440 widths, real empty HTTP responses, 503 source failures, nested Back links, single headings, document/workspace overflow, centred product forms, and short-phone 390x568 entry dialogs. Dialog checks cover account, lead, inflow, expense, inventory, sale and supply entry: visible labels, focus trap, scrolling, close and focus return. Enlarged text with long saved names/emails, mobile sidebar scrolling and Escape/focus return are covered. Writes are intercepted and forbidden in this read-only layout harness.

The dedicated manager-report/funds/handover/feed/account and original farm/CEO/navigation suites additionally exercise valid records, current pending/approved/declined requests, owned retries, stale decisions, unknown counts and response failures. Monetary values and physical effects are verified separately in database/API suites; a responsive screen alone is not accounting evidence.

Representative rendered screenshots are retained in the private temporary test artifacts. No live sample records or production browser submissions are used. Final release validation, live schema preservation and real PostgreSQL concurrency remain Task 8 requirements.
