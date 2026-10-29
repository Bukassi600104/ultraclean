# Individual manager records, farm handover and funds reconciliation

Status: approved by the user on 28 October 2026, including both funding decisions and the feed/CEO control-centre addenda. Implementation and isolated verification completed on 29 October; the explicit production release gate remains pending.

## Purpose and agreed requirements

Bimbo needs every newly created Farm, Property and Content manager account to begin with its own empty activity and cash responsibility. New staff must not inherit earlier managers' debts, balances or performance credit. Bimbo retains the whole-business history and can select one manager to inspect their work, spending, inflows, reports and performance.

New farm managers must complete a short inventory-confirmation wizard before entering the operational dashboard. It presents the farm's recorded inventory in manageable groups, requires confirmation of what the manager physically meets, and ends with an explicit final confirmation. The manager does not re-enter quantities or recreate inventory.

The procurement manager may remain offline and have no app login. Bimbo records money entrusted to procurement. A farm manager records money actually received from procurement, linked to that source. Both people's balances and Bimbo's view must reconcile without treating an internal handoff as revenue or a second expense.

User clarification: special historical Excel export is enabled for the existing **Farm Manager** and **Emmanuel Adeolu** accounts only. Tony and newly created accounts do not receive it. No existing records, credentials or account status may be changed or deleted by this update. Suspension remains an explicit action for Bimbo; it is not automated during rollout.

## Verified current state

Repository baseline: `7a9d1fc0566afcdf270f9d77360975b557a4a832`. Production Supabase: `gsxqrjywtugeuexrjcln`.

- Accounts currently grant business-wide role access. Farm, Property and Content reads do not consistently scope records to a manager.
- All 87 general farm expenses, 29 feed purchases and 12 sales identify the existing Farm Manager as the recorded creator. This establishes entry attribution, not necessarily who physically paid or received cash.
- The 105 fund transfer rows identify Bimbo as their creator, with no recipient field. Some are voided. Do not use their raw total as active cash, assign them to a manager from creation date, or fabricate receipts.
- Existing Farm Manager profile: `ca7d7137-72dc-4cbc-848d-beb56d951344`; Emmanuel Adeolu: `a1e4ad6e-a565-4330-ae4c-3a0bc92081d1`; Tony: `cd84077a-3c40-485f-b091-9ad1f047a2b1`.
- Current inventory has five product rows and 24 active supply items. The livestock-group and feed-stock tables have no rows. Unknown feed openings stay unknown, and legacy stock must not be assigned guessed classifications.
- `farm_daily_records` has one shared record per date. Individual manager reporting cannot silently reinterpret its existing closures.
- Farm's general offline queue is device-wide; Property and Content queues are already keyed by account. All new responsibility periods also need queue isolation so an earlier person's queued write cannot submit under a later login or period.
- Existing exact-decimal financial service reads complete records, excludes voids and keeps owner funding separate from sales cash. Reuse it and its tested money rules.

## Approach

Recommended: add manager operating periods and explicit responsibility links, plus linked cash-custody transactions. Keep existing ledgers and business assets in place. Derive both individual and CEO summaries from authoritative records and the new explicit links.

A creator-only filter is insufficient: Bimbo creates transfers for other people, admins may record entries on someone's behalf, and shared assets are not owned by whoever typed them. Separate databases/apps per manager would split the farm's stock and add duplicate ledgers and integration work; it does not fit the preservation requirement.

Use the current Next.js, Supabase, existing guarded transaction routines, UI components and exact-money helpers. This is a proposed design choice, not a claim that the user has already approved this document.

## Individual accounts and reporting

