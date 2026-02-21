# UltraTidy — Next Steps (Quick Reference)

> **Purpose:** Start here at the beginning of every session. No codebase scanning needed.
> **Last updated:** 2026-02-21 (session 2)

---

## Current Status: All Code Complete — Infrastructure Wiring Remaining

The codebase has zero unfinished features. Everything left is environment configuration, database setup, and deployment.

---

## Three Applications in this Repo

| App | Route Group | URL | Status |
|-----|-------------|-----|--------|
| **Public Website** | `(public)` | `ultratidy.ca` | Code done, not on real domain yet |
| **Admin Dashboard** | `(dashboard)` | `leads.ultratidy.ca` | Code done, new tables needed |
| **Farm Manager Portal** | `(manager)` | `farm.ultratidy.ca` | Code done, not on real domain yet |
| **Primefield Landing Page** | `(primefield)` | `ultratidy.ca/primefield` | Standalone page, complete |
| **DBA Course Registration** | `(register)` | `ultratidy.ca/register` | Standalone page, needs Stripe keys |

---

## Step-by-Step Checklist

### STEP 1 — Supabase: Create `appointments` table
**Status: ✅ DONE** (table confirmed live 2026-02-21)

The `appointments` table exists and RLS policies are active. The `/book` page and `/dashboard/appointments` are fully wired.

---

### STEP 2 — Supabase Storage: Create `config` bucket
**Status: ✅ DONE** (bucket confirmed live 2026-02-21)

The `config` bucket exists (private) with `dba-settings.json` initialised (empty Stripe Price ID). The DBA Courses page in the dashboard is ready to receive a Stripe Price ID.

---

### STEP 3 — Environment Variables: Add missing keys ⬅ DO THIS NEXT
**Status: NOT DONE**

Add these to `.env.local` (local dev) and Vercel dashboard (production):

**a) Stripe** — for DBA course registration payments
- Stripe account at https://dashboard.stripe.com
- Get Secret Key: Developers → API keys → `sk_live_...` (or `sk_test_...` for testing)
- Get Webhook Secret: after registering the webhook (see Step 4b)
- Add to env: `STRIPE_SECRET_KEY=` and `STRIPE_WEBHOOK_SECRET=`

**c) Cron Secret** — protects the email automation cron endpoint
- Generate any random string (e.g., `openssl rand -hex 32`)
- Add to env: `CRON_SECRET=`
- Add same value to Vercel dashboard → Settings → Environment Variables

---

### STEP 4 — Stripe Setup (for DBA Course Registration)
**Status: NOT DONE** (depends on Step 3b)

a) Create a product in Stripe:
   - Go to https://dashboard.stripe.com/products
   - Create new product (e.g., "Digital Boss Academy — Business Course")
   - Add a price (one-time, in CAD)
   - Copy the Price ID (starts with `price_`)

b) Register the Stripe webhook:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://ultratidy.ca/api/stripe-webhook`
   - Select event: `checkout.session.completed`
   - Copy the signing secret → add as `STRIPE_WEBHOOK_SECRET`

c) In the Admin Dashboard → Courses page:
   - Paste the Price ID and click Save
   - Test by visiting `/register` — form should appear with payment button

---

### STEP 5 — Custom Domain Setup on Vercel
**Status: NOT DONE**

1. Go to Vercel project: `bukassi-gmailcoms-projects/ultratidy`
2. Settings → Domains → Add `ultratidy.ca` as primary
3. Add `leads.ultratidy.ca` and `farm.ultratidy.ca` as aliases
4. Configure DNS at domain registrar:
   ```
   A record:    ultratidy.ca         → 76.76.21.21
   CNAME:       www.ultratidy.ca     → cname.vercel-dns.com
   CNAME:       leads.ultratidy.ca   → cname.vercel-dns.com
   CNAME:       farm.ultratidy.ca    → cname.vercel-dns.com
   ```
5. Wait for DNS propagation (up to 24 hours)

---

### STEP 6 — Vercel Environment Variables (Production)
**Status: NOT DONE** (do after Step 3)

Push all env vars from `.env.local` to Vercel:
- Go to Vercel → Project → Settings → Environment Variables
- Add: all vars from `.env.local` + the new ones from Step 3
- Redeploy after adding vars

---

### STEP 7 — Extend Playwright Tests
**Status: NOT DONE** (lowest priority, do last)

Current: 81 tests covering the Phase 1 public site only.
New pages that need smoke tests:
- `/book` — booking form submission
- `/primefield` — page loads, contact form visible
- `/register` — shows "not available" gracefully when Stripe not configured
- `/dashboard` — loads login redirect for unauthenticated users

---

## What Does NOT Need Code Changes

Everything below is already fully built:
- All 7 public website pages + legal pages (incl. Meet the Team on About page)
- Admin dashboard: leads, appointments, blog CMS, DBA products, DBA sales, farm overview (with mortality card), farm inventory (tabbed Stock/Mortality view), courses, settings
- Farm manager portal: sales, expenses, inventory (with mortality date tracking), cash (offline-capable)
- Primefield landing page + contact form
- DBA course registration + Stripe checkout
- All API routes (13 endpoints incl. farm inventory transaction GET)
- Email automation cron (6 templates, CASL compliant)
- Supabase Auth + role-based middleware
- Rate limiting (Upstash Redis)

### Pending DB migration (run in Supabase SQL editor):
```sql
-- Migration 009: Add date column to farm_inventory_transactions
ALTER TABLE public.farm_inventory_transactions
  ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT current_date;
CREATE INDEX IF NOT EXISTS idx_farm_inv_tx_date
  ON public.farm_inventory_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_farm_inv_tx_action
  ON public.farm_inventory_transactions(action);
```

---

## Known Good: Already Wired Up Locally

These env vars are set in `.env.local` and working:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `RESEND_API_KEY` ✅
- `ADMIN_EMAIL` ✅
- `NEXT_PUBLIC_SITE_URL` ✅
- `UPSTASH_REDIS_URL` ✅
- `UPSTASH_REDIS_TOKEN` ✅

Missing locally + on Vercel:
- `STRIPE_SECRET_KEY` ❌
- `STRIPE_WEBHOOK_SECRET` ❌
- `CRON_SECRET` ❌
