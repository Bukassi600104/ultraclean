# Bossbimbz operations expansion — active implementation plan

Baseline: 574eee3f6358c03707adfb547deb9d289b1aeaf0 (released Primefield V2).
Branch: bossbimbz-operations-expansion. Production remains untouched in this phase.
Combined source specifications: docs/BOSSBIMBZ-SPEC.md and docs/BOSSBIMBZ-ADDENDUM.md. Requirement ledger: docs/BOSSBIMBZ-REQUIREMENTS.md. This is one continuing goal; the October 7 confirmed rules supersede earlier ambiguity.

## Preservation and release boundary

Do not replay or weaken migrations 012/013. Preserve existing accounts, URLs, records, financial meanings and operational designs. New SQL is prepared/rehearsed against isolated data; a coordinated live migration/release needs fresh authorization. No merge to main or production deployment. Disable automatic deployments for this feature branch before pushing it. Supabase stays Free; no paid social APIs. No fabricated metrics or records.

## Checkpoints and deliverables

- [x] Fetch main, record baseline, read repository and V2 release instructions, create feature branch.
- [x] Read full specification and approved CEO composition reference.
- [x] A — read-only live schema/roles/grants/Free-plan baseline; additive migration rehearsal and preservation tests (308 foundation + 47 addendum SQL assertions; final independent review passed).
- [x] Shared access — add property_manager/content_manager without renaming admin/manager; preserve farm guards; real guard/middleware role tests (31 guards, 73 middleware checks).
- [x] B — reconcile Daily Report and requests with October 7 confirmed fields, repeated sick animals, action-taken metadata and water/pump request categories; keep verified draft/review/retry foundation.
- [x] Feed — inspect live legacy bag/unit completeness read-only; build prospective movement-based bags with authorized opening counts, atomic receipts/new-bag use and daily-feed/report linkage; never infer legacy opening quantities.
- [x] C — complete Property Manager properties/units/tenancies/rent/expenses/vacancy/maintenance/repair/history and CEO data; isolated role/finance/UI regression.
- [x] D — complete Content Manager records/publication/performance/leads/mentorship/affiliate data and manual fallback; isolated role/aggregate/UI regression.
- [x] Social — free official Meta Instagram first, Facebook/TikTok where documented access permits; server-only OAuth/encrypted tokens and honest authorization/configuration states.
- [x] E — CEO Dashboard data integration and composition redesign only; retain all CRM/appointment/DBA/UltraTidy actions and links; no guessed farm KPIs.
- [x] UI review — desktop/tablet/mobile, actual data/empty/loading/error states, accessible forms, long text and navigation.
- [x] Security/bug hunt — all cross-role API/RLS denials, duplicate/stale/bad input/date/offline paths, tokens/provider failures, totals and historical records.
- [x] Final tests, lint, build and full preservation/diff review; document exact evidence.
- [x] Commit incremental verified slices, push feature branch with automatic deployment disabled, prepare all 29 release report items.

## Accepted implementation rulings

- Dedicated modules use /property and /content paths with their own login/layout/access guards; existing domains/routes keep behavior. Optional new subdomains require external DNS authorization and are not assumed.
- New property/content records require explicit ISO currency; CEO financial summaries group currencies rather than converting or mixing them.
- Farm finance reuses getFarmFinance. Separate owner funds and sales cash; no invented combined wallet. Feed Inventory means authoritative bags by feed type, established by authorized real opening counts. Production Cost is the same as Expenses and must be removed as a separate metric/model.
- Content follower metrics use latest platform-level snapshots; reach is labelled with its measurement period/source, never claimed as deduplicated people. Social access requires CEO/provider OAuth authorization; complete manual tracking works independently.
- Reference influences composition, not color/content. Reference path: C:/Users/USER/Pictures/Screenshots/Screenshot 2026-10-05 121245.png.
- User explicitly requires specialized agents; delegate disjoint ownership in waves within available concurrency. Test and review each integrated slice before treating its checkpoint complete.

