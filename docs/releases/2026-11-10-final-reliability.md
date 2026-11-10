# Final reliability completion ledger

Baseline: GitHub/Vercel `59084dfdbee90c061efd9683c78f0cef84fec845`. This is a corrective application release; there is no database migration, historical recalculation, account reset, stock backfill or paid security activation.

## Implementation and acceptance evidence

| Approved requirement | Implementation and verification |
|---|---|
| Daily Feed retry after acknowledgement-storage failure | Persist the remaining queue before releasing the original identifier; retain exact payloads through retry/reload and partial local/foreign completion. `test-farm-feed-recovery`, `test-bossbimbz-feed-ui`. |
| Invalid saved feed/report/request data | Validate shape before rendering or writing; retain original bytes and block only the affected form. Supported older drafts and retries remain usable. `test-farm-feed-recovery`, `test-bossbimbz-feed-ui`, `test-bossbimbz-farm-ui`. |
| Truthful delivery confirmation | Scoped durable acknowledgements precede cleanup. Queue absence is unknown, never proof of sending. Protected GET recovery uses existing receipts and target-record visibility. `test-submission-confirmations`, `test-manager-offline-identity`, `test-funding-queue-recovery`. |
| Saved offline workspace | Reuse validated report drafts and explicit confirmations, retain malformed queue/photo data, and never claim all entries sent from an empty parsed queue. `test-farm-offline-workspace`, `test-farm-offline-workspace-ui`. |
| Feed starting-count context | Editable type/source/date/activity changes clear dependent inclusion answers; retained pending payloads stay immutable. A malformed success envelope does not clear a saved entry. `test-bossbimbz-feed-ui`. |
| Performance Back navigation | Allowlisted return destination preserves manager/date/site/group and scoped scroll/detail state in both shells. `test-dashboard-navigation`, `test-dashboard-navigation-ui`, `test-operational-navigation-ui`, `test-farm-health-ui`. |
| Plain-language Health and page headings | Shared UI/API Health validation explains missing completion photos and other field failures. Farm control has one page heading. Relevant navigation/Health/CEO browser suites. |
| Existing saved photos and Health completion | Local photo references remain compatible with saved report/request drafts. Health validates local references before upload while its API still requires server evidence identifiers; the actual picker, offline queue, upload and completion journey is covered by `test-farm-health-ui`. |
| Safe updates | Existing queue format remains version 1; acknowledgements are an additive local format. Invalid confirmations or incompatible saved submissions block refresh without deleting anything. `test-app-update-safety`, `test-app-update-ui`. |
| Transfers, manager isolation and exports | Existing named recipient, responsibility period, receipt confirmation, custody balances and two-account legacy export eligibility are retained. Funds, handover, account, reporting and legacy-export suites in the explicit release allowlist. |
| Sales, debt, expenses and reconciliation | Full-record aggregation, partial collections, pending funding and historical attribution remain unchanged. Credit, accounting-remediation, exact-money, finance and purchases suites. |
| Requests, photos, approval and cancellation | Existing atomic decisions and evidence remain authoritative; real work stays active and confirmed test cancellations remain historical. Request, daily-report, evidence and purchasing suites. |
| Inventory, Health and performance | No guessed starting quantities or automatic assignments. Actual dated activity remains authoritative. Feed, stock, assignments, stores, Health and performance suites. |
| Other applications and navigation | Existing Property, Content, public/DBA routes, permissions and installation identities remain intact. Explicit release allowlist plus built/live GET checks. |

The release runner contains only explicitly isolated suites. It excludes older ad-hoc authentication scripts that could mutate live accounts. Browser suites exercise real components against isolated boundary fixtures, not a signed-in production account.

All 116 allowlisted suites passed across the initial run and bounded continuations after each resolved finding. Unchanged passing suites were not repeated. Final coverage includes 190 feed UI checks, 140 report/request UI checks, 241 CEO checks across 42 pages, 151 operational Back-link checks, 77 confirmation/recovery checks, the real-photo Health journey, accounting and two-account export checks. Lint and TypeScript passed separately. Existing audit-table and customer-selection test fixtures were aligned with the authoritative current workflows without weakening their preservation or financial assertions.

The production build passed, including its own lint/type validation and generation of 157 static pages. Final GET-only built/live checks and the promoted commit/deployment identity are recorded in the private `final-reliability-2026-11-10/verified-live-release.json` receipt after this source commit is published.

## Review and preservation

Independent review additionally caught malformed feed success responses, legitimate cleared draft dates, text-encoding regressions and Health's rejection of genuine local photo references. Browser testing caught the same reference-format mismatch in saved report/request validation. These were corrected within the same scope. The saved offline shell was included after checking every queue-status caller.

The baseline private read-only snapshot contains 87 expenses, 29 feed purchases, 12 sales, 5 inventory rows, 5 requests and 8 account profiles/credential identities. Fingerprints, test logs, exact source/deployment identity and post-release comparisons belong in private release evidence. No raw credentials or business data are committed here.

This ledger supersedes stale pending/local-only statements in earlier `tasks/todo.md` checkpoints. Those sections retain their historical context; they are not the current release status.

## Release gate and recovery

Complete the isolated suite, lint, TypeScript, production build, independent review and read-only preservation checks before pushing. Verify the promoted Vercel commit through each live app-version response and inspect recent runtime errors. Record the release receipt privately, without creating a second automatic deployment solely to add its ID to this document.

If recovery is necessary, use a reviewed compatible application build that preserves the new acknowledgement handling. Never clear browser storage or restore an old production database over newer activity. The read-only confirmation endpoint can remain deployed; it adds no schema or records.

## Bimbo's short acceptance walkthrough

1. Use the app's Update option when offered; retain saved work if it reports that recovery is needed.
2. In Funds, confirm the intended recipient's name and responsibility start date before recording a real transfer.
3. Check an existing payment's customer, date, invoice, paid amount and balance.
4. From Batch Performance, open a source record and use Back to confirm the same filters and group remain selected.
5. For real feed/report entries, distinguish Waiting to send, Needs attention and Sent. Use Check saved submission status when confirmation is unavailable; do not enter a second copy.
6. Add genuine opening counts, groups and health schedules through existing setup workflows. Do not use invented values to fill empty screens.

## Explicit boundaries

Genuine farm setup and physical-phone acceptance remain with Bimbo and the managers. Signed-in live checks depend on an available authorized browser session. Unperformed checks must be disclosed, not marked passed. No unrelated redesign, automated WhatsApp delivery, reconstructed historical debt or paid login-protection activation is part of this release.
