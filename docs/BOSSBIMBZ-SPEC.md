PROJECT GOAL:
BOSSBIMBZ OPERATIONS PLATFORM — PRODUCTION EXPANSION
WITH CEO DASHBOARD VISUAL REDESIGN

Repository:
https://github.com/Bukassi600104/ultraclean.git

THIS IS A LIVE PRODUCTION APPLICATION.

It is already actively used by Bimbo and the Primefield farm manager.

Primefield V2 is already released and must be treated as the protected
production baseline.

This task is NOT:

- a rebuild
- a rewrite
- a prototype
- a demo
- a clean-slate redesign
- a database reset
- an opportunity to change working production flows unnecessarily

This is a CONTROLLED PRODUCTION EXPANSION.

============================================================
PRIMARY GOAL
============================================================

Continue the existing application and implement:

1. Primefield Daily Report
2. Primefield Operational Requests / CEO Decisions
3. CEO Dashboard
4. Property Manager operational module
5. Content Manager operational module
6. Bossbimbz performance tracking
7. Free official social integrations where possible
8. All supporting Supabase backend structures
9. Production-safe role separation
10. Full regression/debug/security testing

In addition:

REDESIGN THE CEO DASHBOARD VISUALLY using the provided reference image as
design direction.

IMPORTANT:

The CEO Dashboard is the ONLY area receiving a deliberate visual redesign
during this phase.

Do NOT perform broad visual redesigns of:

- Farm Manager
- Property Manager
- Content Manager
- existing UltraTidy pages
- existing DBA pages
- existing CRM pages
- unrelated public website pages

Those operational applications should be built cleanly and professionally
using the CURRENT project design system.

Their dedicated mobile UX/UI refinement will happen in a later phase.

============================================================
CURRENT PRODUCTION BASELINE
============================================================

Before making changes:

1. Fetch latest main.
2. Verify HEAD.
3. Read AGENTS.md fully.
4. Read tasks/lessons.md.
5. Read tasks/todo.md.
6. Read docs/PRIMEFIELD-V2-RELEASE.md.
7. Inspect migrations 012 and 013.
8. Inspect the current live Supabase schema.
9. Inspect existing auth, middleware, roles and routing.
10. Inspect existing CEO/admin dashboard code.
11. Inspect existing farm write boundaries.
12. Inspect current deployment behavior.

Primefield V2 migrations:

012_primefield_v2.sql
013_primefield_v2_write_boundary.sql

are already production-applied.

DO NOT REPLAY THEM.

DO NOT MODIFY THEIR INTENDED BEHAVIOR.

============================================================
ABSOLUTE PRODUCTION SAFETY RULE
============================================================

PRESERVE EXISTING WORK.

DO NOT:

- reset Supabase
- truncate tables
- delete production rows
- reseed production
- recreate existing tables unnecessarily
- rewrite historical farm records
- recalculate old financial values
- alter user IDs
- change existing passwords
- remove working flows
- change working URLs without necessity
- weaken authorization
- weaken Primefield V2 write boundaries
- silently change financial meaning
- break existing manager workflows
- break current CEO/admin functionality
- alter unrelated applications just for code cleanliness

If an existing flow already works:

PRESERVE IT.

If a new requirement can be added around existing logic:

ADD AROUND IT.

Do not replace stable working logic unnecessarily.

============================================================
NON-DESTRUCTIVE RULE
============================================================

Any change touching existing production data must be:

- additive
- backward compatible
- reversible where practical
- tested against legacy data
- documented

No historical record may be modified simply to make new code easier.

============================================================
SOURCE CONTROL GATE
============================================================

DO NOT DEVELOP DIRECTLY ON MAIN.

Required workflow:

1. fetch latest main
2. create dedicated feature branch
3. record baseline commit
4. implement incrementally
5. run tests after each major slice
6. review final diff
7. push feature branch
8. prepare final release report

