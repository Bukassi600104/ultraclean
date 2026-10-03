-- Sanitized production schema metadata only. All test records are synthetic.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create table public.profiles ("id" uuid not null,
"role" text default 'admin'::text not null,
"name" text,
"email" text,
"created_at" timestamp with time zone default now() not null,
"suspended" boolean default false not null);
create table public.farm_supply_transactions ("id" uuid default gen_random_uuid() not null,
"item_id" uuid not null,
"action" text not null,
"quantity_change" numeric not null,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now());
create table public.farm_daily_records ("id" uuid default gen_random_uuid() not null,
"date" date not null,
"status" text default 'open'::text not null,
"manager_id" uuid,
"closed_at" timestamp with time zone,
"created_at" timestamp with time zone default now());
create table public.farm_inventory ("id" uuid default gen_random_uuid() not null,
"product" text not null,
"current_stock" numeric default 0 not null,
"last_updated" timestamp with time zone default now() not null);
create table public.farm_daily_feed ("id" uuid default gen_random_uuid() not null,
"date" date not null,
"feed_type" text not null,
"num_bags" integer not null,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now(),
"feed_source" text default 'local'::text);
create table public.farm_sales ("id" uuid default gen_random_uuid() not null,
"date" date default CURRENT_DATE not null,
"customer_name" text,
"product" text not null,
"quantity" numeric not null,
"unit_price" numeric not null,
"total_amount" numeric generated always as ((quantity * unit_price)) stored,
"payment_method" text default 'cash'::text not null,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now() not null,
"weight_kg" numeric,
"gender" text,
"other_product_name" text,
"is_edited" boolean default false);
create table public.farm_feed_purchases ("id" uuid default gen_random_uuid() not null,
"date" date default CURRENT_DATE not null,
"feed_type" text not null,
"feed_source" text not null,
"weight_unit" text not null,
"weight_amount" numeric not null,
"num_bags" integer not null,
"cost" numeric not null,
"created_by" uuid,
"created_at" timestamp with time zone default now() not null,
"notes" text);
create table public.farm_supply_inventory ("id" uuid default gen_random_uuid() not null,
"item_name" text not null,
"category" text default 'other'::text not null,
"unit" text default 'units'::text not null,
"current_quantity" numeric default 0 not null,
"restock_threshold" numeric,
"notes" text,
"created_at" timestamp with time zone default now(),
"updated_at" timestamp with time zone default now());
create table public.farm_expenses ("id" uuid default gen_random_uuid() not null,
"date" date default CURRENT_DATE not null,
"category" text not null,
"amount" numeric not null,
"paid_to" text,
"payment_method" text default 'cash'::text not null,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now() not null,
"is_edited" boolean default false,
"expense_source" text default 'bimbo_transfer'::text,
"item_name" text);
create table public.farm_inventory_transactions ("id" uuid default gen_random_uuid() not null,
"product" text not null,
"action" text not null,
"quantity" numeric not null,
"reason" text,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now() not null,
"date" date default CURRENT_DATE not null);
create table public.farm_fund_transfers ("id" uuid default gen_random_uuid() not null,
"date" date default CURRENT_DATE not null,
"amount" numeric not null,
"notes" text,
"created_by" uuid,
"created_at" timestamp with time zone default now() not null);
alter table public.profiles add primary key(id);
alter table public.farm_sales add constraint "farm_sales_pkey" PRIMARY KEY (id);
alter table public.farm_sales add constraint "farm_sales_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.farm_expenses add constraint "farm_expenses_pkey" PRIMARY KEY (id);
alter table public.farm_expenses add constraint "farm_expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.farm_inventory add constraint "farm_inventory_pkey" PRIMARY KEY (id);
alter table public.farm_inventory add constraint "farm_inventory_product_key" UNIQUE (product);
alter table public.farm_inventory_transactions add constraint "farm_inventory_transactions_action_check" CHECK ((action = ANY (ARRAY['add'::text, 'remove'::text, 'sale'::text, 'mortality'::text])));
alter table public.farm_inventory_transactions add constraint "farm_inventory_transactions_pkey" PRIMARY KEY (id);
alter table public.farm_inventory_transactions add constraint "farm_inventory_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.farm_sales add constraint "farm_sales_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text])));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_feed_type_check" CHECK ((feed_type = ANY (ARRAY['fish'::text, 'goat'::text])));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_feed_source_check" CHECK ((feed_source = ANY (ARRAY['local'::text, 'foreign'::text])));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_weight_unit_check" CHECK ((weight_unit = ANY (ARRAY['tons'::text, 'kg'::text])));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_weight_amount_check" CHECK ((weight_amount > (0)::numeric));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_num_bags_check" CHECK ((num_bags > 0));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_cost_check" CHECK ((cost > (0)::numeric));
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_pkey" PRIMARY KEY (id);
alter table public.farm_feed_purchases add constraint "farm_feed_purchases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.farm_fund_transfers add constraint "farm_fund_transfers_amount_check" CHECK ((amount > (0)::numeric));
alter table public.farm_fund_transfers add constraint "farm_fund_transfers_pkey" PRIMARY KEY (id);
alter table public.farm_fund_transfers add constraint "farm_fund_transfers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.farm_supply_inventory add constraint "farm_supply_inventory_pkey" PRIMARY KEY (id);
alter table public.farm_supply_transactions add constraint "farm_supply_transactions_action_check" CHECK ((action = ANY (ARRAY['purchase'::text, 'use'::text, 'adjustment'::text])));
alter table public.farm_supply_transactions add constraint "farm_supply_transactions_pkey" PRIMARY KEY (id);
alter table public.farm_supply_transactions add constraint "farm_supply_transactions_item_id_fkey" FOREIGN KEY (item_id) REFERENCES farm_supply_inventory(id) ON DELETE CASCADE;
alter table public.farm_supply_transactions add constraint "farm_supply_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.farm_expenses add constraint "farm_expenses_expense_source_check" CHECK ((expense_source = ANY (ARRAY['bimbo_transfer'::text, 'sales_cash'::text])));
alter table public.farm_daily_records add constraint "farm_daily_records_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])));
alter table public.farm_daily_records add constraint "farm_daily_records_pkey" PRIMARY KEY (id);
alter table public.farm_daily_records add constraint "farm_daily_records_date_key" UNIQUE (date);
alter table public.farm_daily_records add constraint "farm_daily_records_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES auth.users(id);
alter table public.farm_daily_feed add constraint "farm_daily_feed_feed_type_check" CHECK ((feed_type = ANY (ARRAY['fish'::text, 'goat'::text, 'chicken'::text, 'other'::text])));
alter table public.farm_daily_feed add constraint "farm_daily_feed_num_bags_check" CHECK ((num_bags > 0));
alter table public.farm_daily_feed add constraint "farm_daily_feed_pkey" PRIMARY KEY (id);
alter table public.farm_daily_feed add constraint "farm_daily_feed_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.farm_daily_feed add constraint "farm_daily_feed_feed_source_check" CHECK ((feed_source = ANY (ARRAY['local'::text, 'foreign'::text])));
alter table public.farm_sales add constraint "farm_sales_product_check" CHECK ((product = ANY (ARRAY['catfish'::text, 'goat'::text, 'chicken'::text, 'other'::text, 'crops'::text, 'pig'::text, 'turkey'::text])));
alter table public.farm_expenses add constraint "farm_expenses_category_check" CHECK ((category = ANY (ARRAY['feed'::text, 'labor'::text, 'utilities'::text, 'veterinary'::text, 'transport'::text, 'equipment'::text, 'produce'::text])));
create function public.is_admin() returns boolean language sql security definer as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function public.is_manager() returns boolean language sql security definer as $$ select exists(select 1 from profiles where id=auth.uid() and role='manager') $$;
CREATE OR REPLACE FUNCTION public.update_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;
CREATE TRIGGER on_inventory_transaction AFTER INSERT ON public.farm_inventory_transactions FOR EACH ROW EXECUTE FUNCTION update_inventory();
CREATE OR REPLACE FUNCTION public.update_supply_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE farm_supply_inventory
  SET current_quantity = current_quantity + NEW.quantity_change,
      updated_at = now()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$function$
