# Manager Handover and Funds Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give new managers their own clean operating records, confirm farm inventory at handover, reconcile entrusted funds without inherited debt, and export the two authorised legacy accounts without changing historical records.

**Architecture:** Keep existing business ledgers and assets. Add manager operating periods, responsibility/asset links, immutable inventory acceptance, and balanced cash-custody events. Guard ownership and lifecycle in database routines, RLS and server reads; existing legacy accounts keep their historical mode while new periods use isolated activity and cash.

**Tech Stack:** Existing Next.js 14, TypeScript, Tailwind/shadcn, Supabase PostgreSQL/Auth and Playwright/Node test harnesses; reuse `lib/money.ts`. For genuine XLSX writing, add exactly `exceljs@4.4.0` with a committed lockfile after dependency/security review; registry version/repository/MIT licence verified on 28 October 2026.

**Spec:** `docs/superpowers/specs/2026-10-28-manager-handover-and-funds-design.md`

## Global Constraints

- No original record/account/credential/quantity reset, deletion, guessed recipient, retrospective stock movement or historical ledger rebuild. Existing account suspension is Bimbo's explicit action only.
- Direct funding requires the manager's receipt acknowledgement. Until then use **Sent, awaiting receipt** and retain that money in the CEO's custody reconciliation.
- An insufficient-funds expense is retained **pending funding confirmation** for Bimbo. Do not post a negative personal balance, silently discard it, fabricate funding or confirm receipt for the manager.
- New personal activity/cash starts at zero. Real, explicitly assigned assets and accepted farm inventory may be nonzero; business history remains with the CEO.
- Special export IDs: Farm Manager `ca7d7137-72dc-4cbc-848d-beb56d951344` and Emmanuel Adeolu `a1e4ad6e-a565-4330-ae4c-3a0bc92081d1`. Tony and every future account are excluded.
- Farm saved-record correction requests and Property/Content audited own-record edit workflows retain their existing contracts. Missing legacy attribution stays unknown.
- Reuse exact decimal arithmetic; keep currencies and owner/sales funding separate. An internal staff handoff is neither new owner funding, revenue nor an expense.
- Create migration files with `supabase migration new <name>`; record the generated exact paths in the execution ledger. Never edit/replay original migrations. No paid database branch/project is needed.
- Production migration/activation follows reviewed implementation, verified restore rehearsal and concrete release approval. No production test entries or automatic messages to staff.

## Review Focus

1. A new login on an old device must not read or submit the previous person's queued entries; test account changes during an in-flight request in Task 2.
2. A handover accepted while stock changes must recheck the affected quantities and never duplicate stock; test version/lock races in Task 3.
3. A lost response, partial receipt or concurrent receipt must not allocate the same cash twice; test direct, procurement and reversal races in Tasks 4–5.
4. Resolving a pending expense after the operational date closes must retain its original date and require audited admin handling; test in Task 5.
5. Historical admin-entered funding is not evidence of a manager recipient; test empty Emmanuel exports and unallocated funding in Tasks 6–7.

## File and Interface Map

New server modules: `lib/manager-periods.ts` (scope/access/scoped reads), `lib/manager-handover.ts` (snapshot and acceptance), `lib/operations-cash.ts` (custody writes/summary), `lib/manager-reports.ts` (complete individual reports), `lib/legacy-manager-export.ts` (allow-list and XLSX). Shared safe client types/validation live in `lib/manager-period-types.ts` and `lib/operations-cash-validation.ts`; never import server secrets into client components.

New UI: `components/manager/ManagerPeriodProvider.tsx`, `ManagerHandover.tsx`, `ManagerFunds.tsx`; `components/dashboard/ManagerReport.tsx`, `ManagerPeriodDialog.tsx`, `FundsCustodyPanel.tsx`. Extend existing shells/workspaces/forms instead of replacing them.

New API paths: `/api/operations/manager-context`, `/api/operations/handover`, `/api/operations/funds`, `/api/operations/funds/receipts`, `/api/operations/funds/pending-expenses/[id]`, `/api/managers/[id]/periods`, `/api/managers/[id]/report`, `/api/managers/[id]/export`. New pages: `/manager/onboarding`, `/dashboard/managers/[id]`, and `/dashboard/funds`; existing manager/app routes remain valid.

Core TypeScript contracts:

