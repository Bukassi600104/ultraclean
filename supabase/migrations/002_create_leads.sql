-- Leads table: CRM for all three businesses
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business text not null default 'ultratidy' check (business in ('ultratidy', 'dba', 'primefield')),
  source text not null default 'website',
  name text not null,
  email text not null,
  phone text not null,
  service text not null,
  property_size text,
  date_needed text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'booked', 'completed', 'lost')),
  follow_up_sent_at timestamptz,
  reminder_sent_at timestamptz,
  review_sent_at timestamptz,
  reengagement_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_status on public.leads(status);
create index idx_leads_business on public.leads(business);
create index idx_leads_created_at on public.leads(created_at desc);
