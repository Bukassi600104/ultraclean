# UltraTidy Website — CLAUDE.md

## Project Overview

UltraTidy Cleaning Services website for Mrs. Bimbo Oyedotun (BossBimbz), based in Toronto, Canada. This is a monorepo Next.js application serving three applications via route groups and subdomains:

1. **Public Website** (`ultratidy.ca`) — Marketing site with services, gallery, blog, contact form
2. **Admin Dashboard** (`leads.ultratidy.ca`) — Lead management, blog CMS, farm data overview
3. **Farm Manager Portal** (`farm.ultratidy.ca`) — Input-only forms for farm operations (Primefield, Ibadan, Nigeria)

**Tagline:** "It's not clean until it's ULTRACLEAN!"

**Three businesses under one umbrella:** UltraTidy (cleaning), Digital Boss Academy/DBA (online education), Primefield (agri-business). The dashboard handles leads from all three; the public site is UltraTidy only.

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **React Hook Form** + **Zod** (validation)
- **TipTap** rich text editor (extensions: StarterKit, Image, Link)
- **sonner** for toast notifications
- State management via React Context + hooks

### Backend / Infrastructure
- **Supabase** — PostgreSQL, Auth, Storage, Row Level Security, Real-time subscriptions
- **Resend** — Email API (free tier: 3,000/month)
- **Cloudinary** — Image CDN (free tier: 25GB storage + 25GB bandwidth)
- **Upstash Redis** — Rate limiting (`@upstash/ratelimit` + `@upstash/redis`)
- **Vercel** — Hosting (auto-deploy from GitHub)

### Development Tools
- **npm** (package manager)
- **ESLint** + **Prettier** (linting/formatting)
- **Vitest** (unit tests) + **Playwright** (E2E tests)
- **Git** + **GitHub** (version control)

---

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint + Prettier
npm test             # Unit tests (Vitest)
npx playwright test  # E2E tests (Playwright)
```

### Deployment Flow
```
git push -> GitHub -> Vercel auto-deploys to staging -> merge to main -> Vercel deploys to production
```

---

## Project Structure

```
app/
├── (public)/                # Public website routes
│   ├── page.tsx             # Homepage
│   ├── services/page.tsx
│   ├── gallery/page.tsx
│   ├── about/page.tsx
│   ├── contact/page.tsx
│   ├── blog/page.tsx
│   └── blog/[slug]/page.tsx
├── (dashboard)/             # Admin dashboard (protected)
│   ├── dashboard/page.tsx
│   ├── leads/page.tsx
│   ├── leads/[id]/page.tsx
│   ├── farm/page.tsx
│   ├── farm/sales/page.tsx
│   ├── farm/expenses/page.tsx
│   ├── farm/inventory/page.tsx
│   ├── blog/page.tsx
│   ├── blog/new/page.tsx
│   ├── blog/edit/[id]/page.tsx
│   └── settings/page.tsx
├── (manager)/               # Farm manager portal (protected, input-only)
│   └── manager/
│       ├── sales/page.tsx
│       ├── expenses/page.tsx
│       ├── inventory/page.tsx
│       └── cash/page.tsx
├── api/
│   ├── submit-lead/         # POST — public contact form
│   ├── leads/               # GET/POST — admin CRUD
│   ├── leads/[id]/          # GET/PUT/DELETE
│   ├── farm/sales/          # GET/POST
│   ├── farm/expenses/       # GET/POST
│   ├── farm/inventory/      # GET
│   ├── farm/inventory/transaction/  # POST
│   ├── blog/                # GET/POST
│   ├── blog/[id]/           # GET/PUT/DELETE (also [slug] for public)
│   └── email/send/          # POST
├── layout.tsx
└── globals.css
components/
├── ui/                      # shadcn/ui primitives
├── Sidebar.tsx
├── Header.tsx
├── SummaryCard.tsx
├── ContactForm.tsx
├── LeadForm.tsx
├── FarmForms.tsx
└── TipTapEditor.tsx
lib/
├── supabase/
│   ├── client.ts            # Browser client (anon key)
│   └── server.ts            # Server client (service role key)
├── email.ts                 # Resend helpers
├── validations.ts           # Zod schemas
└── utils.ts
types/
└── index.ts                 # Shared TypeScript types
```

---

## Brand & Design

### Colors
- **Primary:** `#0BBDB2` (aquagreen)
- **Secondary:** White
- **Accent:** Sea blue (complement to aquagreen)

### Typography
- **Brand font:** Agrandir (Extra Bold with outline effects for logo/headings)

### Design Principles
- Mobile-first responsive (60%+ traffic expected on mobile)
- Images: WebP format, lazy loading, srcset, hero images < 500KB
- Lighthouse target: > 90 (goal: 95)
- Page load target: < 2s website, < 3s dashboard

---

## Authentication & Authorization

### Roles
| Role | Access |
|------|--------|
| **admin** | Full CRUD on all tables. Dashboard + farm overview + blog CMS + settings |
| **manager** | INSERT-only on farm tables. No read/update/delete of historical data |
| **public (anon)** | Read published blog posts. Submit contact form (insert into leads) |

