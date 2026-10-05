# Bossbimbz operations expansion: requirements and release ledger

Source: complete user specification, `Pasted text.txt` attachment dated October 5, 2026; repository `AGENTS.md`, `tasks/lessons.md`, `tasks/todo.md`, and `docs/PRIMEFIELD-V2-RELEASE.md` are supporting constraints. This ledger tracks the entire authorized expansion, not a deployment approval.

Protected baseline supplied by parent: `574eee3f6358c03707adfb547deb9d289b1aeaf0`.
Working branch supplied by parent: `bossbimbz-operations-expansion`.
Production V2 migrations 012 and 013 are already applied. Never replay them.

Status convention: implementation and verification are separate. `Pending` means no evidence has yet been assessed by the Goal Guardian. Do not infer completion from a file, screenshot, successful build, or another feature's test. Final classifications must distinguish **IMPLEMENTED**, **TESTED**, **AWAITING EXTERNAL AUTHORIZATION**, and **AWAITING BUSINESS CLARIFICATION**. Link precise evidence when changing a status. Synthetic fixtures belong only in isolated tests; they must never become application data.

## Scope, baseline, and safety

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| G01 | Controlled expansion of existing live application; no rebuild, rewrite, prototype, demo, clean slate, or database reset | Pending | Pending |
| G02 | Fetch latest main, verify HEAD, record baseline, use feature branch; incremental slices with tests, final diff, branch push, release report | Pending | Pending |
| G03 | No merge to main or production deployment without explicit release authorization; inspect automatic deployment behavior before push | Pending | Pending |
| G04 | Read AGENTS, lessons, todo, V2 release document, migrations 012/013 completely before implementation | Pending | Pending |
| G05 | Inspect live schema and confirmed project identity, auth, middleware, roles, routes, CEO/admin dashboard, existing farm write boundaries, deployment behavior | Pending | Pending |
| G06 | Preserve existing rows, historical financial values, user IDs/passwords, saved data, routes and working actions; no truncation, deletion, reseeding, unnecessary recreation or historical recalculation | Pending | Pending |
| G07 | Preserve V2 intended behavior and write boundaries; no authorization weakening or unrelated cleanup; add around stable logic | Pending | Pending |
| G08 | Changes affecting production data additive, backward compatible, documented, reversible where practical, and legacy-data tested | Pending | Pending |
| G09 | Only CEO Dashboard deliberately visually redesigned; Farm, Property, Content, UltraTidy, DBA, CRM and public pages retain design language and working flows | Pending | Pending |
| G10 | Goal Guardian continuously tracks completeness, safety, unfinished UI and fake data at every milestone | Pending | Pending |
| G11 | Specialized responsibilities covered: Production Safety/Regression, Database/Supabase, Primefield, Property, Content, CEO, UI/UX, Security, Debugger | Pending | Pending |
| G12 | Supabase Free only: no paid compute, PITR/backups, replicas, storage upgrades, domains, drains, SSO, disk add-ons, extensions/features or billing upgrade | Pending | Pending |
| G13 | No paid/pay-as-you-go social API or paid aggregator; no social passwords; no fake metrics, charts, activity, records, tenants, properties, followers, sales, percentages or lorem ipsum | Pending | Pending |
| G14 | No Coming Soon pages, dead buttons, empty navigation routes, mock components or unfinished UI; implement known safe parts and document uncertainty | Pending | Pending |
| G15 | All new UI clean, aligned, readable, accessible, responsive, mobile-usable and consistent; later redesign is no excuse for poor operational UI | Pending | Pending |