1. Each newly provisioned managerial role gets an operating period with business, responsible account, start date/time and lifecycle status. Bimbo chooses the work start date; account creation date is not a guessed handover date. No hardcoded Monday date.
2. A new period begins with zero personal cash, no personal sales/expenses/reports and no inherited debt. The first actual receipt is an inflow; it is not silently substituted for the day's opening balance. Later opening balances carry from that manager's previous closing balance.
3. Separate the authenticated recording actor from the responsible manager/period. Derive the actor on the server. Admin entries on someone's behalf explicitly select the responsible manager. Managers cannot select another person's ID to read or write their records.
4. Tag new activity within the same database transaction as its record/audit writes. Prefer additive ownership metadata/links so original rows and attribution remain intact. Legacy missing responsibility stays unallocated; no historical backfill by guesswork.
5. Existing accounts are not reset, suspended or forcibly onboarded by deployment. Their earlier business figures remain available as clearly labelled legacy history. An explicit future new operating period can start fresh without erasing the earlier one. Existing account IDs do not change.
6. New Property/Content managers initially see no historical transactions, work or performance. Existing properties, units, tenancies, content and social integrations remain business assets. Access to an existing asset requires an explicit assignment; do not duplicate it or copy its earlier activity into the new period. If later assigned, show necessary current asset details, not another manager's financial history.
7. New farm managers see the inventory accepted at handover as existing farm assets, not purchases or activity credited to them. Their activity starts empty while the real confirmed stock can be nonzero.
8. CEO pages remain inside the CEO shell. Default to the business overview, with simple Business, Manager and Period filters. Show money received, spent, sales/inflows, money still held, work completed and pending decisions. Label missing inputs and unallocated legacy funds plainly. Select metrics appropriate to each business; do not invent Content profit or Property arrears.
9. Individual figures must add into the business view once, with an explicit legacy/unallocated category where required. Transfers between staff have zero effect on combined business cash. Mixed currencies remain separate.

## CEO control centre — user clarification, 28 October 2026

The CEO dashboard is Bimbo's central place to see, balance, check and decide across every existing business. It must present the genuine activity, financial position, individual manager work and outstanding decisions in understandable sections, with a clear route from a headline figure to its supporting records. Maintain UltraTidy, DBA, Primefield, Properties and Content in the CEO shell using their actual available data; do not imply that all businesses have the same financial fields or invent unsupported measures.

Provide a clear current decision area for operational requests, proposed corrections, handover issues, optional feed reviews and funding gaps. Show business, manager/requester, date, relevant amount or quantity, supporting details and status. Bimbo can approve or decline where applicable, with actor/time and reasons retained. Pending current decisions remain visible independently of a historical financial date filter, with that difference labelled. Approval cannot fabricate funds, bypass a required manager acknowledgement, repeat physical stock effects or erase an activity that already occurred.

All CEO sidebar destinations and their nested pages must follow consistent layout rules, not just the overview or new modules. Use aligned page headers, visible parent navigation, restrained spacing and clear readable hierarchy. Centre constrained page/form containers where appropriate and centre modest dialogs in the viewport. Let detailed tables use an appropriate content width with scrolling contained within the table. Do not push forms off to either side, force everything into full-screen panels, centre every text label indiscriminately, or clip actions on phones. Preserve existing working controls and business workflows while correcting layout inconsistencies.

Use only real production records for live figures, charts, tables, activity and requests. No demo rows, invented managers, sample transactions, filler chart values or mock-data fallbacks may appear in the deployed app. If records are absent, leave the relevant data area empty and explain that there are no recorded entries. Show a genuine zero only when a successful complete query establishes it; unknown/missing information and query failures must remain visibly distinct from zero. Never seed production to make a screen look populated. Synthetic fixtures remain confined to isolated tests and can never be imported into runtime paths or written to production.

This clarification extends the same plan; it does not authorise implementation or deployment yet. No original records, account access or historical values may be changed merely to improve how the dashboard looks.

## Farm handover wizard

Only new farm periods require this wizard. Their status progresses from awaiting handover to active. Deep links, APIs and direct database access cannot bypass it. Existing legacy sessions retain their established access until Bimbo explicitly starts a new period.

Steps are generated from real recorded items, approximately 5–10 confirmations per page:

1. Welcome and responsibility start date.
2. Livestock/fish quantities and recorded growth groups; preserve Unclassified labels.
3. Recorded feed bags, equipment, supplies and other tracked farm items, grouped to avoid overload.
4. Review, then explicit final confirmation and entry to the dashboard.

Controls are simple: Confirmed on ground, or Cannot confirm. No mandatory quantity entry or invented inventory form. An unchecked/unconfirmed item is not implicitly accepted. Cannot confirm records a handover issue for Bimbo and leaves acceptance pending; Bimbo resolves the issue through the existing audited correction workflow before final completion. Managers must never be forced to attest to missing stock.

Display only data the app actually has. There is no existing standalone fixed-asset register, so equipment only appears where recorded in inventory/supplies. Unknown feed opening counts appear as unknown; the manager can enter an actual starting count through the separate feed-record dialog without requiring Bimbo to type it. Zero rows must not become a fabricated physical zero or a checkbox claiming an unknown quantity exists.

Save progress per account and operating period. Draft ticks can resume, but final acceptance requires online verification. Snapshot source IDs, descriptions, quantities, units, versions/as-of time, manager, start date and final acceptance time. Recheck changed items before completion using the same inventory locking regime as stock writes. If a quantity changes during the walk, ask the manager to recheck that item rather than accept stale stock.