DO NOT MERGE TO MAIN.
DO NOT TRIGGER PRODUCTION DEPLOYMENT.

Wait for explicit release authorization.

============================================================
MANDATORY AGENT STRUCTURE
============================================================

The parent agent owns the overall goal.

Spawn specialized agents.

------------------------------------------------------------
AGENT 1 — GOAL GUARDIAN
------------------------------------------------------------

Track the entire specification from beginning to end.

Continuously verify:

- every requirement is covered
- no section is skipped
- no feature is marked complete prematurely
- no production-safety rule is violated
- no unfinished UI is shipped
- no fake placeholder data is introduced

At every milestone ask:

"What remains before the full goal is actually satisfied?"

The parent agent must resolve those gaps.

------------------------------------------------------------
AGENT 2 — PRODUCTION SAFETY / REGRESSION
------------------------------------------------------------

Protect everything already working.

Baseline:

- Primefield V2
- farm data
- financial calculations
- manager authentication
- CEO/admin authentication
- UltraTidy
- DBA
- CRM
- current routes
- existing Supabase tables
- existing role behavior

After changes:

compare before/after.

If something unrelated changed unexpectedly:

INVESTIGATE AND FIX IT.

------------------------------------------------------------
AGENT 3 — DATABASE / SUPABASE
------------------------------------------------------------

Inspect the LIVE production schema.

Do not rely only on migration files.

Responsibilities:

- schema inspection
- new additive tables
- new indexes
- RLS
- grants
- functions/RPCs where justified
- role migration
- Free-plan review
- migration safety

If Supabase integration/MCP is available:

USE IT.

Verify project identity before mutation.

Do not guess the production project.

============================================================
SUPABASE FREE PLAN — HARD CONSTRAINT
============================================================

The production project must remain on Supabase FREE.

Do not enable or depend on:

- paid compute
- PITR
- paid backups
- read replicas
- paid storage upgrades
- paid custom domains
- paid log drains
- paid SSO
- paid disk add-ons
- paid Supabase extensions/features

No billing upgrade.

No paid requirement.

If a design would require paid Supabase functionality:

REDESIGN IT.

============================================================
AGENT 4 — PRIMEFIELD OPERATIONS
============================================================

Implement:

- Daily Report
- Operational Requests
- CEO Decision workflow
- manager history
- CEO review
- safe integration with existing V2

Do NOT replace existing farm features.

============================================================
AGENT 5 — PROPERTY MANAGER
============================================================

Build the standalone Property Manager module.

Functional scope:

- properties
- units
- tenancy/occupancy
- rent
- expenses
- vacancies
- maintenance
- repairs
- history
- CEO aggregation

IMPORTANT:

Do NOT visually redesign the Property Manager during this phase.

Use the existing design language professionally.

The mobile UX/UI will be refined later.

============================================================
AGENT 6 — CONTENT MANAGER
============================================================

Build the standalone Content Manager module.

Functional scope:

- content records
- publishing status
- analytics
- leads
- mentorship sales
- affiliate sales
- Instagram priority
- Facebook where free
- TikTok where free
- manual fallback
- CEO aggregation

IMPORTANT:

Do NOT attempt a major visual redesign of Content Manager during this phase.

Use the existing design language professionally.

Mobile UX/UI refinement will come later.

============================================================
AGENT 7 — CEO DASHBOARD
============================================================

Own both:

- CEO Dashboard data integration
- CEO Dashboard visual redesign

This is the only major visual redesign target in this phase.

============================================================
AGENT 8 — UI/UX REVIEW
============================================================

Focus visual-design attention on the CEO Dashboard.

Other operational apps:

review only for usability, consistency and responsiveness.

Do not independently redesign them.

============================================================
AGENT 9 — SECURITY
============================================================

Verify:

- route authorization
- API authorization
- RLS
- role separation
- cross-app isolation
- token security
- admin/CEO privileges
- manager restrictions

============================================================
AGENT 10 — DEBUGGER / BUG HUNTER
============================================================