```ts
type Business = 'farm' | 'property' | 'content';
type ManagerScope = {
  business: Business; actorId: string; mode: 'admin_all'|'legacy'|'personal';
  managerId: string|null; periodId: string|null; startsOn: string|null;
  status: 'active'|'awaiting_handover'|'closed';
};
type WriteOutcome<T> =
  | {status:'posted'; data:T}
  | {status:'pending_funding'; id:string; currency:string; shortfall:string}
  | {status:'awaiting_receipt'; id:string; currency:string; amount:string};
```

`resolveManagerScope(actor: Profile, business: Business, selection?: {managerId?:string;periodId?:string}): Promise<ManagerScope>` derives permission from authentication. `readManagerRecords(scope, resource: string, filters: {from?:string;to?:string;page?:number;limit?:number}): Promise<{data:Record<string,unknown>[];total:number;has_more:boolean}>` uses a database allow-list and scoped query, not client filtering. Individual reports read every page in a consistent database snapshot and never sum list pagination. Current API envelopes remain unchanged for legacy callers; new workflows add explicit status fields and handle HTTP 202 deliberately.

## Task 1: Operating periods, ownership and database access

**Files:** CLI-generated `manager_periods_and_scope` migration; create `lib/manager-period-types.ts`, `lib/manager-periods.ts`, `scripts/test-manager-periods-database.mjs`; extend `scripts/test-bossbimbz-access.mjs`.

**Produces:** `manager_periods`, `manager_record_links`, `manager_asset_assignments`, `manager_period_days`, `operations_release_state`; guarded `manager_period_write`, `manager_context`, `manager_read_records` routines. Manager periods store account, business, nullable legacy start, lifecycle and audit actor/time. Links identify responsible period separately from original creator. New scoped day rows do not replace `farm_daily_records`.

- [ ] Write RED tests: A's private records are unreadable to B/anonymous even with forged IDs; admin can read both; a new profile with no completed provisioning cannot fall back to business-wide access. Legacy source-row fingerprints and existing closed-day metadata remain identical.
- [ ] Run `node scripts/test-manager-periods-database.mjs`; confirm ownership/provisioning routines are absent or isolation fails before implementation.
- [ ] Generate the migration; add indexed, FK-protected metadata tables and explicit grants/RLS. No cascade delete of history. `manager_read_records(p_actor,p_business,p_resource,p_period_id,p_filters)` validates its resource allow-list and returns scoped data/counts. Only trusted server calls may supply an actor; authenticated direct access derives `auth.uid()` and cannot impersonate one.
- [ ] Capture original managerial accounts as legacy periods at controlled activation, with NULL unknown start dates; do not invent historical operating periods. New/changed managerial assignments use guarded provisioning and deny access until their final business/period is configured. One active period per account/business; no automatic suspension of any other account.
- [ ] Keep the feature inactive for old-compatible deployment. Protect new personal rows from legacy-role blanket reads after activation. Validate both API service-role scope and direct authenticated allow/deny behavior; preserve legacy history and CEO read access.
- [ ] Run the new database/access scripts and existing account/access SQL tests; commit the passing metadata/access deliverable.

## Task 2: Scope account provisioning, APIs, selectors and offline identity

**Files:** modify `app/api/managers/route.ts`, `app/api/managers/[id]/route.ts`, `lib/auth.ts`, `lib/validations.ts`, `lib/content.ts`, `app/api/property/[kind]/route.ts`, `lib/farm-finance.ts`, `lib/ceo-overview.ts`; farm read handlers listed below; `lib/offline-storage.ts`, `hooks/useOfflineSync.ts`, Property/Content pending storage; new manager context/period API and provider. Tests: `scripts/test-manager-scope-api.mjs`, `scripts/test-manager-offline-identity.mjs`; extend manager-account/routing suites.

**Consumes:** Task 1 scope and record-read contracts. **Produces:** authenticated period context and correctly isolated existing API responses, with starts-on provisioning and retained queue provenance.