## Execution ledger

2026-10-07 combined-goal reconciliation: KEEP safe schema/access/property/content/CEO composition and audited requests. ADJUST every pond/vat to Water Quality, Mortality, Feed and General Remarks; keep separate animal groups; replace the single sick-animal note with repeatable affected-animal records. ADJUST feed from supplies display to authoritative prospective bags with real opening authorization and one bag-use source linked to daily activity. ADJUST linked requests to retain issue, action taken, submitter/date/time and water/pump categories. REMOVE the separate unavailable Production Cost display/model. All listed business approvals and template questions are CONFIRMED, not awaiting clarification. Earlier completed checks remain evidence of the baseline, not proof that the addendum is complete. No production migration or deployment is authorized.

2026-10-05: Baseline fetched and clean; feature branch created. Goal Guardian, Production Safety and Database/Supabase agents started. Live Supabase identity confirmed read-only; database about 14.8 MB. Free organization confirmed by database agent. Production mutations: none. Existing auth has only admin/manager and needs additive landing/route guards for new roles.

2026-10-05 checkpoint A: Three CLI-allocated additive migration slices rehearsed; parent independently reran all 306 PostgreSQL assertions. Legacy rows/profiles/V2 routines unchanged; new RLS/direct-write/retry/revision/audit/currency/occupancy/token boundaries checked. Real shared guards pass31 and middleware pass73; lint clean for this slice. Approved image supplied and inspected. CEO aggregation calculation and actual-handler/real-guard tests pass, including501 rent rows and partial query errors. Farm first-save revision0 issue found by security and fixed by owner. Property and Content specialists implementing disjoint modules; no production changes or deployment.

2026-10-05 checkpoint B: Farm specialist passed API34 and styled actual-component browser24 checks, including lost-response/reload retry UUID protection. Existing V2 SQL67/API38/calculations11/UI19/GET smoke13 pass. Parent inspected the styled mobile report screenshot: legible full sections and no horizontal overflow. Admin sidebar links will land with the CEO slice. Content social reauthorization required a safe server-only token ID/revision lookup; added and isolated tested without revealing ciphertext. No production writes.

---

Closing verification October 7: combined source implementation853a5ad, report74/feed26/property38/content51/CEO35 browser checks; guard31/middleware73/domain60; foundation308/feed47/V2SQL67; real PostgreSQL multi-connection16; originalV2API38/finance11/mobile19; publicPlaywright81/81; GET smoke13+23; lint/build116 all pass. Read-only live V2 body hashes match protectedmigration012; roles3admin2manager,policies25,expansiontables0. All29 release report items are covered in docs/BOSSBIMBZ-RELEASE.md. Production/OAuth/count entry remain separately gated. Protected feature push verified at7860f0b: remote branch matches local, remote main remains574eee3, Vercel feature deployments0 and existing main deployment unchanged. Final documentation confirmation follows; no application source change.

## Archived previous work

# Primefield Farm V2 — implementation checklist

Preserve production data and accounts. No production migration, push, or deployment is authorized.

- [x] Capture read-only schema/baseline and document migration/release gates.
- [x] Implement forward-only schema, transactional writes, audit and correction requests.
- [x] Enforce role permissions, immutable closed days, and offline conflict handling.
- [x] Correct prospective sales pricing and linked inventory movements; preserve legacy totals.
- [x] Consolidate products, add cattle, refine inventory and mortality.
- [x] Extend supplies correction/archive/history and owner transfer correction/void.
- [x] Unify full-scope financial aggregation and expense funding selection.
- [x] Run lint, build, isolated farm tests and regression checks.
- [x] Document results, outstanding release gates and rollback limitations.

## Accepted decisions

Managers request corrections after save; Bimbo applies audited corrections, including closed-day corrections without reopening. Feed remains owner-funded. Historical values and unknown attribution remain untouched.

## Local verification and release gates

