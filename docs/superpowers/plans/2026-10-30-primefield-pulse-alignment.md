# Primefield Farm Remote Oversight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implementation approved by the user. The updated plan pasted in the conversation is authoritative. Production migration, push to an auto-deploying branch and deployment remain subject to explicit release approval after verification.

**Goal:** Extend the existing Primefield manager app and CEO control centre to cover all eight feature sections in Bimbo's four-page Pulse Farm reference and adapt the requested demo's desktop/mobile style and layout, preserving existing records and managerial responsibility boundaries.

**Architecture:** Reuse the deployed application, guarded ledgers, manager periods and CEO reporting. Add named batches, evidence, purchase authorization, eggs, customer receipts and health records through linked, forward-only changes. Both interfaces read the same authoritative records; no second owner app or duplicate accounting system.

**Tech Stack:** Existing Next.js 14, TypeScript, Tailwind/shadcn, Supabase PostgreSQL/Auth/Storage, exact decimal money helpers, ExcelJS and isolated test harnesses. Use browser IndexedDB for offline photographs; do not put photo blobs in the existing JSON/localStorage queue.

**Spec:** User attachment `C:/Users/USER/.codex/codex-remote-attachments/01a10013-0eed-7c22-badd-9263ce51cd80/4E6C4570-4215-4713-B8CB-285FF3F6457A/1-Pulse-Farm-Features.pdf`, read and visually inspected in full. This plan also preserves the approved manager-handover/funds rules and Bimbo's livestock corrections. Source baseline and remote main both resolve to `c6d4ed9d2cc6543b044552e38a51e41f523afa31` on 30 October 2026.

**Demo supplement:** [Computer Use walkthrough and screenshot evidence](../reports/2026-10-30-pulse-demo-audit.md) of https://farmdemo.truepulseng.com/ on 30 October 2026: all eight owner and five manager sections on desktop and at phone width. Use the observed sage/forest palette, compact white panels, KPI hierarchy, batch cards, charts and centred forms as visual references within Primefield. The public role toggle, browser-local demo records and full-version claims are not production authentication, accounting or synchronization specifications. Credit terms are expressed in days; part-payments are described as oldest-invoice-first. No demo numbers, identities or thresholds become live defaults.

## Global constraints

- The Farm app is manager-only, with no Owner tab or role switch. All owner capabilities reside inside the existing CEO dashboard. Bimbo can create multiple managers; preserve personal period isolation, existing account administration and farm-wide/manager-filtered reporting. Inventory assignment confirms actual assets without duplicating stock.

- Keep Primefield branding and the existing multi-business CEO dashboard; adapt the requested demo's visual system in the Farm app/CEO Farm surfaces. Pulse's names, contacts, sample figures and demo accounts are reference material, not production data. Preserve the other businesses' working layouts and access.
- No deletion, reset, guessed backfill, historical repricing, automatic reclassification, password changes or forced re-onboarding of existing managers. Legacy attribution, batch membership, payments, costs and photographs stay unknown where unknown.
- Retain all valid livestock categories, including turkey Tom and Hen with poult/grower/juvenile/finisher under both; keep the agreed goat category order, not invented counts.
- Preserve individual manager periods, receipt confirmation, pending funding-gap review, closed-day protection, audited corrections and identity-scoped retries. New staff inherit no previous manager's cash, debt or performance.
- Retain Farm Manager/Emmanuel's special historical Excel eligibility. New CEO operational exports do not expand managers' historical access.
- No mock data, placeholder financial figures, additional public signup or replacement credentials. No changes to other businesses except necessary shared reporting contracts with regression coverage.
- Financial calculations use persisted NUMERIC/decimal text and complete records, independent of pagination. Approval is permission; payment is cash movement; delivery is stock movement. They are distinct.
- Purchase approval covers new spending. Opening/feeding stock already held remains quick and does not wait for an optional review. Bimbo observes and decides; she does not duplicate manager entries.
- The PDF explicitly expands older repository exclusions for invoicing, alerts and WhatsApp reporting. It does not authorize bank/payment processing, a native mobile rewrite or external accounting integrations.

## Approach and current gaps

Extend the current system. A separate Farm database/app would duplicate identities, inventory and cash and would require a risky migration. Replacing the working application is unnecessary.

