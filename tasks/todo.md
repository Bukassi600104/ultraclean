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
