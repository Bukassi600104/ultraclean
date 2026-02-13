-- ============================================
-- UltraTidy Full Database Migration
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 001: Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'manager')),
  name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 002: Leads table
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

create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_business on public.leads(business);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

-- 003: Blog posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null default '',
  excerpt text,
  featured_image text,
  meta_description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_slug on public.blog_posts(slug);
create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);

-- 004: Farm tables
create table if not exists public.farm_sales (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  customer_name text not null,
  product text not null check (product in ('catfish', 'goat', 'chicken', 'other')),
  quantity numeric not null,
  unit_price numeric not null,
  total_amount numeric generated always as (quantity * unit_price) stored,
  payment_method text not null default 'cash',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.farm_expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  category text not null check (category in ('feed', 'labor', 'utilities', 'veterinary', 'transport', 'equipment')),
  amount numeric not null,
  paid_to text,
  payment_method text not null default 'cash',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.farm_inventory (
  id uuid primary key default gen_random_uuid(),
  product text unique not null,
  current_stock numeric not null default 0,
  last_updated timestamptz not null default now()
);

insert into public.farm_inventory (product, current_stock)
values ('catfish', 0), ('goat', 0), ('chicken', 0)
on conflict (product) do nothing;

create table if not exists public.farm_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  action text not null check (action in ('add', 'remove', 'sale', 'mortality')),
  quantity numeric not null,
  reason text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 005: DBA tables
create table if not exists public.dba_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null default 0,
  file_url text,
  thumbnail text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dba_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.dba_products(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  amount numeric not null,
  payment_method text not null default 'transfer',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dba_sales_product on public.dba_sales(product_id);
create index if not exists idx_dba_sales_created_at on public.dba_sales(created_at desc);

-- 006: Inventory trigger
create or replace function public.update_inventory()
returns trigger as $$
begin
  insert into public.farm_inventory (product, current_stock, last_updated)
  values (new.product, 0, now())
  on conflict (product) do nothing;

  if new.action = 'add' then
    update public.farm_inventory
    set current_stock = current_stock + new.quantity,
        last_updated = now()
    where product = new.product;
  elsif new.action in ('remove', 'sale', 'mortality') then
    update public.farm_inventory
    set current_stock = current_stock - new.quantity,
        last_updated = now()
    where product = new.product;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_inventory_transaction on public.farm_inventory_transactions;
create trigger on_inventory_transaction
  after insert on public.farm_inventory_transactions
  for each row execute function public.update_inventory();

-- 007: RLS policies
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.blog_posts enable row level security;
alter table public.farm_sales enable row level security;
alter table public.farm_expenses enable row level security;
alter table public.farm_inventory enable row level security;
alter table public.farm_inventory_transactions enable row level security;
alter table public.dba_products enable row level security;
alter table public.dba_sales enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

create or replace function public.is_manager()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$ language sql security definer;

-- Profiles policies
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admin full access to profiles" on public.profiles
  for all using (is_admin());

-- Leads policies
create policy "Admin full access to leads" on public.leads
  for all using (is_admin());
create policy "Anon can insert leads" on public.leads
  for insert with check (true);

-- Blog posts policies
create policy "Admin full access to blog posts" on public.blog_posts
  for all using (is_admin());
create policy "Public can read published posts" on public.blog_posts
  for select using (status = 'published');

-- Farm sales policies
create policy "Admin full access to farm sales" on public.farm_sales
  for all using (is_admin());
create policy "Manager can insert farm sales" on public.farm_sales
  for insert with check (is_manager());

-- Farm expenses policies
create policy "Admin full access to farm expenses" on public.farm_expenses
  for all using (is_admin());
create policy "Manager can insert farm expenses" on public.farm_expenses
  for insert with check (is_manager());

-- Farm inventory policies
create policy "Admin full access to farm inventory" on public.farm_inventory
  for all using (is_admin());
create policy "Manager can read farm inventory" on public.farm_inventory
  for select using (is_manager());

-- Farm inventory transactions policies
create policy "Admin full access to farm inventory transactions" on public.farm_inventory_transactions
  for all using (is_admin());
create policy "Manager can insert farm inventory transactions" on public.farm_inventory_transactions
  for insert with check (is_manager());

-- DBA policies
create policy "Admin full access to dba products" on public.dba_products
  for all using (is_admin());
create policy "Admin full access to dba sales" on public.dba_sales
  for all using (is_admin());