## Primefield Daily Report

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| D01 | Proper Farm Manager Daily Report added without replacing existing workflows | Pending | Pending |
| D02 | FARM 1: Pond 1, Pond 2, Pond 3, Pond 4, water issue | Pending | Pending |
| D03 | FARM 2: Tarpaulin Vat 1, 2, 3; mortality; water issue; pump status | Pending | Pending |
| D04 | LIVESTOCK: goats, ram, cattle, piggery, poultry; mortality, sick animals, feed, water | Pending | Pending |
| D05 | CROPS: flexible freeform report | Pending | Pending |
| D06 | PEOPLE: workers present, supervisor, tasks completed | Pending | Pending |
| D07 | PROBLEMS: issues, action taken, CEO decision required Yes/No | Pending | Pending |
| D08 | Yes automatically creates/links Operational Request with no double entry; retries and edits do not duplicate requests | Pending | Pending |
| D09 | Dedicated report model; do not overload day open/close `farm_daily_records`; searchable metadata separate from validated structured JSON | Pending | Pending |
| D10 | Date, manager, draft/submitted state, timestamps, CEO/admin review, accountability and manager history | Pending | Pending |
| D11 | No fabricated legacy reports, no unintended inventory/financial writes from report observations | Pending | Pending |

## Operational Requests and CEO Decisions

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| R01 | Dedicated operational workflow separate from `farm_correction_requests`; approvals/resources/actions distinct from saved-record corrections | Pending | Pending |
| R02 | Categories: purchase, feed, veterinary, repair, maintenance, equipment, staffing, emergency/problem, other (suggested taxonomy documented) | Pending | Pending |
| R03 | Manager submits, views history and status | Pending | Pending |
| R04 | CEO reviews, approves, declines, responds and resolves | Pending | Pending |
| R05 | Requester, timestamps, category, description, linked report, status, CEO response, decision timestamp and resolution retained | Pending | Pending |
| R06 | Server-side transition/actor validation; no lost decisions, duplicate requests, unaudited changes or manager decision privilege | Pending | Pending |

## CEO Dashboard function and data

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| C01 | Visible name `CEO Dashboard`; preserve routes and existing dashboard actions/functions | Pending | Pending |
| C02 | Four business sections: BOSSBIMZ, ULTRATIDY, PRIMEFIELD, PROPERTIES | Pending | Pending |
| C03 | BOSSBIMZ followers, reach, leads, mentorship sales, affiliate sales, content output sourced from Content Manager, no manual duplicate values | Pending | Pending |
| C04 | UltraTidy clean business section with no invented KPIs/cards/numbers; existing operations unchanged | Pending | Pending |
| C05 | Primefield revenue, expenses, cash balance, feed inventory, fish stock, mortality, livestock count, sales, production cost | Pending | Pending |
| C06 | Reuse authoritative V2 financial calculations; no duplicate finance logic or changed financial semantics | Pending | Pending |
| C07 | Feed Inventory / Production Cost show unavailable if exact meanings/source are unestablished; safe architecture may be added, misleading values prohibited | Pending | Pending |
| C08 | Properties rent collected, expenses, vacancies, maintenance, repairs sourced exclusively from Property Manager | Pending | Pending |
| C09 | Every number derives from actual application data; genuine empty/unavailable states distinguished from zero | Pending | Pending |
| C10 | Charts only for sufficient actual data; no decorative chart, fake trend or hard-coded series; polished insufficient-data state | Pending | Pending |

## CEO visual redesign and review

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| V01 | Obtain and inspect approved reference; use composition direction only, not literal copy | Pending | Pending |
| V02 | Preserve current colors, logo, typography and brand identity; no reference brand, logo, exact colors/text, courses, illustrations or data copied | Pending | Pending |
| V03 | Adapt hierarchy, density, spacing, rhythm, sidebar proportions, cards, rounded surfaces, whitespace, dashboard composition, primary/secondary separation and activity/schedule grouping | Pending | Pending |
| V04 | Clear balanced sidebar, polished active navigation, existing branding | Pending | Pending |
| V05 | CEO welcome/context and clean utility actions in uncluttered top header | Pending | Pending |
| V06 | Structured business zones, deliberate vertical/horizontal hierarchy, high-value real KPIs; avoid identical cards for everything | Pending | Pending |
| V07 | Secondary panels for approvals, recent real activity, requests requiring action and useful summaries | Pending | Pending |
| V08 | Meaningful visible upgrade: premium, organized, intentional, executive, scan-friendly and recognizable to existing users | Pending | Pending |
| V09 | Preserve functions even if design conflicts; no cosmetic route/backend/record/calculation/saved-data changes | Pending | Pending |
| V10 | If Figma available use reference for design reasoning: hierarchy, spacing, layout, section balance, card composition, sidebar, typography scale, density; working Next/React remains truth | Pending | Pending |
| V11 | Desktop, tablet, mobile QA: sidebar, wrapping, card alignment, chart sizing, tables, activity/request panels, financial formatting, long business names | Pending | Pending |
| V12 | Empty, loading and error states reviewed; compare with reference and refine if upgrade insufficient while preserving behavior | Pending | Pending |