Continuously test the build.

Find:
- regression bugs
- broken forms
- duplicate records
- stale data issues
- incorrect totals
- auth problems
- routing bugs
- mobile bugs
- schema mismatches
- race conditions
- failed API paths

FIX discovered bugs.

Retest after fixes.

============================================================
PART 1 — PRIMEFIELD DAILY REPORT
============================================================

Add a proper Daily Report to the Farm Manager application.

Do not replace existing farm workflows.

Structure:

FARM 1
- Pond 1
- Pond 2
- Pond 3
- Pond 4
- Water issue

FARM 2
- Tarpaulin Vat 1
- Tarpaulin Vat 2
- Tarpaulin Vat 3
- Mortality
- Water issue
- Pump status

LIVESTOCK
- Goats
- Ram
- Cattle
- Piggery
- Poultry
- Mortality
- Sick animals
- Feed
- Water

CROPS
- flexible freeform report area

PEOPLE
- Workers present
- Supervisor
- Tasks completed

PROBLEMS
- Issues
- Action taken
- CEO decision required? Yes / No

If CEO decision required = YES:

automatically create/link an Operational Request.

Do not require double entry.

============================================================
DAILY REPORT DATA MODEL
============================================================

Do NOT overload farm_daily_records if it remains responsible for day
open/close state.

Use a dedicated daily-report model.

Keep searchable metadata separate.

Use structured JSON only where appropriate and validated.

Must support:

- report date
- manager
- draft/submitted state
- timestamps
- CEO/admin review
- accountability
- history

Do not fabricate legacy reports.

============================================================
PART 2 — PRIMEFIELD OPERATIONAL REQUESTS
============================================================

This is separate from farm_correction_requests.

Correction request:
change a saved record.

Operational request:
ask for approval/action/resource.

Build a dedicated workflow.

Suggested categories:

- purchase
- feed
- veterinary
- repair
- maintenance
- equipment
- staffing
- emergency/problem
- other

Manager:
- submit
- view history
- view status

CEO:
- review
- approve
- decline
- respond
- resolve

Track:
- requester
- timestamps
- category
- description
- linked report
- status
- CEO response
- decision timestamp
- resolution

============================================================
PART 3 — CEO DASHBOARD FUNCTIONAL STRUCTURE
============================================================

Visible name:

CEO Dashboard

Preserve route stability where possible.

Business sections:

BOSSBIMZ
ULTRATIDY
PRIMEFIELD
PROPERTIES

============================================================
BOSSBIMZ CEO METRICS
============================================================

- Followers
- Reach
- Leads
- Mentorship sales
- Affiliate sales
- Content output

Source from Content Manager.

Do not duplicate values manually.

============================================================
ULTRATIDY
============================================================

Bimbo requested no defined KPI yet.

DO NOT INVENT METRICS.

Do not show fake cards.

Create a clean business section without invented numbers.

Existing UltraTidy operations remain unchanged.

============================================================
PRIMEFIELD
============================================================

Requested:

- Revenue
- Expenses
- Cash balance
- Feed inventory
- Fish stock
- Mortality
- Livestock count
- Sales
- Production cost

Reuse authoritative Primefield V2 calculations.

Do NOT create duplicate finance logic.

Do not fabricate Feed Inventory.

Do not fabricate Production Cost.

If exact business meaning is not currently established:

build the supporting architecture where safe,
but do not show a misleading number.

============================================================
PROPERTIES
============================================================

CEO metrics:

- Rent collected
- Expenses
- Vacancies
- Maintenance
- Repairs

Source exclusively from Property Manager data.

============================================================
PART 4 — CEO DASHBOARD VISUAL REDESIGN
============================================================

IMPORTANT:

The attached reference image is the approved VISUAL DIRECTION for the new
CEO Dashboard.

Use the image as DESIGN DIRECTION ONLY.

DO NOT COPY IT LITERALLY.

DO NOT copy:

- its brand
- its logo
- its exact colors
- its exact text
- its course-related content
- its illustrations
- its data

Instead extract:

- layout hierarchy
- information density
- spacing
- visual rhythm
- sidebar proportion
- card treatment
- rounded surfaces
- whitespace
- dashboard composition
- primary/secondary information separation
- activity/schedule-style grouping
- polished modern SaaS presentation

============================================================
CEO DASHBOARD BRAND PRESERVATION
============================================================

Maintain the CURRENT project's:

- color scheme
- logo
- typography
- brand identity

The reference image should influence composition, not branding.

The result should feel like:

"the same product, upgraded substantially"

NOT:

"a completely different product."

============================================================
CEO DASHBOARD DESIGN OBJECTIVE
============================================================

At first glance, Bimbo should immediately notice that the dashboard has been
upgraded.

It should feel:

- cleaner
- more premium
- more organized
- more intentional
- more executive
- easier to scan

But existing users should still recognize the system.

============================================================
CEO DASHBOARD LAYOUT DIRECTION
============================================================

Use the reference to guide:

LEFT SIDEBAR
- clear navigation
- balanced width
- polished active state
- existing project branding

TOP HEADER
- CEO welcome/context
- clean utility actions
- avoid clutter

MAIN CONTENT
- structured business summary zones
- deliberate spacing
- high-value KPIs
- meaningful charts only where real data exists
- good use of vertical/horizontal hierarchy

SECONDARY PANELS
- approvals
- recent activity
- requests requiring CEO action
- useful summaries

Do not put every metric into identical cards.

Use visual hierarchy.

============================================================
CEO DASHBOARD — DO NOT BREAK FUNCTIONALITY FOR DESIGN
============================================================

THIS RULE IS CRITICAL:

If a desired visual change conflicts with an existing production workflow:

PRESERVE THE WORKFLOW.

Adapt the visual design around it.

Do NOT:

- remove working actions because they do not fit the reference
- change backend logic merely to fit a layout
- alter routes for cosmetic reasons
- change record semantics
- change calculations for visual convenience
- change current saved data
- remove existing functionality

The reference image is subordinate to production behavior.

FUNCTIONAL CORRECTNESS WINS OVER VISUAL SIMILARITY.

============================================================
CEO DASHBOARD DATA RULE
============================================================

NO FAKE DATA.

Do not reproduce fake dashboard numbers from the reference.

Every number shown must come from:

- actual application data
or
- a properly empty/unavailable state

No sample:
- revenue
- followers
- rent
- sales
- activity
- percentages
- charts

============================================================
CEO DASHBOARD CHART RULE
============================================================

Only show charts when actual data supports the chart.

No decorative charts.

No fake trends.

No hard-coded series.

If data is insufficient:

use a polished empty state.

============================================================
FIGMA / DESIGN REVIEW
============================================================

If Figma tooling is available:

use the attached CEO Dashboard reference image as input to the UI/UX reasoning.

Use Figma/design review to analyze:

- information hierarchy
- spacing
- layout
- section balance
- card composition
- sidebar
- typography scale
- visual density

Do not recreate the reference exactly.

Use it to develop an adapted design compatible with the current brand.

The final source of truth remains the working React/Next.js implementation.

============================================================
PART 5 — PROPERTY MANAGER
============================================================

Build as a separate domain/module.

At minimum:

PROPERTIES
- identity
- location
- status

UNITS
- property
- unit number/name
- occupancy status

TENANCY
- tenant
- unit
- start/end
- rent
- status

RENT
- amount
- date
- period
- payment method
- recorded_by

EXPENSES
- property/unit
- category
- amount
- date
- notes

MAINTENANCE / REPAIRS
- property/unit
- issue
- category
- status
- priority
- cost
- resolution

Do not overbuild.

Build the smallest complete system that supports Bimbo's operations and CEO
metrics.

============================================================
PROPERTY UI
============================================================

Use the current project design system.