;
CREATE TRIGGER on_supply_transaction AFTER INSERT ON public.farm_supply_transactions FOR EACH ROW EXECUTE FUNCTION update_supply_quantity();
alter table public.farm_daily_feed enable row level security;
alter table public.farm_daily_records enable row level security;
alter table public.farm_expenses enable row level security;
alter table public.farm_feed_purchases enable row level security;
alter table public.farm_fund_transfers enable row level security;
alter table public.farm_inventory enable row level security;
alter table public.farm_inventory_transactions enable row level security;
alter table public.farm_sales enable row level security;
alter table public.farm_supply_inventory enable row level security;
alter table public.farm_supply_transactions enable row level security;
alter table public.profiles enable row level security;
create policy "manager_all_daily_feed" on public.farm_daily_feed for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
create policy "admin_all_daily_records" on public.farm_daily_records for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "manager_insert_daily_records" on public.farm_daily_records for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
create policy "manager_read_daily_records" on public.farm_daily_records for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
create policy "manager_update_daily_records" on public.farm_daily_records for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
create policy "Admin full access to farm expenses" on public.farm_expenses for ALL to public using (is_admin());
create policy "Manager can insert farm expenses" on public.farm_expenses for INSERT to public with check (is_manager());
create policy "Manager can insert feed purchases" on public.farm_feed_purchases for INSERT to public with check ((auth.uid() = created_by));
create policy "Manager can read feed purchases" on public.farm_feed_purchases for SELECT to public using (true);
create policy "Admin can insert fund transfers" on public.farm_fund_transfers for INSERT to public with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Anyone authenticated can read fund transfers" on public.farm_fund_transfers for SELECT to public using ((auth.role() = 'authenticated'::text));
create policy "Admin full access to farm inventory" on public.farm_inventory for ALL to public using (is_admin());
create policy "Manager can read farm inventory" on public.farm_inventory for SELECT to public using (is_manager());
create policy "Admin full access to farm inventory transactions" on public.farm_inventory_transactions for ALL to public using (is_admin());
create policy "Manager can insert farm inventory transactions" on public.farm_inventory_transactions for INSERT to public with check (is_manager());
create policy "Admin full access to farm sales" on public.farm_sales for ALL to public using (is_admin());
create policy "Manager can insert farm sales" on public.farm_sales for INSERT to public with check (is_manager());
create policy "admin_all_supply_inventory" on public.farm_supply_inventory for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "manager_insert_supply_inventory" on public.farm_supply_inventory for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));
create policy "manager_select_supply_inventory" on public.farm_supply_inventory for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));
create policy "admin_all_supply_transactions" on public.farm_supply_transactions for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "manager_insert_supply_transactions" on public.farm_supply_transactions for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));
create policy "manager_select_supply_transactions" on public.farm_supply_transactions for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));
grant usage on schema public,auth to anon,authenticated,service_role; grant all on all tables in schema public to service_role; grant all on all tables in schema public to authenticated;