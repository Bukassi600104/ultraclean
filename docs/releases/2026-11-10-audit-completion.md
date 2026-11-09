# Farm audit completion

This update fixes the remaining audited feed, transfer, receipt and report-navigation defects and adapts the approved Pulse layouts within the existing CEO and manager shells. It does not reset accounts, passwords, figures, inventory or historical records.

## Changes

- Definitively rejected feed-count decisions are retained for review and unlocked. Uncertain decisions retry the original identifier and body.
- Unreadable or malformed saved feed submissions cannot be overwritten. Dependent opening references clear when the feed/date changes; saved retries stay immutable.
- Saved transfers restore the original recipient, start date, amount and date. Recording funds remains available in an individual manager's view.
- Receipt history shows customer, payment date, invoice, amount allocated and explicitly current invoice balance. Missing details remain unavailable, not zero.
- Daily Report uses compact read-only summaries; all populated legacy fields, metadata, evidence and review actions remain accessible. Draft editing is unchanged.
- Health uses a desktop schedule and mobile cards. Today avoids duplicate display lists. Stock allocation shows current ungrouped availability and still validates under the existing write guard.
- Performance offers a group summary table/mobile cards, selected-group detail and sampled-weight trends. Links retain the selected manager and dates. Clipboard failure leaves the report visible.
- Known reviewer and decision names are resolved from authorized records rather than showing internal identifiers or a false attribution gap.

## Database and preservation

The only migration, `20261109232802_farm_performance_reporting_window.sql`, replaces a read-only reporting function. It adds expected observation dates derived from actual dated stocking, the manager's responsibility/assignment, archival dates and existing observations. It does not change recorded quantities, sales, expenses, receipts, profiles or access controls.

A fresh private backup restored 145 tables and 110 policies. Every original table fingerprint, including password hashes, matched after migration rehearsal. The production execution includes an existing-definition guard and before/after fingerprint assertions in one repeatable-read transaction. No farm-write pause is needed for this backward-compatible read-only change.

Missing starting feed counts, sites, batches and health schedules must still come from actual farm setup. No demonstration or assumed records are supplied. Historical credit corrections are not inferred. Additional paid login protection remains on hold.

## Verification

- 101 actual feed browser checks, including corrupt saved payloads, invalid dates, stale decisions and lost-response retries.
- 67 CEO manager/funds browser checks; 45 Sales/receipt checks; credit history at 375, 390, 768 and 1440 pixels.
- 94 Daily Report/request browser checks, plus Today, Health, allocation/support and API authorization/name-resolution checks.
- 241 CEO checks across 42 pages, including responsive layouts and failed reads.
- Reporting tests cover backdated stocking, unstocked and sold-out days, responsibility dates, archive boundaries, permissions and unchanged stock.
- Accounting regression checks cover partial payments, duplicate retries, funding review, cancellation preservation and manager isolation.
- 28 assignment recovery checks; offline identity, funding queue and update-storage compatibility checks.
- TypeScript, lint and production build. Responsive screenshots were inspected against the saved reference.

Browser suites exercise the actual components with isolated transport/auth fixtures. They do not replace signed-in production or physical-phone acceptance.

## Release and recovery

Publish the reviewed commit to GitHub and verify the exact Vercel production commit serving the live domains. Record the final SHA, deployment ID and live version checks in the private `audit-completion-2026-11-10/verified-live-release.json` evidence and the delivery message.

If necessary, redeploy the previous application commit, which tolerates the extra reporting metadata. The previous read function can also be restored after review. Never restore an old production database over newer activity or clear device queues to force an update.

## Short acceptance walkthrough

1. Open Funds, choose the supervisor by name/start date, and confirm that the same details remain visible after an interrupted retry. Avoid creating a test transfer in production.
2. Check an existing payment: customer, date, invoice, amount paid and current remaining balance appear together.
3. Open a submitted Daily Report and its details; compare the saved values with the original. Check Health's desktop schedule and mobile cards.
4. Record genuine starting feed counts before feed use. A stale count decision offers recovery; unreadable saved entries remain protected.
5. Select a manager and reporting dates, open source records, then return. Confirm that the manager and date range remain selected.