| Reference area | Keep/reuse | Add or complete |
| --- | --- | --- |
| Daily records | Structured reports, submission/review, dedicated mortality, manager periods | Numeric daily records per named batch, private photos, entry-specific question/reply history, missing-record status |
| Spending | Operational requests, CEO decisions, exact cash custody | Amounts and purchase lines, quotes, versioned approval limits, enforceable payment/delivery links |
| Stores | Feed activity, opening/receipt/opening-bag history, supplies and corrections | Egg store, all-store physical counts, valued shortfalls, feed-coverage estimates, consistent partial delivery confirmation |
| Batches | Livestock classifications and movements | Distinct named flocks, ponds, pens and herds, lifecycle and measured performance |
| Sales | Weight/head/unit pricing, guarded sale/stock writes | Invoice numbers, customer IDs, credit, part-payments, payment allocation, debt ageing and limits |
| Health | Sick-animal notes and veterinary requests | Schedules, due/overdue tasks, treatment/product evidence and completion history |
| CEO/reporting | Internal Farm pages, overview, personal reports, custody and XLSX foundation | Urgency queue, batch analytics, current debt/cash distinction, PDF/report exports, daily delivery, owner timezone/currency |
| Staff experience | PWA install, account-scoped drafts/queues and handover | Offline photo persistence, compact batch-led forms and complete new-module permissions |

Important source findings: `farm_livestock_groups` is unique by classification, so two identical ponds cannot be represented as distinct batches today. Existing daily narratives do not change stock. Existing sales treat the full sale amount as money received. The public blog image uploader is unsuitable for private manager evidence. These are substantive changes, not labels to rename.

## Shared contracts and accounting boundaries

- Add a stable batch identity linked to a real site/unit and existing manager assignments. Keep classification separate from batch identity. Allocate verified current assets out of unallocated stock without another farm-wide stock addition. Future inter-batch moves balance to zero at farm level.
- New records carry batch/site when applicable, responsible period, authenticated actor, activity date, server timestamp, retry identity and evidence links. Register new resources in the existing read/write/assignment permission system; API checks alone are insufficient.
- Drafts remain editable. A sent record retains its original payload and evidence. Corrections append a linked replacement/reversal and reason; they do not overwrite the original. Questions and replies append independently of those immutable figures, on any permitted Farm entry, including an existing historical entry.
- Both views refresh the same authoritative snapshot after confirmed writes, reconnection and automatic refresh. Display the last received/synchronized time; an offline manager draft is not a submitted record that the CEO has already received.
- Approved purchases do not create expenses or stock. Record actual payment against the correct cash holder and actual delivery against each purchase line, each exactly once. Price/quantity changes outside authorization require reapproval.
- New invoice revenue is separate from money collected. New unpaid/part-paid sales affect stock once, receipts affect cash when actually received, and later receipts never deduct stock again. Existing sales retain their established legacy cash meaning and acquire no invented invoices or debts.
- Customer debt = active invoice value less posted allocated receipts and authorized credit adjustments. Actual refunds/payments have their own dated cash effects. A void preserves the invoice, payments and stock trail through compensating entries.
- Owner funding is not revenue; procurement handoffs are not expenses. Existing owner-funds and sales-cash funding sources remain separate. Receipt location and true recipient determine who holds the money.
- Batch allocations and unallocated costs reconcile to their source pool. Feed purchase and consumption allocation must never become two farm expenses. Consumption-based batch result and cash spending are labelled separately, with store/unassigned cost bridges. Incomplete legacy costs cannot be presented as proven profit.

## Review focus

1. Offline mortality photo upload fails or the user changes account: retain the original draft/media, do not post unproved mortality or upload under the next account. Covered in Tasks 2/3.
2. An approved 40-bag order arrives as 30 bags in two retried deliveries: stock must reflect actual unique receipts only. Covered in Tasks 4/5.
3. A credit sale has several payments or a correction: revenue, debt, custody and stock must each change exactly once on their proper dates. Covered in Task 6.
4. Legacy stock/costs lack batch evidence or compatible units: show unallocated/unavailable instead of a fabricated opening, zero or efficiency figure. Covered in Tasks 1/5/7.
5. Day closing races with queued writes or daily notifications cross a timezone/DST boundary: enforce operational dates, preserve queued records and suppress duplicate sends. Covered in Tasks 3/8/10.

