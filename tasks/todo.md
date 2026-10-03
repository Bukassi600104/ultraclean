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
- [ ] Push the released source and release evidence to main, then verify the resulting deployment.

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
