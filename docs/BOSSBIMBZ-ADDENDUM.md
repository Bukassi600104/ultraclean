FOLLOW-UP GOAL UPDATE — BIMBO CLARIFICATIONS
CONTINUE CURRENT IMPLEMENTATION. DO NOT RESTART.

This is an ADDENDUM to the existing production goal prompt already in progress.

Do NOT discard the current implementation.
Do NOT restart the project.
Do NOT rebuild completed work.
Do NOT undo safe changes already made.

Continue from the current working branch/state and update the implementation plan with the following CONFIRMED business requirements from Bimbo.

These clarifications supersede any earlier "awaiting clarification" notes for the items below.

============================================================
1. FARM 1 AND FARM 2 DAILY REPORT FIELDS — NOW CONFIRMED
============================================================

For EACH Farm 1 pond and EACH Farm 2 tarpaulin vat, the daily report should capture:

- Water Quality
- Mortality
- Feed
- General Remarks

Farm 1:
- Pond 1
- Pond 2
- Pond 3
- Pond 4

Farm 2:
- Tarpaulin Vat 1
- Tarpaulin Vat 2
- Tarpaulin Vat 3

Do NOT invent additional mandatory pond/vat metrics beyond these confirmed fields.

Keep the layout structured, mobile-friendly and easy for the farm manager to complete daily.

============================================================
2. LIVESTOCK — EACH RUMINANT/ANIMAL GROUP STANDS SEPARATELY
============================================================

Bimbo confirmed that livestock should not be grouped into one generic section.

Each animal group should stand separately in the Daily Report.

Maintain clear individual sections/rows for the relevant animal groups already discussed, including:

- Goats
- Ram
- Cattle
- Piggery
- Poultry

Do not collapse these into one "Livestock" notes box.

IMPORTANT:
The Daily Report may display Ram separately even if the existing inventory/product model has not yet established Ram as its own tracked stock product.

Do NOT alter production inventory taxonomy unnecessarily just to display the report section.

If the current implementation already created a generic livestock structure, refactor the Daily Report presentation safely so each group is individually visible.

============================================================
3. SICK ANIMALS — SHOW ALL
============================================================

Bimbo clarified that Sick Animals should show ALL affected animals.

Do not model Sick Animals as only:

- one total number
or
- one generic remarks field

Use a repeatable structured list suitable for multiple affected animals.

A practical record may contain:

- animal/group
- quantity affected where applicable
- observation/symptoms
- action taken
- remarks

Keep it operational and concise.

Do NOT turn this into a veterinary EMR/medical-record platform.

The goal is for Bimbo to see all currently reported sick animals clearly.

============================================================
4. FEED INVENTORY — NOW A CONFIRMED REQUIREMENT
============================================================

Bimbo confirmed that Feed Inventory means ACTUAL FEED BAGS AVAILABLE.

This is no longer an unresolved metric.

Implement a real authoritative feed stock workflow.

Required business behavior:

A. New feed received/purchased:
   available feed stock increases.

B. When the manager starts/uses a new bag:
   available bags must decrease immediately.

C. The updated remaining quantity must be reflected in feed inventory immediately.

D. Daily feed activity/reporting must remain connected to the actual stock movement.

E. CEO Dashboard must display the real remaining feed inventory.

============================================================
5. FEED INVENTORY MUST NOT BE FAKE OR DERIVED UNSAFELY
============================================================

Do NOT simply calculate:

all historical purchases - all historical daily-feed rows

unless the historical records are complete and unit-compatible enough to make that result trustworthy.

Inspect the current data first.

Historical feed records may be incomplete for authoritative opening inventory.

If historical data cannot produce a reliable current stock:

- preserve all historical feed records unchanged
- introduce prospective feed inventory tracking
- establish a safe opening balance workflow
- do NOT invent the opening stock
- require an authorized real opening quantity before the feed inventory is treated as authoritative

Do not backfill guessed quantities.

============================================================
6. FEED STOCK MODEL
============================================================

Implement the smallest safe model that supports real stock.

The architecture should support:

- feed type/category
- bags received
- bags used/opened
- current bags available
- date
- actor
- source/reference where relevant
- history/audit

Prefer transaction/movement-based stock over manually overwriting a total.