Keep functional UI clean and production-ready.

DO NOT visually overhaul it yet.

No placeholder pages.

Any navigation item created must lead to a working page.

============================================================
PART 6 — CONTENT MANAGER
============================================================

Create a dedicated Content Manager domain.

Track:

- content
- publication
- platform
- links
- performance
- leads
- mentorship sales
- affiliate sales

Platforms:

- Instagram
- Facebook
- TikTok

============================================================
SOCIAL API RULE
============================================================

NO PAID API.

NO PAY-AS-YOU-GO API.

NO THIRD-PARTY PAID SOCIAL AGGREGATOR.

Instagram is priority.

Use official Meta APIs only.

Facebook where free official access permits.

TikTok where free official access permits.

If a metric is not available for free:

MANUAL ENTRY.

============================================================
SOCIAL AUTHORIZATION
============================================================

Do not store Bimbo's social passwords.

Use OAuth.

Bimbo authorizes the account.

Content Manager logs into our app.

Tokens remain server-side and secure.

============================================================
CONTENT UI
============================================================

Use the existing design system.

Do not perform its dedicated redesign now.

Make it clean, complete and mobile-usable.

Dedicated mobile UX/UI will be refined in a later phase.

============================================================
PART 7 — ROLE SEPARATION
============================================================

Preserve existing:

admin
manager

Add safely:

property_manager
content_manager

Do not rename the existing farm manager role.

Farm Manager:
Primefield only.

Property Manager:
Property operations only.

Content Manager:
Content operations only.

Admin/CEO:
supervisory access.

Enforce server-side.

============================================================
PART 8 — DATABASE DOMAIN SEPARATION
============================================================

Keep separate namespaces.

Primefield:
farm_*

Property:
property_*

Content:
content_*
or bossbimbz_content_*

Do not create generic mixed business tables.

Do not put property/content audit records into farm_activity unless there is
an explicit architectural reason.

============================================================
PART 9 — NO PLACEHOLDER POLICY
============================================================

Do NOT ship:

- Coming Soon
- fake metrics
- dummy records
- fake charts
- fake tenants
- fake properties
- fake followers
- fake sales
- lorem ipsum
- dead buttons
- empty navigation routes
- unfinished mock components

If something is unclear:

implement the safe known part
and document the unresolved business question.

============================================================
PART 10 — UI QUALITY RULE
============================================================

Everything built must be production-presentable.

Even though the manager apps are not being visually redesigned yet, they must
still be:

- clean
- responsive
- aligned
- readable
- accessible
- usable on mobile
- visually consistent with the current project

Do not use "redesign later" as an excuse for poor UI.

============================================================
PART 11 — REGRESSION GATES
============================================================

After each major feature slice:

STOP AND VERIFY.

Do not stack large unrelated changes without regression testing.

Required checkpoints:

CHECKPOINT A
Database migration only.

Verify:
- old tables unchanged
- old counts stable
- auth intact
- V2 intact

CHECKPOINT B
Primefield new functionality.

Verify:
- existing Primefield workflows intact

CHECKPOINT C
Property module.

Verify:
- Primefield still intact
- auth still intact

CHECKPOINT D
Content module.

Verify:
- other apps intact

CHECKPOINT E
CEO Dashboard redesign.

Verify:
- dashboard functions preserved
- business data still correct
- navigation intact
- no flow removed

============================================================
PART 12 — TESTING
============================================================

Run:

npm run lint
npm run build

Run existing Primefield V2 suites:

node scripts/test-farm-v2.mjs
node scripts/test-farm-v2-api.mjs
node scripts/test-farm-v2-calculations.mjs
node scripts/test-farm-v2-ui.mjs
node scripts/test-farm-v2-smoke.mjs

Run Playwright.

Add targeted tests for all new functionality.

============================================================
CROSS-ROLE SECURITY TESTS
============================================================

Test explicitly:

farm manager denied property writes
farm manager denied content writes

