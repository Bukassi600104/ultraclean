# Farm workflow recovery

This release repairs feed-entry recovery, payment balances, assignment retries and request cancellation, and simplifies the CEO Farm summary. It preserves existing financial, inventory and account records.

## Changes

- Feed starting counts remain actual manager entries. Rejected submissions can be corrected without losing their saved drafts; uncertain submissions retain their original retry identifiers.
- Funding-review queues check the current decision instead of repeating an old pending response.
- Sales distinguish invoicing, collections and remaining customer debt. New partial payments use database numeric arithmetic and explicit receipt dates; legacy credit history is not inferred.
- Spending reports can post an expense or wait for verified funding, with an atomic link to the original report.
- Cancellation preserves requests, purchase approval facts, delivery history and audit entries. Payments, stock movements or pending funding block cancellation until reconciled.
- Assignment retries display their exact saved selections. Removing an assignment preserves historical work and quantities.
- Farm transfers use the existing named-recipient funds workflow. Older transfers without verified recipient linkage remain explicitly unattributed.
- CEO navigation is focused by business. The overview has five Farm financial metrics and a short current-action list; full details remain inside the Farm workspace.
- Health, daily reports, performance, source labels, dates and scoped Back links are clearer. Update checks cover retained drafts and private photos.

## Preservation and verification

The private 9 November backup contains 144 database tables and 69 storage objects. Its PostgreSQL restore matched every original table fingerprint, including account password hashes. Both forward-only migrations were rehearsed against that restore; all 144 original table fingerprints remained identical afterward. Local restoration omitted only provider-managed monitoring/GraphQL/publication objects, not application data or its 110 policies.

Tests passed: lint, TypeScript, production build, 240 dashboard browser checks across 42 pages, 90 Daily Report/request checks, 54 manager-report checks, 48 feed checks, 28 assignment database checks, existing manager-period/credit/purchase suites, new accounting and funding-queue regressions, private-media and app-update checks. UI coverage includes 375, 390, 768 and 1440 pixels.

A cloned PostgreSQL database also passed concurrent invoice retry, partial-payment and actual test-request cancellation assertions. Cancellation rehearsal rolled back; no production test transactions were inserted.

Signed-in live browser and physical-phone checks remain unverified because the local browser connection is unavailable. Bimbo and the managers retain phone acceptance testing.

## Coordinated release

1. Confirm the production source still matches the reviewed baseline and retain the private backup.
2. Briefly pause guarded operational writes using the existing release control. Keep sessions and device queues intact.
3. Capture fresh business-record and account-credential fingerprints.
4. Apply `20261109215929_manager_assignment_recovery.sql`, then `20261109215958_farm_accounting_workflow_repairs.sql`. Supabase-issued migration journal versions may differ from local filenames; record their names and applied versions in private release evidence.
5. Compare existing columns and credentials before resuming. Do not backfill figures or attribution.
6. Push the tested source to GitHub and verify the exact Vercel production commit and live app-version responses.
7. Resume guarded writes only after the compatible deployment is ready.
8. Recheck the three specifically confirmed test requests and linked purchase. Cancel through guarded audited operations only if no real payment, stock or unresolved-funding activity appeared. Preserve the actual electrician spending report and new genuine requests.

## Recovery

Keep the additive schema and audit history after use. Do not restore a stale production backup over newer user activity. If release verification fails, keep the affected write pause, diagnose the deployment, and use a compatible forward fix or verified previous application release. Never delete queues or clear authentication to force an update.

## Short walkthrough

Open Funds and choose the actual recipient by name and work start date. A manager must confirm receipt before the money becomes available to them. Farm-wide historical totals are separate from that person's balance.

For feed, record the actual starting bags once for each feed type/source, then record receipts and bags opened. A retained rejected draft can be reviewed without entering the same activity twice.

Use Today for named-group observations and the general Daily Report for the wider farm update. Health has its own schedule and completion actions. Payment history shows the customer, receipt date, invoice allocation, paid amount and balance.

Additional paid login protection remains on hold. Missing historical transactions and unidentified legacy credit corrections remain untouched.