- [ ] Write RED API tests for new Farm/Property/Content accounts returning empty own activity, denied foreign selectors, admin entries attributed to their selected manager, and existing accounts not being reset. Include role reassignment and partial Auth/profile provisioning failure.
- [ ] Write RED offline tests: switch A→B before reconnect and while fetch is in flight; B sends none of A's entries; unowned `farm_pending_*` entries remain quarantined and recoverable; a later period on the same login cannot adopt an earlier pending payload.
- [ ] Add account start-date/period creation atomically after final role setup. The Auth step cannot be part of a PostgreSQL transaction: keep a new identity inaccessible until provisioning completes; compensate only a newly failed, unused identity, never an existing account. Bimbo's manual role change must also create/require a period before the new role can operate.
- [ ] Apply scoped reads to farm sales, expenses, expense-history, fund-transfers, balance, daily-feed, feed-purchases, inventory/activity, supplies/history, daily-record, daily-reports, operational-requests, corrections and activity handlers. Reach `lib/content.ts`, Property history/lookups and all aggregate loaders. Asset reads use explicit assignments/accepted farm assets; do not show historical financial rows through a selector join.
- [ ] Extend guarded database writes to validate responsible period and every linked stock group/property/unit/tenancy/content/lead ID. Preserve original actor and responsibility on corrections, including ended periods. New ordinary manager writes cannot predate their responsibility start. Existing farm and Property/Content edit rules remain intact.
- [ ] Namespace queues by account, business and period; bind request IDs to that context. Resolve context before sync. Abort/ignore stale responses after identity change; do not delete legacy or uncertain payloads. Migrate already account-owned Property/Content draft keys only when their original period can be proven; otherwise retain for review.
- [ ] Run both new scripts plus account62/routing, Property/Content API and existing farm/report/feed API suites; commit the passing isolation deliverable.

## Task 3: Farm inventory handover gate

**Files:** CLI-generated `manager_handover` migration; new `lib/manager-handover.ts`, handover API, `/manager/onboarding`, `ManagerHandover.tsx`; modify manager layout and its period provider. Tests: `scripts/test-manager-handover-database.mjs`, `scripts/test-manager-handover-ui.mjs`.

**Produces:** `manager_handover_sessions`, `manager_handover_items`; `handover_write(p_actor,p_operation,p_session_id,p_items,p_request_id)`. GET returns `{sessionId,snapshotVersion,steps,issues,status}`; final POST returns `{status:'active',periodId}` only after acceptance succeeds.

`getHandover(actor:Profile)` returns that GET state; `writeHandover(actor:Profile,{sessionId,operation:'save'|'finalize',items:{itemId:string;status:'confirmed'|'cannot_confirm';version:string}[],requestId:string})` preserves explicit item decisions and delegates to the guarded routine.

- [ ] RED tests: a pending manager cannot deep-link or call ordinary business writes; tick progress resumes; Cannot confirm creates a review issue; unknown feed is never treated as zero; zero groups do not create guessed stock; all confirmations plus final acknowledgement activate exactly once.
- [ ] Snapshot actual current products/Unclassified stock, livestock groups, feed stock and active supplies with IDs, units, quantities and version/as-of data. No invented equipment register. Allow the minimum snapshot reads while awaiting handover; keep historical transactions hidden.
- [ ] Use small grouped steps, visible progress and tick-only item confirmations. No forced quantity typing. Missing/unverifiable items stay pending for Bimbo; original inventory corrections use their existing audited workflows and then require manager reconfirmation.
- [ ] Atomically verify source versions under existing stock-write locks and store final manager/start/acceptance data. A changed item invalidates its acceptance only. Completion requires online verification; no new stock, feed, supply or cash movement is created.
- [ ] Test snapshots racing a sale/feed/stock update, concurrent acceptance and reload/retry. Verify source table counts/quantities before and after. Run UI at 390/768/1440 with keyboard labels and Back/unsaved progress; commit GREEN.

## Task 4: Balanced cash custody, pending receipts and automatic procurement handoffs

**Files:** CLI-generated `operations_cash_custody` migration; create `lib/operations-cash.ts`, `lib/operations-cash-validation.ts`; new funds/receipts APIs; extend fund-transfer handlers and account/source metadata. Tests: `scripts/test-operations-custody-database.mjs`, `scripts/test-manager-funds-api.mjs`.

**Produces:** `operations_cash_accounts`, `operations_cash_events`, `operations_cash_postings`, `manager_write_receipts`. Accounts identify business/currency, manager period or offline custodian, and owner-funding/sales-cash bucket; use explicit awaiting-receipt and outside counterpart accounts. Never seed guessed historical cash postings. Legacy unallocated balance remains a labelled calculation from preserved original records.