Acceptance writes only handover/confirmation records. It does not insert Add Stock/opening movements, change current quantities, transfer old cash or reopen a closed date. Prevent duplicate final acceptance on retry. After activation, stock is deducted by the existing sale/mortality/feed/supply movements exactly once.

## Feed inventory simplification — user addendum, 28 October 2026

The farm manager performs routine feed entry once; Bimbo observes the synchronized records and acts on requests when needed. Bimbo is not required to enter the starting count or repeat purchases, receipts or opened-bag records. Current CEO-only opening permissions must be deliberately changed for authorised farm managers; this is a proposed update, not the current deployed behavior.

Replace the repeated animal/source card matrix and permanently exposed technical form with one compact stock table. Show recorded/relevant feed combinations, not fourteen speculative empty cards. Before any counts exist, show one clear empty state and an Add feed record action on the manager side. Use plain columns such as Feed, Source, Unopened bags, Last activity and History; show detailed dated events on demand.

The manager clicks **Add feed record**, chooses the action and enters only its required details in a centred dialog:

- **Starting bag count:** actual unopened bags in the store, counted once for an unknown feed/source. A new manager does not reset an already established business count; they confirm it at handover.
- **Feed received:** bags physically delivered, with the relevant purchase/financial link. Buying/ordering feed is not automatically proof of physical arrival.
- **Bags opened for feeding:** actual whole bags opened. Deduct each opening once, whether entered here or through Daily Feed. Feeding from an already opened bag must not deduct it again or be confused with the quantity fed.
- **Report a count problem:** retain the manager's proposed correction and evidence/reason for review through the existing audited correction process. Bimbo can approve or respond; she does not have to retype the manager's entry. Do not expose plus/minus arithmetic as the normal operator workflow.

Each event requires its actual activity date, defaulting to the current farm date in Africa/Lagos. Store the recording timestamp automatically and show both activity date and recorded time, with the named actor, in history. Approval dates never replace activity dates. Counted stock is as of the recorded starting-count point; bags already included in that count must not be added again as a later-entered receipt. Make any needed included-in-starting-count confirmation explicit rather than guessing chronology from a date alone.

Opening bags and ordinary feed work do not require Bimbo's permission. An optional request for Bimbo's review/approval may be linked to an entry. There is no automatic ten-bag threshold or other new mandatory approval rule. Pending optional review does not freeze feeding, suppress actual stock activity or post another stock movement when answered. A declined review flags follow-up; it does not rewrite what physically happened.

The confirmed insufficient-funds rule still applies to money: the financial expense remains pending and cannot create negative personal cash. Independently confirmed physical delivery/opening can be recorded while funding is being resolved, so physical inventory does not falsely exclude bags that are on the farm. Link physical receipt and pending/posted cost explicitly; resolving the cost must reuse the existing physical receipt and never add the same bags a second time. An unconfirmed order/payment-only entry cannot create physical bags. No stock or financial event is fabricated merely to get past an approval step.

Use the existing component library, typography, spacing, colours and accessible Dialog. Keep the page content in a centred constrained container. Centre the modest-width dialog horizontally and vertically, with safe viewport margins, readable labels, visible actions, keyboard/focus handling, retained unsaved values and internal scrolling when needed on a small phone. Avoid oversized cards, side-pushed forms, screen-wide entry panels and clipped controls. CEO feed view defaults to stock/activity and requests rather than a compulsory entry form.

This remains an unopened-bag count. Do not silently add guessed kilograms or partial contents of opened bags. Preserve all original feed purchases, feeding records, stock movements and historical timestamps; any new permissions or physical-event links use forward-only migrations and audited new records.

## Funds custody and reconciliation

### Proposed receipt policy

A manager's submitted receipt posts automatically, matching the user's requested flow. It must refer to a recorded source allocation with enough available funds, name the source person, and retain the manager's acknowledgement and actor/time. Mark it as manager-acknowledged so Bimbo can inspect or dispute it. No separate mandatory approval step is proposed for every receipt. A correction/dispute is audited and does not silently rewrite the receipt.

The offline procurement person is a named custodian, not a required login. Bimbo can record procurement payments/expenses on that person's behalf with the real payer/custodian and recording actor kept separate.

| Recorded event | Procurement holds | Farm manager holds | Combined unspent funds |
|---|---:|---:|---:|
| Bimbo sends procurement NGN 1,000,000 | 1,000,000 | 0 | 1,000,000 |
| Manager acknowledges NGN 300,000 received | 700,000 | 300,000 | 1,000,000 |
| Manager records actual feed purchase NGN 300,000 | 700,000 | 0 | 700,000 |