property manager denied farm writes
property manager denied content writes

content manager denied farm writes
content manager denied property writes

anonymous denied private operational APIs

admin allowed intended supervision

============================================================
CEO DASHBOARD VISUAL QA
============================================================

Review at:

- desktop
- tablet
- mobile

Even though CEO use may be primarily desktop, it must remain responsive.

Check:

- sidebar behavior
- wrapping
- card alignment
- chart sizing
- tables
- activity panels
- request panels
- financial formatting
- long business names
- empty data
- loading data
- errors

Compare the implemented result against the design-direction reference.

Ask:

"Does this visibly feel like a meaningful upgrade?"

If no:

refine it.

But do not compromise production behavior.

============================================================
BUG HUNT
============================================================

Debugger must actively test:

- duplicate submissions
- slow network
- stale state
- bad input
- missing input
- date boundaries
- historical records
- long text
- role bypass
- incorrect totals
- empty states
- broken navigation
- social API failure
- token failure
- mobile overflow
- reload/back behavior

Fix bugs found.

============================================================
FINAL PRODUCTION SAFETY REVIEW
============================================================

Before declaring completion:

Production Safety Agent must compare:

BEFORE
vs
AFTER

for:

- existing Primefield records
- farm totals
- inventory
- fund transfers
- expenses
- sales
- users
- auth
- roles
- UltraTidy
- DBA
- CRM
- routes
- production schema

No unexplained difference is acceptable.

============================================================
FREE PLAN FINAL REVIEW
============================================================

Report:

- new tables
- new indexes
- DB growth
- Storage growth
- Realtime usage
- Edge Function usage
- egress considerations
- social API usage
- paid feature usage

Required:

SUPABASE PAID FEATURES: NONE
PAID SOCIAL API: NONE

============================================================
FINAL REPORT
============================================================

Provide:

1. baseline commit
2. working branch
3. commits
4. files changed
5. migrations
6. tables created
7. indexes
8. role changes
9. Daily Report
10. Operational Requests
11. CEO Dashboard functionality
12. CEO Dashboard visual redesign
13. Property Manager
14. Content Manager
15. social integration status
16. manual fallback
17. bugs discovered
18. bugs fixed
19. security review
20. regression review
21. UI review
22. tests
23. lint
24. build
25. Supabase Free-plan review
26. unresolved business questions
27. external authorizations still required
28. deployment steps
29. rollback/recovery notes

Clearly distinguish:

IMPLEMENTED
TESTED
AWAITING EXTERNAL AUTHORIZATION
AWAITING BUSINESS CLARIFICATION

============================================================
FINAL RULES
============================================================

THIS IS LIVE PRODUCTION.

PRESERVE EXISTING DATA.

PRESERVE EXISTING FLOWS.

PRESERVE EXISTING BUSINESS LOGIC UNLESS THE SPECIFICATION REQUIRES A CHANGE.

DO NOT REBUILD WORKING FEATURES.

DO NOT CHANGE THINGS JUST TO MATCH THE REFERENCE IMAGE.

THE CEO DASHBOARD REFERENCE IS DESIGN DIRECTION ONLY.

KEEP THE CURRENT BRAND COLORS.

KEEP THE CURRENT LOGO.

KEEP THE CURRENT TYPOGRAPHY.

MAKE THE CEO DASHBOARD VISIBLY MORE PREMIUM.

KEEP THE MANAGER APPS FUNCTIONAL AND CLEAN FOR NOW.

DO NOT REDESIGN THEIR UX/UI YET.

KEEP FARM, PROPERTY AND CONTENT DOMAINS SEPARATE.

LET THE CEO DASHBOARD AGGREGATE THEM.

NO FAKE DATA.

NO PAID API.

NO PAID SUPABASE REQUIREMENT.

NO DIRECT PRODUCTION MERGE.

NO AUTO DEPLOYMENT.

ITERATE UNTIL THE FULL GOAL IS ACTUALLY COMPLETE.