## Task 1: Confirm live preconditions and add real sites/batches

**Files:** Reuse `lib/farm-livestock-categories.ts`, `lib/manager-periods.ts`, `lib/manager-period-types.ts`, the handover/assignment resource routines and current livestock APIs. Propose `lib/farm-batches.ts`, `app/api/farm/batches/route.ts` and new forward migrations for sites/units/batches and their movement/assignment links. Do not rename historical classification groups into batches.

**Interfaces:** Stable site/unit/batch IDs, species/classification, active lifecycle and responsibility links consumed by all following tasks. Existing legacy rows remain readable without a batch ID.

- [ ] After approval, inspect live schema/policies/migration history and capture a fresh private backup and original-row/account baseline. Reconcile the documented MCP migration-version mapping before any migration tool runs.
- [ ] Add isolated failing tests for two ponds with the same classification, assignment isolation, zero-total stock allocation and unchanged legacy totals; implement the smallest linked model and pass them.
- [ ] Extend existing handover rather than forcing another wizard. Managers confirm real assets; exceptions go to Bimbo. Preserve legacy/unallocated quantities until physical evidence supports assignment.
- [ ] Model additional Primefield farm sites as optional configuration, not separate copied systems. Keep existing Farm 1/Farm 2 reports intact.

## Task 2: Private evidence and durable offline media

**Files:** Reuse `lib/offline-storage.ts`, `lib/manager-offline-sync.ts` and the current manager provider. Propose `lib/farm-evidence.ts`, `lib/farm-offline-media.ts` and `app/api/farm/evidence/route.ts`. Leave `app/api/upload/image/route.ts` and public blog storage isolated.

**Interfaces:** Evidence IDs bound to actor, period, batch and record; pending/uploaded/verified state; offline blobs with the existing account/period ownership boundary.

- [ ] Test forbidden cross-account URLs, spoofed MIME/oversize files, quota failure, interrupted uploads, duplicate retries and account/period switching before implementation.
- [ ] Use private storage and short-lived authorized uploads/reads; validate ownership/content server-side and retain activity/recording times distinctly. A photograph supports an observation; do not claim it proves an event beyond doubt.
- [ ] Persist offline blobs in IndexedDB and clearly show Saved on phone / Upload pending / Sent. Required-evidence records are not acknowledged as sent until the evidence and record commit safely.

## Task 3: Batch daily records, mortality proof and questions

**Files:** Extend `lib/farm-reports.ts`, `components/manager/FarmOperations.tsx`, `app/(manager)/manager/mortality/page.tsx`, `app/api/farm/inventory/transaction/route.ts` and existing daily-report APIs. Propose `lib/farm-batch-records.ts`, `app/api/farm/batch-records/route.ts`, `lib/farm-record-messages.ts` and `app/api/farm/record-messages/route.ts` with linked private evidence/messages.

**Interfaces:** Per-batch/date draft and submitted records with numeric feed, deaths, eggs/weights when applicable, notes and evidence. A resource-allowlisted message thread binds to an authorized Farm record ID; only its responsible staff and the CEO can participate. Source movement IDs feed inventory and analytics.

- [ ] Test per-batch missing logs, explicit zero vs missing, required mortality photo, immutable submission, authorized questions/replies on a daily record, sale, purchase and health entry, cross-manager denial, closed dates and concurrent submit/retry.
- [ ] Build short species-appropriate forms and a Today list showing which batches are logged or pending. Keep current broad daily reports as history and useful summaries.
- [ ] Link the existing mortality/feed event when it appears in a report; do not deduct again. Keep new mortality proof mandatory without invalidating old entries that never had photographs.

## Task 4: Purchase authorization, payments and confirmed deliveries

**Files:** Extend `lib/farm-reports.ts`, operational-request UI/APIs, `lib/operations-cash.ts`, `components/dashboard/FundsCustodyPanel.tsx` and feed/supply purchase handlers. Propose `lib/farm-purchases.ts`, structured request/decision/delivery tables and `app/api/farm/purchases/route.ts`.