- PostgreSQL (isolated, synthetic data): 63 assertions pass.
- Farm API handlers (mocked auth/transport): 38 checks pass.
- Financial/mortality calculations: 11 checks pass.
- Actual React components in a mobile browser with synthetic APIs: 19 checks pass.
- Built application GET smoke checks: 13 pass. Primefield Host returned a production-domain redirect; staging domain verification remains required.
- Public Playwright suite: 80/81 pass initially; first homepage cold-load timing exceeded 8 seconds. Targeted rerun passed (2.4 seconds). No public code changed.
- Lint and the final production build pass.
- Final live comparison: all 11 table fingerprints and row counts match the initial read-only baseline.
- Local implementation initially left production untouched. The complete live frontend/backend release was subsequently authorized on October 3, 2026; see the production evidence below and the release document.

### Authorized production release — October 3, 2026

- [x] Confirm the existing Vercel production project and Supabase environment mapping.
- [x] Save private complete database archives and restore the 56 application/auth/storage tables locally.
- [x] Rehearse migration and verify legacy values, existing restored profiles and genuine multi-connection write/close/retry behavior.
- [x] Build the compatible production deployment before assigning live domains.
- [x] Pause farm writes, capture a fresh backup/baseline, and apply forward-only migrations 012 and 013.
- [x] Block old service-role direct farm writes while preserving trusted V2 RPCs and reads; 67 isolated SQL assertions pass.
- [x] Promote V2; verify live domain pages/assets, REST schema/permissions, financial aggregation and all 56 legacy table fingerprints.
- [x] Remove the temporary farm-write pause after successful checks; keep the permanent write boundary.
- [x] Push the released source and release evidence to main, then verify the resulting deployment (`87bfdc0`, production deployment `dpl_4k5jBGV7BnzhMgRcFtYMfVXsY4xt` ready on all live domains).

Interactive existing-user browser login/submission was not automated in production. Supabase-managed realtime/vault infrastructure was archived but not emulated during the local application/auth/storage restore.

See docs/PRIMEFIELD-V2-RELEASE.md for schema drift, migration effects, test reproduction, release sequence and rollback restrictions.

## Previous completed task

# Instant Quote System — Implementation Plan

## Goal
Build a multi-step "Instant Quote" wizard modeled after ultratidycleaning.com's booking type system.
Called "Instant Quote" — placed in strategic CTAs on Hero, Services, CTASection, and a dedicated /quote page.

## Files to Create
- [ ] `components/quote/InstantQuoteWizard.tsx` — 4-step pricing wizard
- [ ] `app/(public)/quote/page.tsx` — Dedicated quote page

## Files to Modify
- [ ] `components/home/HeroSection.tsx` — Replace "Get Free Quote" with "Get Instant Quote" → /quote
- [ ] `components/home/CTASection.tsx` — Add "Get Instant Quote" primary button → /quote
- [ ] `components/services/ServiceCard.tsx` — Update all 3 variants CTA → /quote?service=...

## Wizard Steps
1. **Service Type** — 8 cards (residential, commercial, deep-cleaning, move-in-out, post-construction, airbnb, restaurant-cafe, clinic-medical)
2. **Property Details** — Dynamic based on service:
   - Home-based (residential/deep/move-in-out): bedrooms, bathrooms, frequency (residential only), property type
   - Post-construction: sq footage range
   - Commercial: space type, sq footage range
   - Airbnb: bedroom count
   - Restaurant/Clinic: size category
3. **Add-Ons** — Only for residential, deep, move-in-out (oven, fridge, windows, laundry, basement, garage, wall washing)
4. **Your Details** — Name, email, phone, preferred date, notes — shows live price

## Pricing Matrix
### Residential ($150+)
- 1 BR: $150 | 2 BR: $200 | 3 BR: $265 | 4 BR: $330 | 5+ BR: $415
- +$30 per extra bathroom above 1
- Frequency: weekly -15%, bi-weekly -10%, monthly -5%

### Deep Cleaning ($250+)
- 1 BR: $250 | 2 BR: $325 | 3 BR: $410 | 4 BR: $500 | 5+ BR: $600
- +$50 per extra bathroom above 1

