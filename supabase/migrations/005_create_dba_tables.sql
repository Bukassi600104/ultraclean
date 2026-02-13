-- DBA (Digital Boss Academy) products
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

-- DBA sales log
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

create index idx_dba_sales_product on public.dba_sales(product_id);
create index idx_dba_sales_created_at on public.dba_sales(created_at desc);
