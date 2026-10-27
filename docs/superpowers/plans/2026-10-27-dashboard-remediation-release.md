# Dashboard Remediation Release Evidence

**Date:** 27 October 2026, Africa/Lagos. The user authorized implementation, testing, GitHub push and the production Vercel update, and explicitly instructed that missing financial records remain untouched.

## Delivered

* One consistent parent Back action across 27 dashboard page types; preserved form Cancel actions and Property/Content CEO return links. Sidebar highlights the single most specific destination.
* Financial histories filter dates before pagination, use stable ordering and show unavailable states on failed reads. General/feed expenses share one ordered paginated history. Manager daily sales summaries use complete aggregates instead of the first 100 records.
* Consistent monetary display, period labels and a single negative sign. Existing funding and historical pricing rules are unchanged.
* Five stacked CEO business sections: Primefield, UltraTidy, DBA, Content and Property. Read-only income/expense trends, breakdowns, accessible data tables and explicit snapshot/period labels are available where the ledgers support them.
* Farm opening-to-closing owner and sales-cash reconciliation, recorded entry dates and neutral missing-expense notices. Dedicated business views support matching periods without replacing their operational forms/history.
* Unsupported costs/profit, rent arrears and missing audience baselines remain unavailable. DBA sales have no stored currency; no currency is inferred or combined with other businesses.

## Preservation

Baseline source/deployment: `0e95383d98636a7e5323155d319cf87996d387d1`. Implementation and review fixes end at `23d3cfb929ae2ca9e8a08717c8ae395b092f61bb`.

Fresh private backup: 766167 bytes; SHA256 `04493d14883104141c0cc1028231f6d6df7c333f48e528b3dd8f839557e9b3d5`. Stored outside Git under the user's local Codex backups directory. A native isolated PostgreSQL 17 restore matched full row counts and fingerprints across all **84 public/auth/storage tables**, using UTC consistently for timestamp comparisons. Managed-object restore diagnostics remain in the private restore log.

Before/after production fingerprints also matched **all 84 tables**, including **49 application tables and all seven auth users**. Profiles digest remains `92a8a3b7da12a415924af494280a8714`. No account, password, profile, financial row, stock quantity or history was changed by the release.

No migration was added or applied. Latest migration remains `20261016225631`; zero release-write-pause triggers were confirmed. Authentication, middleware, package manifests and financial write handlers were not changed. The local restore server was stopped cleanly.

## Validation

| Verification | Result |
|---|---|
| TypeScript, ESLint and final production build | PASS; 118 generated static pages |
| Navigation parent rules and active sidebar | PASS; all 27 dashboard page types |
| Actual styled header/browser checks | PASS; 81 cases at 390/768/1440 widths |
| Actual CEO React/Tailwind checks | PASS; 38 checks; screenshots inspected |
| Actual manager and dedicated business browser checks | PASS; 27 checks |
| New reporting API | PASS; 23 checks |
| New analytics and actual DBA loader | PASS; funding bridges, currencies, deficits, missing baselines, initial/refresh failure isolation |
| Existing farm API / calculations | PASS; 38 / 11 checks |
| Existing CEO calculation / API | PASS / 25 checks |
| Manager account API / middleware routing | PASS; 62 / 88 checks |
| Farm operations / feed / daily-feed API | PASS; 44 / 25 / 18 checks |
| Isolated V2 / livestock SQL | PASS; 67 / 43 checks |
| Livestock API / catalogue / browser | PASS; 18 / 16 / 22 checks |
| Existing report / feed browser | PASS; 74 / 26 checks |
| Public website Playwright suite | PASS; all 81 unchanged tests |
| Built application GET smoke | PASS; 25 checks |
| Live production GET smoke | PASS; 18 checks across login pages, public sites, Services, manifests and protected APIs |

The first public-site run had nine Services load-event timeouts with rendered content present. An isolated diagnostic confirmed successful loading, and the unchanged complete suite subsequently passed all 81 tests. No public-site code or test assertions were changed to force a pass.

Actual new server services were exercised against production **read-only** for the month and selected day: manager/CEO revenue, expenses, owner balance and sales cash agree for matching scopes. The funding bridge closes to the same balances at displayed currency precision. No production test records were created.

## Independent Review and Decisions

A fresh independent whole-branch review found no critical issues. Its important findings were reproduced with failing tests and fixed: analytics failures must not block DBA product/history reads or Log Sale; refresh failures must clear/flag stale DBA finances; Farm charts must show unavailable rather than false empty/stale figures. The tied-row expense-order finding was treated as important because global ordering is an explicit requirement; the UI now preserves the server's ordered response. All corresponding tests passed after repairs. No product findings were deferred.

Decisions made during execution:

1. The native worktree tool could not resolve the parent folder as a repository, so implementation used an isolated manual Git worktree. The approved, identical code was then fast-forwarded into the original checkout. This changed workspace handling only.
2. One shared date parser serves the read handlers; existing API envelopes and write contracts remain intact. Invalid/conflicting read dates fail explicitly instead of silently producing misleading results.
3. Currency is not inferred for DBA, and unsupported profit/arrears are not invented. These measures require real business inputs and, if needed, a separately approved data-model expansion.
4. A CLI staging attempt from the linked worktree was blocked by Vercel team configuration. The same reviewed commit staged successfully from the original main checkout. No Git identity, team membership or security protection was changed.
5. Missing financial records remain untouched by explicit user instruction. Software validation is not represented as a bank/receipt reconciliation.

## Production Activation and Rollback

Staged production deployment `dpl_2myUQ7w8BQcT7aUKjnjbgAKTz6cL` reached READY on implementation commit `23d3cfb929ae2ca9e8a08717c8ae395b092f61bb`. Its login returned 200 and new admin history endpoint denied anonymous access with 403. The exact build was promoted successfully; the CEO branded domain resolved to that deployment with no alias error. Live smoke and preservation comparisons passed after promotion.

GitHub main synchronization and its automatic Vercel build are the final release bookkeeping step; their exact final deployment metadata is retained in the private release evidence. The bookkeeping commit changes documentation only.

Rollback target is the compatible previous production deployment `dpl_CwtjfHnCW67mzz5aV9nW4i8qCp8t` on `0e95383`. Roll back application code only if needed; no database restore or ledger rewrite is required or appropriate for this code-only release.

## Remaining Inputs and Verification Limit

Missing September/October expense/feed records were not entered, and no Property/Content/DBA activity was fabricated. Full profit, rent arrears and actual bank/cash reconciliation still require authoritative records/definitions.

Authenticated live screen-by-screen verification was offered, but the available browser remained at CEO sign-in. Live GET/protection checks, actual server-to-production read parity and isolated role/workflow/browser tests passed; they are not described as an authenticated human walkthrough.