### Move-In/Move-Out ($250+) — same as Deep Cleaning
### Post-Construction ($250+)
- Under 1,000 sq ft: $350 | 1,000–2,000: $500 | 2,000–3,000: $650 | 3,000+: Custom

### Commercial ($200+)
- Under 1,000 sq ft: $200 | 1,000–2,500: $350 | 2,500–5,000: $550 | 5,000+: Custom

### Airbnb ($150+)
- Studio/1 BR: $150 | 2 BR: $200 | 3 BR: $260 | 4+ BR: $320

### Restaurant/Café ($200+)
- Under 1,000 sq ft: $250 | 1,000–2,500: $400 | 2,500+: Custom

### Clinic/Medical ($250+)
- Under 1,000 sq ft: $300 | 1,000–2,500: $480 | 2,500+: Custom

### Add-Ons
- Inside oven: +$30 | Inside fridge: +$25 | Interior windows: +$40
- Laundry (wash & fold): +$30 | Basement: +$50 | Garage: +$40 | Wall washing: +$35

## Data Flow
- Wizard collects data → formats into contactFormSchema payload
- Submits to existing POST /api/submit-lead
- Price estimate + add-ons included in specialRequests field
- No new DB table needed — uses existing `leads` table

## Progress
- [x] InstantQuoteWizard component (`components/quote/InstantQuoteWizard.tsx`)
- [x] /quote page (`app/(public)/quote/page.tsx`)
- [x] HeroSection CTA → "Get Instant Quote" → /quote
- [x] CTASection → "Get Instant Quote" → /quote
- [x] ServiceCard all 3 variants → "Get Instant Quote" → /quote?service=...
- [x] Header nav button → "Get Instant Quote" → /quote
- [x] Build: clean, 0 errors, 0 warnings

## Status: COMPLETE ✓
## Bossbimbz production activation — October 9, 2026

- [x] Explicit production authorization received October 8.
- [x] Fresh private backup restored; original 59 application/auth/storage tables preserved through isolated migration rehearsal.
- [x] Four additive production migrations installed through Supabase plugin; existing 24 public-table fingerprints preserved.
- [x] Compatible Vercel deployment promoted; live login pages, PWA assets and anonymous access restrictions verified.
- [x] Farm-write pause removed; fresh plugin check confirms zero pause triggers and five existing profiles.
- [x] Separate Property/Content mobile installation prompts, identities and scoped network-only workers verified.
- [x] GitHub main synchronized; automatic production deployment reached READY with all branded domains and no alias error.
- Operational setup: enter actual feed opening counts; configure/authorize social providers for automatic synchronization. Manual content tracking is available. No accounts or business test records were fabricated.

## Farm livestock corrections — October 17, 2026

- [x] Confirm goat category order, cattle Stocker/Feeder wording and all turkey stages for both sexes.
- [x] Implement shared classifications, linked deductions, audited allocation/transfer and legacy Unclassified balances.
- [x] Pass isolated ledger/concurrency, API, styled browser and existing farm/feed/CEO/account checks; lint and production build pass.
- [x] Restore private production backup and rehearse additive migration, preserving 82 original tables.
- [x] Apply approved migration and promote compatible production build; preserve all 47 original public tables, five auth users, stock quantities and source routines.
- [x] Pass 16 live GET checks and remove the farm-write pause; zero pause triggers confirmed.
- Existing stock is not guessed or reclassified. Bimbo can allocate verified quantities through the admin inventory category controls.

## Dashboard audit remediation — 27 October 2026

- [x] Production/read-only baseline and isolated workspace.
- [x] Consistent navigation and sidebar selection.
- [x] History filters, complete financial summaries, currency and expense pagination.
- [x] All-business read-only analytics and stacked CEO sections.
- [x] Isolated regressions, independent review and production build.
- [x] Approved Git push, Vercel release, live verification and rollback evidence.
- Missing business records remain untouched by user instruction.