`cashWrite(actor, operation:'fund'|'receive'|'handoff'|'correct'|'void', payload, requestId): Promise<WriteOutcome<Record<string,unknown>>>` wraps guarded SQL `operations_cash_write`. `getCashSummary(scope,{from,to})` returns opening, receipts, paid spending, closing, awaiting receipt and source/custodian breakdowns in exact decimal values per currency.

- [ ] Write RED database/API assertions: owner funding1,000,000 → procurement1,000,000; acknowledged procurement handoff300,000 → procurement700,000/manager300,000; combined remains1,000,000. A direct Bimbo-to-manager transfer300,000 initially gives manager0/awaiting300,000, then manager300,000/awaiting0 after acknowledgement.
- [ ] Record external owner funding once in the existing applicable funding record, linked to one cash event. Direct manager funding is held awaiting receipt; offline procurement can be confirmed by Bimbo on their behalf. A manager acknowledgement records the named source and actual amount/date. Pending source funds cannot disappear or be spent before acknowledgement.
- [ ] Farm external funding retains its original `farm_fund_transfers` record, linked to the custody event. Property/Content have no pre-existing funding table, so their external funding source of truth is the new owner-funding cash event. Never insert their funding into the farm ledger. No historical custody opening events are seeded.
- [ ] Post balanced effects in one transaction. Lock source/destination accounts in sorted order; partial receipts and allocations across explicitly linked source funding cannot overdraw available amounts. Keep original funding-source/currency boundaries; no FX conversion or owner/sales cash mixing.
- [ ] Bind retry ID, actor, period and payload hash in `manager_write_receipts`; identical retries replay results, conflicting reuse fails. Corrections/voids append linked reversal effects and preserve the original event/reason; reject a reversal that would invalidate already spent funds until Bimbo resolves the downstream case explicitly.
- [ ] Test two simultaneous700,000 handoffs from1,000,000: one succeeds, the other conflicts with no partial effects. Test lost responses, partial direct acknowledgements, replayed acknowledgements, cross-business/currency sources, suspended users and forged recipient IDs. Run exact-money and existing fund API tests; commit GREEN.

## Task 5: Atomic spending/inflow and pending funding resolution

**Files:** CLI-generated `manager_cash_business_writes` migration; `lib/operations-cash.ts`, `lib/farm-v2.ts`, guarded farm/property/content write adapters, `/api/operations/funds/pending-expenses/[id]`; extend farm expense/feed-purchase and Property expense UI; new `ManagerFunds.tsx` and `FundsCustodyPanel.tsx`. Tests: extend custody database/API scripts and create `scripts/test-manager-funds-ui.mjs`.

**Produces:** `manager_pending_expenses`, atomic financial postings linked to original record/revision, and explicit HTTP202 `pending_funding` responses. Pending rows retain validated original payload/date/manager/payer request, observed available funds/shortfall and resolution audit. They are not inserted into posted expense/feed tables yet.

`resolvePendingExpense(actor:Profile,id:string,{action:'post'|'decline',payerAccountId?:string,reason:string,expectedRevision:number},requestId:string):Promise<WriteOutcome<Record<string,unknown>>>` requires admin, confirmed real payer funds and the original operational date; it does not acknowledge a manager's direct funding on their behalf.