## Property Manager domain

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| P01 | Standalone separate module/domain with working navigation, history and CEO aggregation; smallest complete operational system | Pending | Pending |
| P02 | Properties: identity, location, status | Pending | Pending |
| P03 | Units: property, unit number/name, occupancy status | Pending | Pending |
| P04 | Tenancy: tenant, unit, start/end, rent, status; occupancy and vacancies supported | Pending | Pending |
| P05 | Rent: amount, date, period, payment method, recorded_by | Pending | Pending |
| P06 | Expenses: property/unit, category, amount, date, notes | Pending | Pending |
| P07 | Maintenance/repairs: property/unit, issue, category, status, priority, cost, resolution | Pending | Pending |
| P08 | CEO aggregates actual rent, expenses, vacancies, maintenance and repairs consistently; no mixed currencies or duplicated costs | Pending | Pending |
| P09 | Existing project design, clean complete production-ready pages, mobile usable, no visual overhaul/placeholders | Pending | Pending |

## Content Manager and free official social integrations

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| T01 | Dedicated Content Manager module/domain with content records, publishing status, analytics and CEO aggregation | Pending | Pending |
| T02 | Track content, publication, platform, links, performance, leads, mentorship sales and affiliate sales | Pending | Pending |
| T03 | Instagram, Facebook and TikTok platform support; Instagram priority | Pending | Pending |
| T04 | Official Meta APIs only for Instagram; Facebook/TikTok only where free official access permits | Pending | Pending |
| T05 | Working manual entry fallback for any metric unavailable free; report metric provenance and unavailable connected metrics accurately | Pending | Pending |
| T06 | OAuth authorized by Bimbo; Content Manager authenticates to app; no social passwords; tokens secure and server-side | Pending | Pending |
| T07 | Provider permissions, account eligibility and app authorization documented; connection/API/token errors do not manufacture data or break manual operations | Pending | Pending |
| T08 | Existing design system, clean complete mobile-usable UI; no dedicated visual redesign now | Pending | Pending |

## Roles, schema and security

| ID | Requirement / acceptance evidence | Implementation | Verification |
|---|---|---|---|
| S01 | Preserve `admin` and `manager`; add `property_manager` and `content_manager` safely; never rename farm manager | Pending | Pending |
| S02 | Farm manager Primefield only; property manager property only; content manager content only; admin/CEO intended supervisory access | Pending | Pending |
| S03 | Enforce route/API server-side authorization and RLS; protect service-role paths explicitly; preserve existing V2 grants/write guards | Pending | Pending |
| S04 | Namespaces `farm_*`, `property_*`, `content_*` or `bossbimbz_content_*`; no generic mixed-business tables | Pending | Pending |
| S05 | Property/content audit records stay outside `farm_activity` unless explicit architectural justification | Pending | Pending |
| S06 | Supporting additive tables, indexes, grants, validated functions/RPCs where justified; migration preconditions and rollback documented | Pending | Pending |
| S07 | Farm manager denied property writes and content writes | Pending | Pending |
| S08 | Property manager denied farm writes and content writes | Pending | Pending |
| S09 | Content manager denied farm writes and property writes | Pending | Pending |
| S10 | Anonymous denied all private operational APIs; admin allowed intended supervision | Pending | Pending |
| S11 | Security review: routes, APIs, RLS, cross-app isolation, tokens, role separation, manager restrictions and admin privileges | Pending | Pending |