Example:

FEED RECEIVED:
+10 bags

NEW BAG USED:
-1 bag

AVAILABLE:
9 bags

If existing feed purchase data already contains number of bags, connect future purchases safely to inventory movements without double-counting.

If current daily-feed records represent bag consumption, reconcile them carefully before linking.

Do NOT create duplicate deductions.

============================================================
7. DAILY REPORT + FEED STOCK INTEGRATION
============================================================

The Daily Report Feed field should not independently create uncontrolled duplicate feed usage.

Use one authoritative feed-consumption flow.

If the manager indicates that a new bag was used from the Daily Report:

either:

A. create/link the authoritative feed stock movement from that action,
OR

B. link to the existing daily-feed entry if that workflow already owns stock consumption.

The same physical bag must only be deducted ONCE.

The Daily Report may display/summarize the activity, but the stock movement must have one authoritative source.

============================================================
8. CEO DECISION REQUIRED — CONFIRMED AUTOMATIC REQUEST
============================================================

Bimbo confirmed:

When:

CEO Decision Required = YES

the system should AUTOMATICALLY create a request for the CEO.

This is no longer optional.

The new request must:

- appear in the CEO Dashboard request/approval area
- link back to the originating Daily Report
- include the issue/problem
- include action already taken
- include submitter
- include date/time
- show pending status

Do not require the farm manager to enter the same issue again manually.

============================================================
9. SEPARATE REQUEST SECTION — CONFIRMED
============================================================

Bimbo confirmed the separate operational Request section.

Proceed with the previously specified standalone operational request workflow.

This should support requests such as:

- purchase
- feed
- veterinary
- repair
- maintenance
- equipment
- staffing
- water
- pump
- emergency/problem
- other

Keep this separate from farm_correction_requests.

Correction request:
correct a saved record.

Operational request:
request approval/action/resources.

============================================================
10. PRIMEFIELD PRODUCTION COST — REMOVE DUPLICATION
============================================================

Bimbo confirmed:

"Production cost is same expense, we can leave it as expenses."

Therefore:

DO NOT create a separate Production Cost KPI.

DO NOT show both:

Expenses
and
Production Cost

if they represent the same thing.

Primefield CEO Dashboard should use:

- Revenue
- Expenses
- Cash Balance
- Feed Inventory
- Fish Stock
- Mortality
- Livestock Count
- Sales

Remove Production Cost from the planned CEO KPI list.

If any Production Cost code/card/model has already been created during the current implementation:

remove or collapse it safely before completion.

Do not change the underlying valid expense records.

============================================================
11. PROPERTIES MODULE — APPROVED
============================================================

Bimbo confirmed the proposed Property Manager structure.

Proceed as planned with the separate Property Manager operational module.

Continue the previously defined scope for:

- properties
- units
- tenants/occupancy/tenancy
- rent
- expenses
- vacancies
- maintenance
- repairs
- history
- CEO Dashboard aggregation

No further business clarification is required before building the agreed core scope.

Do not expand into a large property ERP beyond the agreed scope.

============================================================
12. CONTENT MANAGER — APPROVED
============================================================

Bimbo confirmed:

"for the content aspect, pls proceed as recommended"

Proceed with the Content Manager architecture already specified.

That includes:

- separate Content Manager module
- content records
- performance tracking
- Bossbimbz CEO metrics
- Instagram-first integration
- Facebook where free official API supports it
- TikTok where free official API supports it
- manual fallback where APIs do not provide metrics
- no paid API
- no social password sharing
- OAuth where applicable
- leads
- mentorship sales
- affiliate sales
- content output

Do not treat this area as awaiting business approval anymore.

============================================================
13. REPORT TEMPLATE STATUS
============================================================

Bimbo confirmed that the report template has already been analyzed through the structure provided above.

Proceed using the confirmed report structure in this addendum.

Do not block the Daily Report build waiting for another report-template file unless implementation reveals a genuine missing field.

============================================================
14. CEO DASHBOARD PRIMEFIELD SECTION — UPDATED FINAL LIST
============================================================

The Primefield CEO summary should now target:

- Revenue
- Expenses
- Cash Balance
- Feed Inventory
- Fish Stock
- Mortality
- Livestock Count
- Sales