- [ ] Write RED assertions: manager has300,000, actual feed purchase10×30,000 posts one300,000 cost and feed receipt, leaves manager0/procurement700,000. With manager0, the same entry is retained pending, produces zero business expense/feed-stock/cash movements and zero negative personal balance.
- [ ] Extend the existing `farm_v2_write`, `property_write`, `content_write` and applicable feed/report routines without losing their validation, closure locks, request IDs, stock triggers or corrections. Financial record plus cash effects succeed or roll back together. Derive amount from persisted/validated business data, never a second client success calculation. Keep transactional pending capture separate from any rolled-back business insertion.
- [ ] Credit genuine sales/rent/Content inflows to the identified receiving account and source bucket once; payment method must not silently credit manager cash when someone else received it. Attribute actual work to its manager while retaining the true payer/receiver and recording actor. Existing Content has no expense module: report supported recorded measures, do not invent Content costs/profit or add an unrelated cost module.
- [ ] Manager's oversized expense remains visible as pending; all HTTP202 consumers show **Saved for Bimbo's funding review; not yet posted** and retain its identity. They must not show success as a completed purchase or let retries create another pending entry.
- [ ] Bimbo resolves by identifying genuine funding/true payer, or declines with a reason. New direct funding still waits for manager acknowledgement. Once sufficient confirmed funds exist, atomically post the original dated expense and stock/cash effects once. Closed dates require Bimbo's existing audited correction authority; do not change the date or reopen the day. A procurement-paid supplier bill debits procurement directly rather than inventing a manager receipt.
- [ ] Add simple receiving-money and pending-entry panels to each applicable manager shell; CEO Funds shows With procurement, With managers, Awaiting receipt, Posted spending and Legacy unallocated. Preserve familiar entry forms and Back links, with visible pending/error states.
- [ ] Test pending→funds-sent→still-awaiting→receipt-acknowledged→posted, duplicate resolution and two tabs resolving the same request. Test closed-date resolution, exact signed corrections, mixed funding, changed payee/amount revision and forbidden manager approval. Run all related UI/API/database suites; commit GREEN.

## Task 6: Individual CEO reports and assignments

**Files:** create `lib/manager-reports.ts`, report API, `/dashboard/managers/[id]`, `ManagerReport.tsx`, period/asset assignment dialog and `/dashboard/funds`; modify Manage Accounts, Sidebar, CeoDashboard, OperationsOverview, farm overview, financial filters/loaders and navigation mappings. Tests: `scripts/test-ceo-manager-report.mjs`; extend actual CEO/navigation/account UI suites.

**Produces:** `getManagerReport(scope,{from,to})` with scoped complete-record activity, supported performance measures, original attribution gaps, per-currency cash bridge and pending amounts. API selection validates manager/business/period; managers cannot request admin-all scope.

- [ ] RED fixtures: A's10 sales/B's20 stay distinct and overall includes30 once; internal handoff changes who holds money but changes neither revenue nor total expenses; direct pending receipts are included in overall custody, not a personal received balance. Legacy transfers recorded by Bimbo remain unallocated.
- [ ] Reuse authoritative exact-money services and existing charts/data tables over complete, consistently scoped reads. Keep current physical stock counted once in business totals; accepted/shared assets are not summed as separate stock for each manager. Separate daily opening, receipts today, posted spending, pending spending and closing. Hide stale figures after errors.
- [ ] Farm business totals continue to come from existing active source ledgers, which already include new posted farm records. Custody is their breakdown, never an added second total: legacy/unallocated owner residual equals the existing closing owner balance minus explicitly tracked new owner custody (including awaiting receipt); apply the equivalent sales-cash bridge separately. Property/Content performance comes from existing rent/sales/expense sources; owner funding is cash funding, not revenue. Their new custody sum reconciles prospective recorded cash only, with legacy/unallocated activity labelled separately.
- [ ] Add plain Business/Manager/Period controls and View records from Manage Accounts. Keep all reports inside CEO dashboard. Clearly distinguish legacy business totals from personal responsibility and personal growth from inherited audience snapshots. Default new personal reports to their own start/current period.
- [ ] Let Bimbo explicitly start a new period or assign existing assets without copying historical transactions. Starting a new period is not silently applied to either existing export account. Require an explicit resolution of pending handovers/cash before closing a personal period; retain all earlier activity and access history.
- [ ] Test two managers, two periods on one account, admin-entered work on another's behalf, currencies, negatives in untouched legacy data, missing authority, unknown funding, 501+ rows, empty states and server error isolation. Verify responsive forms/filters and deterministic Back targets; commit GREEN.

## Task 7: Restricted genuine Excel exports

**Files:** `lib/legacy-manager-export.ts`, `/api/managers/[id]/export`; add export buttons on eligible manager report/own app; modify `package.json`/lockfile only for pinned ExcelJS. Tests: `scripts/test-legacy-manager-export.mjs`.

**Interfaces:** `canExportLegacyManager(actor:Profile,targetId:string):boolean`; `buildLegacyManagerWorkbook(report:LegacyManagerSnapshot):Promise<Uint8Array>`. `LegacyManagerSnapshot` contains target identity, generated/as-of time, complete attributable source rows/corrections/receipts and explicit attribution gaps, all from one read-only transaction snapshot.