## Mandatory sequential checkpoints

Stop and verify after each major slice; do not stack large unrelated unverified changes. Local migration rehearsal is distinct from applying production migrations, which is not authorized here.

| Gate | Required proof | Implementation | Verification |
|---|---|---|---|
| A | Database migration only: old tables unchanged, old counts stable, auth intact, V2 intact; confirmed live catalog + isolated migration/legacy rehearsal + read-only production comparison | Pending | Pending |
| B | Primefield additions: all existing Primefield workflows intact | Pending | Pending |
| C | Property module: Primefield and auth still intact | Pending | Pending |
| D | Content module: all other apps intact | Pending | Pending |
| E | CEO redesign: dashboard functions preserved, business data correct, navigation intact, no flow removed | Pending | Pending |

## Testing, debugger, and final preservation

| ID | Required execution / evidence | Implementation | Verification |
|---|---|---|---|
| Q01 | `npm run lint` | Pending | Pending |
| Q02 | `npm run build` | Pending | Pending |
| Q03 | `node scripts/test-farm-v2.mjs` | Pending | Pending |
| Q04 | `node scripts/test-farm-v2-api.mjs` | Pending | Pending |
| Q05 | `node scripts/test-farm-v2-calculations.mjs` | Pending | Pending |
| Q06 | `node scripts/test-farm-v2-ui.mjs` | Pending | Pending |
| Q07 | `node scripts/test-farm-v2-smoke.mjs` | Pending | Pending |
| Q08 | Existing Playwright suite; results/retries/failures reported precisely | Pending | Pending |
| Q09 | Targeted tests for every new workflow, aggregate and security boundary, including real-handler/component tests | Pending | Pending |
| Q10 | Debugger: duplicate submissions, slow network, stale state, bad input, missing input, date boundaries, historical records, long text | Pending | Pending |
| Q11 | Debugger: role bypass, incorrect totals, empty states, broken navigation, social API failure, token failure, mobile overflow, reload/back behavior | Pending | Pending |
| Q12 | Debugger: schema mismatches, races, failed API paths, auth/routing bugs, broken forms; discovered bugs fixed and retested | Pending | Pending |
| Q13 | Before/after existing records, farm totals, inventory, fund transfers, expenses and sales | Pending | Pending |
| Q14 | Before/after users, auth, roles, UltraTidy, DBA, CRM, routes and production schema; investigate every unexplained difference | Pending | Pending |
| Q15 | No untested account/session paths represented as tested; isolated/mocked evidence distinguished from authenticated staging and live read-only evidence | Pending | Pending |

## Free-plan final review

| ID | Required reported item | Implementation | Verification |
|---|---|---|---|
| F01 | New tables and indexes, expected DB growth and storage growth | Pending | Pending |
| F02 | Realtime usage, Edge Function usage, egress considerations | Pending | Pending |
| F03 | Social API usage and paid feature usage | Pending | Pending |
| F04 | Explicit `SUPABASE PAID FEATURES: NONE` and `PAID SOCIAL API: NONE`, supported by architecture/config review | Pending | Pending |

## Dependencies and unresolved business meanings