**Interfaces:** Request lines/vendor/amount/evidence, policy-versioned decision, remaining authorized value, actual payment links and per-line delivery receipts. Feed's existing `delivery_received`, `delivery_date` and `feed_activity_id` links are reused.

- [ ] Test quote/proof requirements, manual and threshold decisions, altered prices/quantities, split-line totals, stale approvals and concurrent overspending/delivery retries before implementation.
- [ ] Make all new purchasing require manual approval or an explicitly configured automatic rule. Default to manual until Bimbo sets limits; do not invent a ten-bag or naira threshold. Apply limits to the complete request, not individual lines.
- [ ] Record real payment and actual recipient separately from approval. Preserve manager receipt confirmation and insufficient-funding review. Neither a receipt photo nor authorization is proof that delivery occurred.
- [ ] Confirm actual quantities, dates and partial deliveries before adding stock. Retain outstanding or disputed quantities for Bimbo's decision; never invent the balance of an order.
- [ ] Unsent older drafts retain their payload and are reviewed against the new rules on sync. Do not fabricate retrospective approvals or silently grandfather unsafe queued purchases.
- [ ] Preserve a report of actual unapproved spending as a clearly flagged exception for CEO resolution, with its true dates/evidence and funding status. Do not conceal real activity or turn a later decision into invented advance approval; the application cannot prevent every off-app purchase.

## Task 5: Stores, eggs, physical counts and feed coverage

**Files:** Reuse `components/manager/FeedStock.tsx`, `FeedRecordDialog.tsx`, `DailyFeed.tsx`, `lib/farm-feed-stock.ts`, supplies APIs and inventory routines. Propose `lib/farm-egg-stock.ts`, `lib/farm-stock-counts.ts` and their narrowly scoped APIs/migrations.

**Interfaces:** Existing stock movements plus linked egg collection/sale/breakage/return events; proposed physical counts and CEO decisions; estimates with their measurement window and cost basis.

- [ ] Test 100 collected eggs minus 60 sold minus 5 recorded losses = 35; retrying collection/payment/sale does not move stock twice. Store whole eggs as the base unit; only show crates from an explicitly configured pack size.
- [ ] Keep drugs/diesel in the existing supply ledger, with compatible units and immutable movement history. Confirmed delivery adds received quantity once; usage reduces it once.
- [ ] Extend current feed/count-problem review to all relevant stores. Capture observed vs system stock, discrepancy, evidence and notes. Preserve book stock until an authorized count decision posts a linked adjustment; approval does not rewrite the counted observation.
- [ ] Propose recorded weighted-average confirmed-receipt cost for new feed/supply loss estimates, labelled as estimates and never applied retrospectively. Unknown legacy unit cost remains unavailable, not zero or sale price.
- [ ] Calculate feed days left only from known usable quantities and comparable recorded consumption over a labelled window. Bags opened are not kilograms consumed. Show why an estimate is unavailable when opening counts, bag weights or consumption are missing.

## Task 6: Invoices, actual receipts and customer debts

**Files:** Extend sales UI/APIs, `lib/farm-finance-calculations.ts`, `lib/farm-finance.ts`, existing cash posting routines and CEO/manager reports. Propose `lib/farm-invoices.ts`, `lib/farm-receivables.ts`, customer/invoice/payment-allocation tables and associated guarded APIs.

**Interfaces:** A unique immutable invoice number for each new finalized sale, customer, approved credit terms in days/due date, payments, adjustments and remaining balance. Revenue and collected-cash fields remain distinct across all summaries. The demo's credit limit is a time limit, not an approved monetary ceiling.