The internal NGN 300,000 is neither another Bimbo transfer nor an expense. A funded purchase and confirmed delivery of ten bags at NGN 30,000 each records one NGN 300,000 feed expense and one linked physical receipt, without an extra general feed expense. If delivery was already recorded while funding was pending, posting its cost does not add the bags again.

### Rules

- A source allocation identifies business, currency, custodian/manager, date, amount and original Bimbo transfer. Support direct Bimbo-to-manager funding through the same model.
- A handoff has one immutable identity with balanced sender/receiver effects, source allocation links, counterparty and operating period. Enforce positive exact amounts, currency compatibility, start-date restrictions and source availability on the server and in transactional database routines.
- One source can fund partial handoffs; if several original allocations fund one receipt, store explicit links and allocate deterministically within the transaction. Do not infer legacy recipients.
- Lock affected source/destination cash accounts in a consistent order; two concurrent receipts cannot both spend the same remaining money. Retry IDs bind actor, period and payload; replay the same operation without posting twice and reject conflicting reuse.
- Actual sales, rent and Content sales credit the responsible cash holder in their own currency. Actual paid expenses debit the correct holder/funding source once. Preserve the existing distinction between owner funds and sales cash. Payment methods that do not represent money held by the manager must identify the true receiving account rather than automatically credit personal cash.
- User-entered sale/expense/feed writes and their new cash effects commit or roll back together. Guard corrective edits and voids with compensating postings, reason, actor and original links. New managers cannot use old unallocated business money as their starting personal balance.
- Bimbo sees Money sent, With procurement, With each manager, Recorded spending and Unallocated legacy balance. Internal allocations remain visible in the trace, but do not inflate sales, funding or spending.
- Missing old recipient information stays labelled as a reconciliation gap. Existing transfers, raw amounts, void status, dates, balances and historical attribution are not amended during rollout. Future separately authorised evidence-based attribution can use audited links, not rewrites of originals.
- Keep daily opening balance, receipts today, spending today and closing balance distinct. Cash carry-forward is per manager/period and currency. Daily operating result is separate from cash funding.

## Legacy Excel export

Eligible profile IDs are exactly Farm Manager and Emmanuel Adeolu listed above. Bimbo can export either from Manage Accounts/individual report; when she uses an eligible active manager login it can export its own record. A suspended account stays blocked from login; the CEO can still export its retained history. Do not grant an admin export bypass to a manager, and do not unlock the feature by changing a query parameter. Future accounts cannot enable the flag themselves.

Produce genuine `.xlsx` downloads, read-only and consistent as of one snapshot, over all relevant rows rather than one visible page. Include a concise summary and distinct source sheets as needed for sales, general expenses, feed purchases/activity, inventory/mortality, supplies, daily reports/requests, corrections/audit and verified personal receipts. Include original dates, status/voids, actors and units. Summaries exclude voids; original voided records remain visible and labelled.

Filter by proven responsibility or original recorded actor, following linked admin corrections of those same records. Do not infer that every business transfer belongs to the selected person. State that original fund recipients were not recorded; do not put another person's/unassigned funds into the manager's balance. Emmanuel may have no attributable records in some sheets; show a genuine empty state instead of copying Farm Manager's activity.

Include generation/as-of date, scope and attribution limitations. Preserve original high-precision values as text where Excel's numeric precision would lose them, alongside readable currency columns where safe. Escape untrusted cell content as strings, never executable formulas. Use one maintained XLSX library if the project has no suitable existing dependency, selected and pinned during implementation. Never send or email exports automatically.

## Security, closure and offline behavior

Scope reads and writes in APIs, database grants/policies and transactional routines. Service-role API clients bypass RLS, so they must enforce authenticated account/period filters themselves; direct authenticated queries need matching policies. Verify linked property/content/stock IDs belong to the manager's assigned scope before writes.

Manager-facing date closure and report histories must use the responsible period; preserve the original shared legacy closure rows and their actor/time. Add a new scoped day state where needed rather than rewriting closed history. Farm saved-record corrections remain requests to Bimbo. Property and Content retain their current audited edit workflows for authorised records within the manager's own assigned scope. Admin corrections stay audited against the original period/date.

Namespace every queue/draft by account, business and operating period, and retain the submitting identity. Stop an in-flight sync when account/period changes. Old device-wide entries without trustworthy identity remain retained and quarantined for resolution, never adopted by a new login or silently deleted. Preserve uncertain retries and forbid stale period/account submission. New-person onboarding cannot accidentally auto-sync old entries before completing the gate.