Define `LegacyManagerSnapshot = {target:{id:string;name:string|null};asOf:string;sheets:{name:string;rows:Record<string,unknown>[]}[];summary:Record<string,string|number|null>;attributionNotes:string[]}` in the server export module; the report loader, workbook writer and round-trip test use this same contract.

- [ ] RED tests: only admin→either allow-listed target and active eligible self→self succeed; Tony, new accounts, anonymous, suspended self and cross-manager requests are denied. CEO may export a suspended target without reactivating it.
- [ ] Use a server-only constant allow-list of the two verified IDs; no user-editable profile flag/email match or query parameter can enable export. Read all pages/source joins consistently, including linked admin corrections and void history for that manager's records; exclude other managers and unallocated transfers from personal totals.
- [ ] Generate a readable summary plus genuinely distinct source sheets, with original dates/units/actors/status. Summaries exclude voids, detail retains them. Empty Emmanuel sheets stay empty. Include a clear note that old Bimbo-entered transfers lacked recipients; never claim a complete verified personal cash opening from them.
- [ ] Write untrusted text as literal strings, never formulas/hyperlink execution. Preserve unsafe/high-precision original numeric text while providing readable safe currency columns. Set XLSX MIME/disposition, safe filenames, `private,no-store`, bounded export concurrency and explicit failure responses; no email or writes.
- [ ] Round-trip read generated XLSX with synthetic501+ rows, high precision, multiple currencies, formula-looking notes, linked corrections and empty Emmanuel fixtures. Match source counts and values and verify the download button is absent for new accounts; commit GREEN.

## Task 8: Integrated verification, preservation rehearsal and coordinated release

**Files:** applicable tests above, `tasks/todo.md`, `tasks/lessons.md`, release report under `docs/superpowers/plans/`; forward-only migrations from earlier tasks. No unrelated website/CRM edits.

- [ ] Run each new script and all applicable existing account, middleware, farm V2/livestock/feed/report, Property/Content, CEO and PWA checks; run `npm run lint` and `npm run build`. Use the newly built server at an isolated port for all81 unchanged public-site tests. Test synthetic writes only.
- [ ] Take a fresh private production backup; restore it and rehearse every migration/activation in order. Verify all original business rows, auth identities, actor gaps, quantities and original finance calculations stay identical in legacy mode; new metadata may add rows, originals may not be rewritten. Record actual constraints/triggers/RLS/grants and full-row fingerprints before and after.
- [ ] Obtain a fresh independent whole-change review; reproduce material findings with failing tests and fix before release. Publish no code merely because a build passed. Record exact source commit, no-secret validation evidence, compatible rollback target and limitations.
- [ ] Present concrete migration/release instructions for approval. Expand schema with feature inactive; stage/verify the compatible app; promote with new features still inactive; activate guarded provisioning/scopes/cash under coordinated locks. Briefly pause new account provisioning during the cutover if needed. New accounts cannot exist in a half-enabled state with business-wide fallback access. Keep established operations available; any required farm-write pause must be brief and explicit.
- [ ] After approval, verify the exact production commit/deployment and branded routes, then perform signed-in read-only checks. Use test accounts/fixtures outside production for writes; do not create sample transactions in Bimbo's business ledgers. Compare originals/account fields again, allowing only genuine concurrent operations and normal auth session metadata to differ.
- [ ] Rollback must retain additive schema/posted V3 history. After V3 activity exists, do not promote old code that grants new managers business-wide access or omits cash effects; use the compatible feature-disabled build only if safety remains enforced, otherwise fix forward with a guarded write pause. Never restore an old database over current business activity.

## Self-review and execution handoff

Every spec section maps to Tasks1–8. Five review-focus conditions have explicit owning tests. New API/write outcomes, scope names, receipt policies and export IDs are consistent across tasks. Original money helpers, record schemas and legacy workflows remain authoritative; uncertain funding and attribution are represented explicitly rather than guessed.

Recommended execution: **Native**, continuing the existing workflow in this isolated worktree, with task-by-task RED/GREEN checks and one fresh final reviewer. These tasks share ownership/custody interfaces and live-data preservation rules; independent parallel edits to those interfaces would increase integration risk. Review this plan before implementation, then execute the whole approved scope rather than deploying individual half-enabled pieces.