- [ ] First reproduce the full-sale-as-cash assumption with a credit-sale test. A new ₦100,000 invoice with ₦40,000 and ₦35,000 receipts must show revenue ₦100,000, cash ₦75,000 and debt ₦25,000; later receipts do not deduct animals/eggs again.
- [ ] Keep catfish/head/unit pricing and persisted totals. Create invoice, source sale and stock effect atomically; assign final invoice numbers server-side when online, with safe retry identities for offline submissions.
- [ ] Enforce approved credit authorization, terms in days and due dates on the server. Unknown permission does not automatically enable credit; do not invent an unrequested monetary ceiling. Show aged balances and overdue amounts per customer without merging people solely because names match.
- [ ] Allocate part-payments to the oldest unpaid invoice first within the same customer/currency, with explicit immutable allocation links, deterministic date/ID ordering and safe retry handling. Show any overpayment as unapplied credit rather than negative invoice debt. Preserve the original actual cash recipient and manager-period attribution; paying an earlier invoice must not silently transfer historic cash/debt responsibility to new staff. Test equal-date invoices, multiple receipts, overpayments, reversals and concurrent allocations.
- [ ] Post actual receipts/refunds to the correct custody account on their actual dates. Update every Farm/CEO cash surface and true opening balance, independent of pagination. Preserve old cash-sale meaning and existing account history.
- [ ] Verify the procurement example: ₦1m entrusted, ₦300k confirmed by manager, ₦300k actually spent leaves procurement ₦700k, manager ₦0 and combined ₦700k. Purchase permission alone changes none of these balances.

## Task 7: Health schedules and defensible batch performance

**Files:** Extend batch reports, `lib/manager-reports.ts`, `lib/ceo-calculations.ts` and existing charts. Propose `lib/farm-health.ts`, `lib/farm-batch-performance.ts` and health task/completion APIs/tables.

**Interfaces:** Due/overdue/completed tasks, actual product photo and completion event; measured batch summaries with calculation definitions, source links and data-completeness flags.

- [ ] Test batch-specific due dates, missed schedules, product-proof-required completion and correction history. Use Bimbo's/veterinary schedules; do not generate treatment prescriptions.
- [ ] Add headcount/losses, egg output/lay rate, recorded weights, measured feed efficiency, revenue and allocated-cost result. Calculate species-appropriate ratios only with compatible actual measurements and documented denominators.
- [ ] Test that batch-attributed plus unallocated amounts match the source pool without counting feed purchase and usage twice. Reconcile consumption-based results to store costs separately from cash spending.
- [ ] Show trend charts for eggs, deaths and feeding and drill down to records. Show incomplete legacy cost/measurement coverage instead of a misleading profit or efficiency percentage.

## Task 8: CEO control centre, alerts, exports and daily summaries

**Files:** Extend `components/dashboard/CeoDashboard.tsx`, `ManagerReport.tsx`, existing internal Farm pages, `lib/ceo-overview.ts`, `app/api/ceo/control/route.ts` and the ExcelJS snapshot/export pattern. Propose `lib/farm-alerts.ts`, `lib/farm-summary.ts`, farm report export routes and a dedicated authenticated summary cron; do not repurpose the marketing-email job.

**Interfaces:** Shared Farm snapshot for CEO and manager; source-linked urgent decisions; export scope; scheduled summary payload and idempotent delivery log.

- [ ] Add one Farm section within the existing multi-business CEO overview: animals/batches, eggs, losses, invoice revenue, actual collections, spending, money held, customer debt and urgent actions. Adapt the demo's KPI/attention/records/chart hierarchy; label commitments separately from actual spending. Keep every drill-down inside the CEO shell with Back navigation and exact source links, not a redirect to the manager app.
- [ ] Rank actual deaths/spikes, shortfalls, overdue debts/treatments, pending purchases and missing daily logs. Bimbo sets applicable alert limits; avoid claiming that recorded controls prevent every off-app sale or loss.
- [ ] Provide CEO Excel/PDF operational/report exports over complete snapshots and selected scopes. Keep original fields, units, status and audit trail; retain the special historical-account export restriction.
- [ ] Build the daily summary with WhatsApp-ready text and printable/email output. Automatic WhatsApp/email delivery requires verified sender connection, owner-approved recipient, delivery time and available service credentials. Leave sending disabled until configured; provider failure never rolls back Farm records. Do not use the brochure's contact details as recipients.
- [ ] Show Africa/Lagos farm time and Bimbo's chosen IANA timezone, including daylight-saving changes. Keep the ledger in NGN; optional display conversion shows rate/source/as-of and never rewrites original naira values. If rates are missing/stale, make that visible.
- [ ] Test once-per-day delivery, retries, source updates, currency separation, timezone changes and current urgent decisions independently of historical financial filters.

## Task 9: Phone experience, additional access options and handover

**Files:** Extend existing manager/CEO navigation, PWA prompt, layouts, house dialogs and account controls; add only the new feature pages/components needed above.