| Item | Safe handling and evidence needed | State |
|---|---|---|
| Approved CEO reference image supplied | User supplied `C:/Users/USER/Pictures/Screenshots/Screenshot 2026-10-05 121245.png`; parent inspected it. Direction: compact dark sidebar, spacious rounded panels, main/secondary grid; retain current teal, branding and fonts. Implementation comparison remains pending | Reference prerequisite satisfied; visual QA pending |
| Live schema / project mapping | Confirm actual Supabase identity through read-only live inspection, current Vercel mapping and baseline fingerprints. Release doc names `gsxqrjywtugeuexrjcln`, but do not assume mapping remains correct | Pending verification |
| Feed Inventory | V2 feed purchases/daily feeding do not alone prove authoritative on-hand inventory. Establish units, receipts, opening stock, consumption, corrections and authoritative source; show unavailable meanwhile | Awaiting business clarification |
| Production Cost | Establish operational expense versus cost allocation, feed/labor/capital inclusion, period, stock/batch basis. Never silently equate it to revenue minus expenses | Awaiting business clarification |
| Cash balance | Reuse V2 funding-separated balances; clarify whether CEO wants owner funds, sales cash or combined, label each truthful known basis | Pending source review |
| Fish stock / livestock count / sales / mortality | Reuse current product registry, active movements/reversals and saved V2 totals; establish units and period; no reconstructed legacy values | Pending source review |
| Property currencies and periods | Establish currency/timezone per property or uniform business setting; never sum unlike currencies. Define rent period, occupancy/status, vacancy and maintenance/repair count/cost basis | Awaiting business clarification |
| Mentorship / affiliate sales | Define count versus gross/net value, currency, attribution and date; allow safe explicit record fields, no guessed financial aggregate | Awaiting business clarification |
| Followers / reach / content output | Distinguish snapshot versus period and platform, overlapping audiences and duplicate imported/manual data; do not silently sum incompatible metrics | Pending source/API review |
| Social authorization | Bimbo authorizes via OAuth; provider app registration/approval, account eligibility, scopes, callback URLs, secrets may remain external gates; manual fallback must work | Awaiting external authorization |
| New manager accounts | Preserve users/passwords; role provisioning documented and restricted to intended admin; account authorization/testing must not fabricate real-account evidence | Pending design review |
| Production migration/deployment | Feature implementation, rehearsal and branch push are in scope; production mutation, main merge and deployment await explicit release authorization | Awaiting release authorization |

## Final report checklist

Each item remains pending until populated with concrete reviewed evidence and explicit implementation/test/authorization/clarification status.

| No. | Required final report item | Status |
|---|---|---|
| 1 | Baseline commit (supplied above; verify against Git) | Pending |
| 2 | Working branch (supplied above; verify against Git) | Pending |
| 3 | Commits | Pending |
| 4 | Files changed | Pending |
| 5 | Migrations | Pending |
| 6 | Tables created | Pending |
| 7 | Indexes | Pending |
| 8 | Role changes | Pending |
| 9 | Daily Report | Pending |
| 10 | Operational Requests | Pending |
| 11 | CEO Dashboard functionality | Pending |
| 12 | CEO Dashboard visual redesign | Pending |
| 13 | Property Manager | Pending |
| 14 | Content Manager | Pending |
| 15 | Social integration status | Pending |
| 16 | Manual fallback | Pending |
| 17 | Bugs discovered | Pending |
| 18 | Bugs fixed | Pending |
| 19 | Security review | Pending |
| 20 | Regression review | Pending |
| 21 | UI review | Pending |
| 22 | Tests (commands, outcomes, scope and limitations) | Pending |
| 23 | Lint | Pending |
| 24 | Build | Pending |
| 25 | Supabase Free-plan review | Pending |
| 26 | Unresolved business questions | Pending |
| 27 | External authorizations still required | Pending |
| 28 | Deployment steps; do not execute without release authorization | Pending |
| 29 | Rollback/recovery notes; preserve data, audit and V2 compatibility | Pending |

## Milestone audit log

Initial inventory: full specification mapped; all implementation/testing claims remain pending. Approved reference supplied and inspected by parent; final implementation/reference comparison remains pending. External OAuth/release gates and business meanings remain recorded. At every milestone answer: **What remains before the full goal is actually satisfied?** The parent must resolve gaps or explicitly report the necessary external/business gate; neither unavailable credentials nor a successful build justifies declaring the entire goal complete.
