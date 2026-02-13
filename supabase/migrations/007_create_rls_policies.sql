-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.blog_posts enable row level security;
alter table public.farm_sales enable row level security;
alter table public.farm_expenses enable row level security;
alter table public.farm_inventory enable row level security;
alter table public.farm_inventory_transactions enable row level security;
alter table public.dba_products enable row level security;
alter table public.dba_sales enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Helper: check if current user is manager
create or replace function public.is_manager()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$ language sql security definer;

-- Profiles: users can read their own; admin can read all
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admin full access to profiles" on public.profiles
  for all using (is_admin());

-- Leads: admin full CRUD; anon can insert (contact form)
create policy "Admin full access to leads" on public.leads
  for all using (is_admin());
create policy "Anon can insert leads" on public.leads
  for insert with check (true);

-- Blog posts: admin full CRUD; anon can read published
create policy "Admin full access to blog posts" on public.blog_posts
  for all using (is_admin());
create policy "Public can read published posts" on public.blog_posts
  for select using (status = 'published');

-- Farm sales: admin full CRUD; manager insert only
create policy "Admin full access to farm sales" on public.farm_sales
  for all using (is_admin());
create policy "Manager can insert farm sales" on public.farm_sales
  for insert with check (is_manager());

-- Farm expenses: admin full CRUD; manager insert only
create policy "Admin full access to farm expenses" on public.farm_expenses
  for all using (is_admin());
create policy "Manager can insert farm expenses" on public.farm_expenses
  for insert with check (is_manager());

-- Farm inventory: admin full CRUD; manager can read
create policy "Admin full access to farm inventory" on public.farm_inventory
  for all using (is_admin());
create policy "Manager can read farm inventory" on public.farm_inventory
  for select using (is_manager());

-- Farm inventory transactions: admin full CRUD; manager insert only
create policy "Admin full access to farm inventory transactions" on public.farm_inventory_transactions
  for all using (is_admin());
create policy "Manager can insert farm inventory transactions" on public.farm_inventory_transactions
  for insert with check (is_manager());

-- DBA products: admin full CRUD
create policy "Admin full access to dba products" on public.dba_products
  for all using (is_admin());

-- DBA sales: admin full CRUD
create policy "Admin full access to dba sales" on public.dba_sales
  for all using (is_admin());