REMOVE:

- Production Cost

because Bimbo confirmed it is the same as Expenses.

============================================================
15. FEED INVENTORY CEO PRESENTATION
============================================================

Feed Inventory should represent ACTUAL REMAINING FEED.

Prefer useful breakdowns such as:

- feed type
- bags remaining

Do not reduce this to one ambiguous number if multiple feed types exist.

The CEO should be able to understand at a glance what feed remains.

Keep the presentation compact and executive-level.

Detailed feed movements remain inside Primefield operations.

============================================================
16. UPDATE THE CURRENT IMPLEMENTATION PLAN
============================================================

The Goal Guardian must now update its checklist.

Mark the following as RESOLVED / CONFIRMED:

- Farm 1 pond fields
- Farm 2 vat fields
- individual livestock group reporting
- Sick Animals behavior
- feed inventory definition
- automatic CEO request
- separate Request section
- Primefield Production Cost handling
- Property Manager approval
- Content Manager approval
- report-template structure

Remove stale "awaiting clarification" flags for these items.

============================================================
17. CURRENT WORK MUST BE RECONCILED, NOT THROWN AWAY
============================================================

Because implementation has already started:

Before changing anything, inspect what has already been built against these new clarifications.

Classify current work as:

KEEP
ADJUST
REMOVE

Examples:

KEEP:
- safe Property Manager structures already matching the approved design
- Content Manager structures already matching the approved design
- operational request foundation if correct

ADJUST:
- Daily Report pond/vat fields if they are currently too generic
- livestock layout if currently grouped
- feed inventory if currently only calculated from purchases
- CEO Primefield KPI list

REMOVE:
- duplicate Production Cost KPI if already implemented
- any fake feed inventory calculation
- any duplicated feed-stock deduction path

Do NOT restart correct work.

============================================================
18. NEW TESTS REQUIRED
============================================================

Add/adjust tests for these confirmed behaviors.

FARM DAILY REPORT:

- each Farm 1 pond supports Water Quality
- each Farm 1 pond supports Mortality
- each Farm 1 pond supports Feed
- each Farm 1 pond supports General Remarks

- each Farm 2 vat supports Water Quality
- each Farm 2 vat supports Mortality
- each Farm 2 vat supports Feed
- each Farm 2 vat supports General Remarks

- livestock groups appear separately
- Sick Animals supports multiple records

FEED:

- purchase/receipt increases available bags
- new bag use decreases available bags immediately
- remaining bags are correct
- same bag use is not deducted twice
- Daily Report feed action does not create duplicate consumption
- CEO feed inventory matches authoritative stock
- legacy feed records remain unchanged

REQUESTS:

- CEO Decision Required=Yes creates request automatically
- linked Daily Report ID is retained
- issue and action taken flow into request
- request appears in CEO view
- No does not create an automatic request
- manual separate request still works independently

CEO DASHBOARD:

- no Production Cost KPI
- Expenses remains
- Feed Inventory displays authoritative remaining quantity
- no fake value when opening stock is not yet established

============================================================
19. PRODUCTION SAFETY STILL OVERRIDES ALL NEW WORK
============================================================

These clarifications DO NOT weaken any of the original production rules.

Still preserve:

- Primefield V2
- historical sales
- historical expenses
- historical feed records
- inventory
- accounts
- permissions
- correction history
- fund transfers
- existing routes
- existing manager workflows

No destructive migration.

No historical guesswork.

No paid API.

No paid Supabase requirement.

No direct production deployment until the complete updated goal passes review.

============================================================
20. UPDATED COMPLETION CONDITION
============================================================

Do not mark the current goal complete until the newly confirmed Bimbo
requirements above are also implemented and tested.

The Goal Guardian must include this addendum in the final end-to-end audit.

FINAL INSTRUCTION:

CONTINUE THE CURRENT BUILD.

DO NOT RESTART.

INCORPORATE THESE CONFIRMED REQUIREMENTS INTO THE EXISTING PLAN.

PRESERVE ALL SAFE WORK ALREADY COMPLETED.

FIX ANY CURRENT IMPLEMENTATION THAT CONFLICTS WITH THESE CLARIFICATIONS.

KEEP PRODUCTION SAFE.