Official access reference: https://supabase.com/docs/guides/database/postgres/row-level-security. Current changelog was inspected; no SDK/provider/platform upgrade is proposed as part of this feature.

## Implementation boundary and verification

Affects account provisioning/role activation; authenticated manager/app shells; financial and activity APIs; stock/feed/supply selectors; guarded farm/Property/Content writes; ownership/custody metadata and RLS; offline storage/sync; CEO filters/reports; export handlers/UI and tests. Public sites, CRM, course sales and existing login identities stay outside this change.

Use forward-only migrations with legacy NULL/unallocated handling, lock notes and rollback limitations. Never replay original migrations or reset historical data. Fresh private backup, restore rehearsal and before/after fingerprints remain release gates. Stage compatible code/schema before exposing new-account behavior; do not allow partially provisioned accounts to see shared history. Production migration/release is a separate, concrete gate after the design and implementation have been reviewed and tested.

Required acceptance tests:

1. New accounts in all three apps see zero personal activity/balance and cannot read other managers' rows through URLs, forged IDs, APIs or direct database calls. CEO retains complete totals and individual filters; master records are not duplicated.
2. Farm onboarding cannot be bypassed, handles no/unknown data honestly, saves ticks, flags missing items, rechecks stale quantities, commits acceptance once, and creates zero stock/cash movements.
3. NGN 1,000,000 → NGN 300,000 → NGN 300,000 expense yields 700,000/0 custody and 700,000 combined, with one feed receipt/expense. Test partial/multiple sources, concurrent over-allocation, duplicates, lost responses, corrections, voids, sales cash, negative/invalid inputs and mixed currencies. Confirm manager-led starting counts, dated feed delivery/opening, optional non-blocking review, and a physically received delivery whose pending cost is later resolved without a second stock addition.
4. Personal/day/period/CEO numbers agree at exact displayed precision beyond 500 rows; genuine prior-day closing carries forward. Internal transfers do not inflate revenue/expenses. Missing receipts remain explicit.
5. Account switching and reconnecting cannot submit an old person's queue under a new identity; unowned/uncertain entries survive for resolution. Suspension blocks new writes but preserves records and admin export.
6. Only the two allowed accounts receive XLSX exports. Round-trip read exports to verify all rows, ownership, original values, voids, corrections, currency and formula-injection safety; no production test records.
7. Existing account/API/UI/closure/livestock/feed/Property/Content/CEO and public-site regressions pass, as do lint and build. Compare old records/accounts/quantities before and after additive migration on an isolated restored copy, then verified production release. Check every CEO sidebar/nested destination for readable, correctly positioned layouts and accessible centred dialogs; exercise real-empty, genuine-zero, unknown and query-failure states with no runtime mock data or production seeding.

## Calls for review

- Fresh personal activity does not erase real farm assets or the CEO's historical business balances.
- Proposed receipt posting is automatic against a known available source, with traceability and dispute/correction support; no required procurement login.
- Existing accounts are preserved in legacy mode; starting them afresh is an explicit new period, never a silent rollout reset.
- Unconfirmed inventory blocks final handover until Bimbo resolves it; it never forces a false physical confirmation.
- Legacy funding with no recipient cannot be honestly assigned to either manager in an Excel report.
- Exact schema/table names and XLSX dependency selection are left to the implementation plan; these behavioral guarantees are not optional.

## Confirmed financial decisions

The independent design check identified two material financial decisions. The user explicitly selected both recommended policies:

1. Direct Bimbo-to-manager funding enters the manager's personal balance only after the manager confirms receipt. Until then, show **Sent, awaiting receipt** in a separate custody/clearing balance. Never make the amount disappear from the CEO reconciliation. The offline procurement person can still be represented by Bimbo, without requiring a login.
2. An expense exceeding the new manager's recorded available money stays **pending funding confirmation**. Retain the original entry, show its available amount/shortfall to Bimbo and do not create a new negative personal balance. Pending entries are visible as needing reconciliation, not completed spending, and are never discarded. After Bimbo confirms the true payer/funding and sufficient funds are actually acknowledged where required, post the original dated business entry and cash effects once, with normal closed-day correction controls when applicable. Bimbo's resolution does not fabricate a receipt or credit money to the manager without acknowledgement.

These decisions affect only the new manager/custody model. Existing historical expenses, deficits and account balances remain unchanged under either answer.