- Release evidence: docs/superpowers/plans/2026-10-27-dashboard-remediation-release.md. Existing 84 tables and all seven accounts unchanged; missing records remain untouched. Authenticated live walkthrough remains pending sign-in.

## 2026-10-28 Dashboard audit corrections
- [x] Baseline and reproduction
- [x] Mortality scopes
- [x] Exact accounting and reconciliation
- [x] Back navigation and layout
- [x] Form accessibility
- [x] Account UI harness
- [x] Verification, review and approved release
- [x] Internal CEO Properties and Content reports (user addendum), authoritative data and unchanged manager app routes.
- Independent review: original and addendum Important findings reproduced before fixes; no deferred Minor findings. Exact-money, mortality, account, role/API and backup restore evidence retained in the release report.
- Production verification: all49 application tables unchanged,8 accounts retained; live internal CEO links and Back work. Public81 and liveGET17 PASS; staged/activated deployment dpl_1JvdMfEuENcQa9N2fWjob7jRHcdC on512d473. Final main push/build metadata retained in private release evidence.
- Release report: docs/superpowers/plans/2026-10-28-dashboard-audit-corrections-release.md. Missing records remain untouched; the temporary tester remains active.

## Manager handover, individual reporting and funds custody — 28 October 2026

- [x] Read-only account, attribution, finance, inventory, permission and offline-queue audit.
- [x] Confirm legacy Excel eligibility: Farm Manager and Emmanuel Adeolu only; exclude Tony and future accounts.
- [x] Complete independent design review and resolve both funding-policy questions with the user.
- [x] Write and self-review the implementation plan against the reviewed design and confirmed policies.
- [x] Complete plan approved by user on 28 October 2026.
- [x] Implement individual reporting/access and account-scoped offline handling.
- [x] Implement farm inventory handover without inserting opening stock or changing existing quantities.
- [x] Simplify Feed Inventory: compact table, manager-led dated starting/received/opened entries in a centred dialog, synchronized CEO oversight, optional non-blocking review and no double stock when pending costs resolve.
- [x] Implement linked funds custody/receipts and exact reconciliation.
- [x] Make CEO the all-business activity, reconciliation and approval control centre; check every sidebar/nested layout and centred form/dialog using actual data and truthful empty/error states only.
- [x] Implement the two eligible accounts' genuine XLSX exports.
- [x] Restore/rehearse additive migrations and run account, isolation, funds/concurrency, export and workflow tests.
- [x] Release only the verified compatible application/schema, with preservation comparisons and rollback evidence.

Current stage: approved application/schema and security cutover are live. All49 original business-table fingerprints and eight original profiles/Auth identities/passwords are preserved. Signup is closed; exposed legacy API and bearer tokens are rejected; current ES256 sign-in key remains unchanged. Final main-branch deployment identity and follow-up read-only checks are retained in the private release manifest.

Task 6A evidence: docs/superpowers/plans/2026-10-28-ceo-layout-verification.md. Read-only route checks use actual pages and house components; synthetic boundary fixtures remain isolated from runtime.

Task 7: SQL24, actual XLSX40, API35, export UI13 and existing CEO report UI14 passed; TypeScript/lint clean. Own frozen-lock install and scoped dependency patches retain all original entries/versions. See docs/superpowers/plans/2026-10-29-legacy-export-validation.md. Production remains unchanged.

Task 8 verified: lint, production build and sequential generated TypeScript checks pass;81 unchanged public browser tests pass;62 explicitly isolated suites are verified across execution groups, with affected regressions rerun after review fixes. CEO matrix144 across32pages, operational Back links87, actual provider14, fundsUI36, reportUI19, feedUI41 and XLSX SQL24/workbook40/API35/UI13 are covered. Full original84table fingerprints survive all8migrations/activation and coordinated pause/resume. Real two-connection PostgreSQL races13 pass. Independent review’s3findings plus movement-date follow-up are resolved. See docs/superpowers/plans/2026-10-29-manager-handover-release.md for exact boundaries, security release conditions and rollback limits.