### Supabase RLS Policies
- Admin: read/write all tables
- Manager: insert-only on `farm_sales`, `farm_expenses`, `farm_inventory_transactions`
- Anon: read `blog_posts` WHERE `status = 'published'`; insert into `leads` via `/api/submit-lead`

### Auth Flow
- Supabase Auth for login
- Profile lookup: `supabase.from('profiles').select('role').eq('id', user.id)`
- Middleware checks role before granting route access

---

## Database Schema

### Tables
- **`leads`** — id, business (`ultratidy`|`dba`|`primefield`), source, name, email, phone, service, property_size, date_needed, notes, status (default `new`), timestamps
- **`farm_sales`** — id, date, customer_name, product (`catfish`|`goat`|`chicken`|`other`), quantity, unit_price, total_amount (generated), payment_method, notes, created_by, created_at
- **`farm_expenses`** — id, date, category (`feed`|`labor`|`utilities`|`veterinary`|`transport`|`equipment`), amount, paid_to, payment_method, notes, created_by, created_at
- **`farm_inventory`** — id, product (unique), current_stock, last_updated
- **`farm_inventory_transactions`** — id, product, action (`add`|`remove`|`sale`|`mortality`), quantity, reason, notes, created_by, created_at — has a trigger `update_inventory()` that auto-updates `farm_inventory.current_stock`
- **`blog_posts`** — id, title, slug (unique), content, excerpt, featured_image, meta_description, status (`draft`|`published`), published_at, author_id, timestamps
- **`profiles`** — id, role (`admin`|`manager`)

---

## Email System

### 6 Auto-Triggered Templates
1. **Initial inquiry response** (instant on form submit)
2. **Follow-up** (3 days, no response)
3. **Booking confirmation** (manual trigger by admin)
4. **Reminder** (day before appointment)
5. **Thank you + review request** (post-service, links to Google review)
6. **Re-engagement** (30 days later)

### CASL Compliance (Canada's Anti-Spam Law)
Every email must include:
- Unsubscribe link (`{{unsubscribe_url}}`)
- Clear sender identification
- Physical mailing address (Toronto, ON, Canada)
- Unsubscribe honored within 10 days

### Email Config
- Sender: `UltraTidy <hello@ultratidy.ca>`
- Admin notification: env var `ADMIN_EMAIL`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```

Never commit actual values. Use `.env.local` for development.

---

## Key Business Context

### Services & Pricing
| Service | Starting Price | Min Duration |
|---------|---------------|-------------|
| Residential Cleaning | $150 | 4 hours |
| Commercial Cleaning | $200 | 3 hours |
| Deep Cleaning | $250 | 6 hours |
| Move-In/Move-Out Cleaning | $250 | 5 hours |
| Post-Construction Cleaning | $250 | 5 hours |

Additional service type in contact form: **Airbnb cleaning**

### Service Area
- GTA (Greater Toronto Area), Brantford & 40km radius

### Business Hours
Mon-Fri 9AM-6PM, Sat 8AM-6PM, Sun 10AM-4PM

### Social & Review Links
- Instagram: ultratidycleaningservices
- Facebook: UltraTidy Cleaning Services
- Google Business: `https://g.page/r/CbgkPYbL4D3JEBM/review`

---

## Rate Limiting
- Public API endpoints: sliding window, 5 requests per 10 seconds per IP (Upstash Redis)
- Email failure must NOT break lead submission (fire-and-forget pattern)

## SEO
- Schema.org `Service` markup on services page
- Schema.org `Article` markup on blog posts
- Meta descriptions on all pages
- Auto-generated slugs from blog titles (editable)

## Performance & Scalability Targets
- Website load: < 2s (target 1.5s)
- Dashboard load: < 3s (target 2s)
- API response: < 500ms (target 300ms)
- Supports: 10,000 leads, 1,000 visitors/day, 500 blog posts, 10,000 farm transactions/year

## Free Tier Limits to Monitor
- Supabase DB: 500MB (stay under 400MB)
- Supabase bandwidth: 2GB/month (stay under 1.5GB)
- Resend emails: 3,000/month (stay under 2,500)
- Vercel bandwidth: 100GB/month
- Cloudinary: 25GB storage + 25GB bandwidth

## Farm Manager Portal — Special Requirements
- Offline-capable (save locally, sync when online)
- Large touch targets, high contrast (readable in sunlight)
- Numeric keyboard for number inputs
- Auto-save on blur (draft saved locally)

## Out of Scope
SMS/WhatsApp automation, payment processing, online booking calendar, customer accounts/login, multi-language, native mobile apps, advanced analytics, inventory alerts, automated invoicing, accounting integrations, email marketing beyond 6 templates.

## DNS Configuration
```
A record:    ultratidy.ca          -> 76.76.21.21 (Vercel)
CNAME:       www.ultratidy.ca      -> cname.vercel-dns.com
CNAME:       leads.ultratidy.ca    -> cname.vercel-dns.com
CNAME:       farm.ultratidy.ca     -> cname.vercel-dns.com
```
