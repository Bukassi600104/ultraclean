-- Farm sales
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

-- Farm expenses
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

-- Farm inventory (current stock levels)
create table if not exists public.farm_inventory (
  id uuid primary key default gen_random_uuid(),
  product text unique not null,
  current_stock numeric not null default 0,
  last_updated timestamptz not null default now()
);

-- Seed default products
insert into public.farm_inventory (product, current_stock)
values ('catfish', 0), ('goat', 0), ('chicken', 0)
on conflict (product) do nothing;

-- Farm inventory transactions
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