## Authorized production and credential cutover, 29 October 2026

- [x] Fresh private backup, original-row/column baseline and eight-profile catalog.
- [x] Disable public signup only, preserving other Auth settings.
- [x] Create and read-only verify replacement publishable/server keys; remove embedded keys and block remote ad-hoc Auth tests.
- [x] Stage compatible production configuration/application; apply eight reviewed additive migrations under the named Farm pause.
- [x] Promote, activate, retire legacy API keys and verify old-key rejection, original records/accounts and branded routes.
- [x] Resume guarded Farm writes and record exact deployed source/evidence.

## Primefield Farm remote oversight reference — 30 October 2026

- [x] Read and visually inspect all four PDF pages; compare the deployed-source baseline and existing Farm/CEO workflows without live writes.
- [x] Prepare the proposed preservation-first plan at docs/superpowers/plans/2026-10-30-primefield-pulse-alignment.md.
- [x] Use Computer Use to inspect all eight owner and five manager demo sections on desktop and phone widths; document actual controls, forms, layout, styles, navigation limitations and full-version claims separately.
- [x] Add screenshot evidence and the demo adaptation report at docs/superpowers/reports/2026-10-30-pulse-demo-audit.md; refine the proposed plan for the requested visual direction, mobile access, credit terms in days and oldest-first receipt allocation without copying prototype accounting assumptions.
- [x] Verify all report links and 60 cropped UI captures; render and visually inspect the 16-page companion at output/pdf/2026-10-30-pulse-farm-demo-visual-audit.pdf. Browser phone emulation only; backend transactions, physical devices and full-version services remain unverified. Research changed documentation only.
- [x] User approval of the updated implementation plan, including manager-only Farm app, CEO-only oversight and multiple manager accounts.
- [ ] Implementation in progress: verify baseline and isolated restore, then complete the ten linked phases. Production release still requires the plan's explicit release approval.
- [x] Verified live preconditions and linked named sites/batches in isolation, retaining legacy quantities and manager boundaries.
- [x] Private photographs, durable offline media, batch daily logs, mortality proof and recorded questions/replies implemented and checked in isolation.
- [x] Structured purchasing approvals, actual payments and confirmed/partial deliveries.
- [x] Egg store, all-store physical counts/decisions and defensible feed-coverage estimates.
- [x] New sale invoices, actual receipts, credit/part-payments and customer debt reconciliation across Farm and CEO.
- [x] Health schedules/proof and measured batch performance with transparent unknown/unallocated values.
- [ ] CEO urgent controls, report exports, configured summaries and timezone/display-currency support.
- [ ] Consistent mobile/PWA experience, optional scoped support access/additional sites and staff handover.
- [ ] Isolated tests, restoration rehearsal, preservation evidence and explicit approval before any production migration/deployment.

Implementation is local on codex/primefield-pulse. Production settings, records, accounts, figures and deployment remain unchanged for this request. The reference's spending approval concerns purchases; consuming already-held feed remains separate. Existing special historical exports and clean personal manager periods remain protected.

- [x] Pulse Task4 purchasing implemented locally: separate approvals/payments/deliveries, funding review, immutable reports, safe receipt links and complete financial totals; isolated regression and preservation evidence recorded.
- [ ] Pulse Tasks5�10: stores/eggs/counts, sales credit/receipts, health/performance, CEO reporting/configuration, full visual adaptation and final release verification.

- Pulse Task8: CEO control/reporting and opt-in summaries implemented locally; targeted SQL/API/UI tests pass. No production changes. Remaining: Task9 interface/access, Task10 full release gates.


## Pulse final implementation verification
- [x] Task9 manager mobile navigation, batches, corrections and limited support access
- [x] Independent whole-branch review and targeted refund/photo fixes
- [x] Final production build, complete regression and preservation rehearsal
- [ ] Approved coordinated production release (separate approval required)