- [ ] Adapt the documented demo style: sage background, forest actions, bordered white cards, restrained corners/shadows, connected KPIs, status pills/urgency rails, readable tabular numbers and gold/green/red charts. Reuse house components/local approved fonts; confirm final tokens and contrast during design verification rather than inventing an exact font/hex match from screenshots.
- [ ] Use compact Today/records, spending, sales, stock and health/batch navigation, large touch targets, useful hints and centred constrained dialogs. Preserve dedicated Stock, Mortality, Funds, reports and existing export access through clear subnavigation/More. Owner screens prioritize decisions and reports; staff screens prioritize recording. Never expose the prototype's public role switch or reset action.
- [ ] Desktop: retain a bounded main content area and clear sidebar hierarchy. Phone: stack forms/cards, show a visible More entry for owner overflow, retain active location and keep row identity/actions together. Replace opaque wide task/debt/stock tables with compact summaries/details or explicit accessible scrolling. Keep modal title/close/footer available, reset scroll per record and restore the parent filters/scroll on return.
- [ ] Verify widths 375/390/768/1440, all eight owner and five manager section mappings, readable labels/numeric chart alternatives, keyboard focus, Back links, unsaved drafts, loading/error/empty states, physical-phone installation and true offline synchronization. No demo data in runtime views. Browser emulation alone is not physical-device acceptance.
- [ ] Include optional farm-specific vet/accountant access with least privileges and explicit CEO assignment: health-only/recommendation access or read-only finance/report access as appropriate. Audit the global role/membership boundary first; do not treat support staff as admins or alter existing roles silently. Additional farm sites remain optional configuration.
- [ ] Prepare a short staff walkthrough and owner guide using verified workflows. Training uses isolated data where needed, never test financial entries on the live farm.

## Task 10: Preservation, test gates and coordinated release

**Files:** Extend the relevant isolated suites in `scripts/test-manager-release.mjs`; propose focused `scripts/test-farm-batches.mjs`, `test-farm-evidence.mjs`, `test-farm-purchases.mjs`, `test-farm-egg-stock.mjs`, `test-farm-receivables.mjs`, `test-farm-health.mjs` and `test-farm-alerts.mjs`. Name companion actual UI/API/database checks consistently with existing suites when that boundary is involved.

- [ ] For each task: failing meaningful regression, minimal implementation, passing unit/API/UI checks and one focused review before integration. Run database/concurrency writes only against an isolated restored database.
- [ ] Prove permission enforcement through UI, APIs and direct database access; preserve new-manager clean slate, existing-manager history, signed correction trails, ownership, close/write locking and offline payload identity.
- [ ] Rehearse every forward migration and any rollback limitation against the fresh backup. Compare all original rows/columns, figures, accounts and password hashes before/after, allowing only explained genuine activity and normal Auth session updates.
- [ ] Run `npm run lint`, `npm run build`, then sequential TypeScript checks, relevant isolated suites and existing public/other-business smoke tests. Verify preview configuration separately using isolated credentials; never copy production secrets/data into an unsafe preview just to clear a build.
- [ ] Show the tested result and release evidence for explicit production approval. Roll out additive schema and compatible application in a coordinated order, using a brief named Farm-write pause only if needed; verify before resuming. Do not reset/replay old migrations or deploy a broadly scoped old app over new personal accounts.
- [ ] Perform read-only live account/report/export checks after approved release and record the exact Git commit/deployment. Do not create production test accounts or transactions. Keep rollback guidance and all actual business history.

## Approval and configuration points

The proposed scope is all eight feature groups plus the full-version reporting/access options and staff handover above. No numerical auto-approval, mortality, credit, pack-size or exchange-rate rule has been agreed. Build these as explicit settings; keep unsafe automatic decisions off until Bimbo configures them. Automated external delivery depends on connecting the selected sender and destination. The user must approve this plan before application implementation begins.

The demo walkthrough documents a requested visual direction; it does not approve production changes. Preserve the existing account controls, funds custody, manager receipt confirmation, clean personal periods and eligible historical exports even where the prototype has no corresponding screen. Purchase permission must not be copied into an actual-cash formula. The detailed report distinguishes observed controls from actions that were not submitted and full-version capabilities that remain unverified.
