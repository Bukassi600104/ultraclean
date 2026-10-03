-- MANUAL RELEASE ONLY. Do not replay original migrations on production.
-- Preconditions, legacy effects and rollback: docs/PRIMEFIELD-V2-RELEASE.md.
-- No historical totals, movements, dates, actors or account records are backfilled.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='farm_sales' and column_name='weight_kg')
    or to_regclass('public.farm_daily_records') is null
    or to_regclass('public.farm_supply_transactions') is null then
    raise exception 'Unexpected production schema. Stop; do not reconstruct missing farm tables.';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='farm_sales' and column_name='total_amount' and is_generated='ALWAYS' and generation_expression <> '(quantity * unit_price)') then
    raise exception 'Unexpected sales expression. Audit before migration.';
  end if;
end $$;

-- DROP EXPRESSION retains every stored numeric value; never DROP COLUMN.
alter table public.farm_sales alter column total_amount drop expression if exists;
alter table public.farm_sales add column if not exists pricing_basis text;
alter table public.farm_sales add constraint farm_sales_v2_basis_check check (pricing_basis is null or pricing_basis in ('per_kg','per_head','per_unit'));
alter table public.farm_sales drop constraint farm_sales_product_check;
alter table public.farm_sales add constraint farm_sales_product_check check (product in ('catfish','goat','chicken','other','crops','pig','turkey','cattle'));
alter table public.farm_feed_purchases drop constraint farm_feed_purchases_feed_type_check;
alter table public.farm_feed_purchases add constraint farm_feed_purchases_feed_type_check check (feed_type in ('fish','goat','chicken','pig','turkey','cattle','other'));
alter table public.farm_daily_feed drop constraint farm_daily_feed_feed_type_check;
alter table public.farm_daily_feed add constraint farm_daily_feed_feed_type_check check (feed_type in ('fish','goat','chicken','pig','turkey','cattle','other'));

do $$ declare t text; begin
  foreach t in array array['farm_sales','farm_expenses','farm_fund_transfers'] loop
    execute format('alter table public.%I add column if not exists voided_at timestamptz, add column if not exists voided_by uuid references public.profiles(id), add column if not exists void_reason text, add column if not exists revision integer default 0',t);
  end loop;
end $$;
alter table public.farm_supply_inventory add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id),
  add column if not exists archive_reason text, add column if not exists revision integer default 0;
alter table public.farm_supply_transactions add column if not exists date date;
alter table public.farm_feed_purchases add column if not exists revision integer default 0;
alter table public.farm_daily_feed add column if not exists revision integer default 0;
alter table public.farm_inventory_transactions add column if not exists sale_id uuid references public.farm_sales(id),
  add column if not exists correction_of uuid references public.farm_inventory_transactions(id),
  add column if not exists correction_role text check (correction_role in ('reversal','replacement'));
create index farm_inventory_sale_link on public.farm_inventory_transactions(sale_id) where sale_id is not null;
create unique index farm_inventory_one_reversal on public.farm_inventory_transactions(correction_of) where correction_role='reversal';

create table public.farm_activity (
  id uuid primary key default gen_random_uuid(), record_type text not null, record_id uuid not null,
  operation text not null, actor_id uuid not null references public.profiles(id),
  happened_at timestamptz not null default now(), record_date date,
  before_value jsonb, after_value jsonb, reason text
);
create index farm_activity_target on public.farm_activity(record_type,record_id,happened_at desc);
create table public.farm_correction_requests (
  id uuid primary key default gen_random_uuid(), record_type text not null,
  record_id uuid not null, requested_change jsonb not null,
  reason text not null check (length(trim(reason)) between 1 and 1000),
  requested_by uuid not null references public.profiles(id), requested_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','applied','declined')),
  resolved_by uuid references public.profiles(id), resolved_at timestamptz, resolution_note text
);
create index farm_correction_pending on public.farm_correction_requests(status,requested_at desc);
create table public.farm_write_receipts (
  actor_id uuid not null references public.profiles(id), request_id uuid not null,
  fingerprint text not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(actor_id,request_id)
);
alter table public.farm_activity enable row level security;
alter table public.farm_correction_requests enable row level security;
alter table public.farm_write_receipts enable row level security;
create policy farm_activity_admin_read on public.farm_activity for select to authenticated using(public.is_admin());
create policy farm_requests_read on public.farm_correction_requests for select to authenticated using(public.is_admin() or requested_by=auth.uid());

create function public.farm_activity_immutable() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception using errcode='42501', message='Farm activity history is append-only'; end $$;
create trigger farm_activity_no_rewrite before update or delete on public.farm_activity for each row execute function public.farm_activity_immutable();

-- Server APIs are the write boundary. Authenticated direct writes cannot bypass dates,
-- actor attribution, audit or role checks. Read policies are retained/tightened below.
do $$ declare t text; begin
  foreach t in array array['farm_sales','farm_expenses','farm_inventory','farm_inventory_transactions','farm_feed_purchases','farm_fund_transfers','farm_daily_records','farm_daily_feed','farm_supply_inventory','farm_supply_transactions','farm_activity','farm_correction_requests','farm_write_receipts'] loop
    execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from anon,authenticated',t);
  end loop;
end $$;
drop policy if exists "Manager can read feed purchases" on public.farm_feed_purchases;
create policy farm_feed_role_read on public.farm_feed_purchases for select to authenticated using (public.is_admin() or public.is_manager());
drop policy if exists "Anyone authenticated can read fund transfers" on public.farm_fund_transfers;
create policy farm_fund_role_read on public.farm_fund_transfers for select to authenticated using (public.is_admin() or public.is_manager());

-- All dated operations, including closing, share a transaction advisory lock.
create function public.farm_v2_lock_date(p_date date,p_is_admin boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_date is null then raise exception using errcode='22023',message='A valid operational date is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('primefield-day:'||p_date::text,0));
  if exists(select 1 from public.farm_daily_records where date=p_date and status='closed') then
    if not p_is_admin then raise exception using errcode='23514',message='This date is closed. Keep the entry and request an admin correction.'; end if;
    if nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='A reason is required for a closed-day correction'; end if;
  end if;
end $$;
revoke all on function public.farm_v2_lock_date(date,boolean,text) from public,anon,authenticated;

create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,
  p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_role text; v_admin boolean; v_suspended boolean; v_date date;
  v_table text; v_before jsonb; v_after jsonb; v_row jsonb; v_result jsonb;
  v_payload jsonb:=coalesce(p_payload,'{}'::jsonb); v_fingerprint text; v_receipt record;
  v_id uuid; v_product text; v_quantity numeric; v_delta numeric; v_movement uuid;
  v_sale public.farm_sales%rowtype; v_supply public.farm_supply_inventory%rowtype;
  v_tx public.farm_inventory_transactions%rowtype; v_rev integer; v_current numeric;
begin
  -- Tiny farm workload: one shared lock gives corrections, stock writes and closure
  -- a consistent order, including operations that lock several dates/items.
  perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
  select role,coalesce(suspended,false) into v_role,v_suspended from public.profiles where id=p_actor;
  if v_role is null or v_role not in ('admin','manager') or v_suspended then
    raise exception using errcode='42501',message='Active farm role required';
  end if;
  v_admin:=v_role='admin';
  if p_operation not in ('create','open','close','request') and not v_admin then
    raise exception using errcode='42501',message='Saved records require an admin correction';
  end if;
  if p_kind='fund' and not v_admin then raise exception using errcode='42501',message='Only an admin may change owner funds'; end if;
  if p_operation in ('update','void','archive','apply','decline') and nullif(trim(p_reason),'') is null then
    raise exception using errcode='22023',message='A correction reason is required';
  end if;
  if length(coalesce(p_reason,''))>1000 then raise exception using errcode='22023',message='Reason is too long'; end if;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_request_id::text,0));
    v_fingerprint:=md5(jsonb_build_array(p_kind,p_operation,v_payload,p_id,p_reason)::text);
    select * into v_receipt from public.farm_write_receipts where actor_id=p_actor and request_id=p_request_id;
    if found then
      if v_receipt.fingerprint<>v_fingerprint then raise exception using errcode='23514',message='Retry identifier was reused with different values'; end if;
      return v_receipt.result;
    end if;
  end if;

  if jsonb_typeof(v_payload)='array' then
    if p_operation<>'create' or p_kind not in ('sale','expense','feed','daily_feed') or jsonb_array_length(v_payload) not between 1 and 50 then
      raise exception using errcode='22023',message='Invalid farm batch';
    end if;
    -- Sorted date locks avoid batch/close deadlocks. No partial batch commits.
    for v_date in select distinct coalesce((value->>'date')::date,(now() at time zone 'Africa/Lagos')::date) from jsonb_array_elements(v_payload) order by 1 loop
      perform public.farm_v2_lock_date(v_date,v_admin,p_reason);
    end loop;
    v_result:='[]'::jsonb;
    for v_row in select value from jsonb_array_elements(v_payload) loop
      v_result:=v_result||jsonb_build_array(public.farm_v2_write(p_actor,p_kind,p_operation,v_row,null,p_reason,null));
    end loop;
  elsif p_kind='request' then
    if p_operation='request' then
      if v_payload->>'record_type' not in ('sale','expense','inventory','inventory_transaction','supply','supply_transaction','feed','daily_feed') then
        raise exception using errcode='22023',message='Unsupported correction record';
      end if;
      if nullif(trim(v_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Explain the requested correction'; end if;
      v_table:=case v_payload->>'record_type' when 'sale' then 'farm_sales' when 'expense' then 'farm_expenses' when 'inventory' then 'farm_inventory' when 'inventory_transaction' then 'farm_inventory_transactions' when 'supply' then 'farm_supply_inventory' when 'supply_transaction' then 'farm_supply_transactions' when 'feed' then 'farm_feed_purchases' when 'daily_feed' then 'farm_daily_feed' end;
      execute format('select to_jsonb(t) from public.%I t where id=$1',v_table) into v_before using (v_payload->>'record_id')::uuid;
      if v_before is null then raise exception using errcode='P0002',message='Correction target not found'; end if;
      insert into public.farm_correction_requests(record_type,record_id,requested_change,reason,requested_by)
      values(v_payload->>'record_type',(v_payload->>'record_id')::uuid,coalesce(v_payload->'requested_change','{}'),v_payload->>'reason',p_actor) returning to_jsonb(farm_correction_requests.*) into v_result;
    elsif p_operation in ('apply','decline') then
      select to_jsonb(t) into v_before from public.farm_correction_requests t where id=p_id for update;
      if v_before is null then raise exception using errcode='P0002',message='Request not found'; end if;
      if v_before->>'status'<>'pending' then raise exception using errcode='23514',message='Request has already been resolved'; end if;
      if p_operation='apply' then
        v_result:=public.farm_v2_write(p_actor,v_before->>'record_type',coalesce(v_payload->>'operation','update'),coalesce(v_payload->'changes','{}'),(v_before->>'record_id')::uuid,p_reason,null);
      end if;
      update public.farm_correction_requests set status=case when p_operation='apply' then 'applied' else 'declined' end,resolved_by=p_actor,resolved_at=now(),resolution_note=p_reason where id=p_id returning to_jsonb(farm_correction_requests.*) into v_result;
      insert into public.farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('request',p_id,p_operation,p_actor,v_before,v_result,p_reason);
    else raise exception using errcode='22023',message='Unsupported request operation'; end if;
  elsif p_kind='day' then
    v_date:=coalesce((v_payload->>'date')::date,(now() at time zone 'Africa/Lagos')::date);
    perform pg_advisory_xact_lock(hashtextextended('primefield-day:'||v_date::text,0));
    insert into public.farm_daily_records(date,status,manager_id) values(v_date,'open',p_actor) on conflict(date) do nothing;
    select to_jsonb(t) into v_before from public.farm_daily_records t where date=v_date for update;
    if p_operation='close' and v_before->>'status'<>'closed' then
      update public.farm_daily_records set status='closed',closed_at=now(),manager_id=p_actor where date=v_date returning to_jsonb(farm_daily_records.*) into v_result;
      insert into public.farm_activity(record_type,record_id,operation,actor_id,record_date,before_value,after_value) values('day',(v_result->>'id')::uuid,'close',p_actor,v_date,v_before,v_result);
    elsif p_operation in ('open','close') then v_result:=v_before;
    else raise exception using errcode='22023',message='Unsupported day operation'; end if;
  else
    v_table:=case p_kind when 'sale' then 'farm_sales' when 'expense' then 'farm_expenses' when 'fund' then 'farm_fund_transfers' when 'feed' then 'farm_feed_purchases' when 'daily_feed' then 'farm_daily_feed' when 'supply' then 'farm_supply_inventory' when 'supply_transaction' then 'farm_supply_transactions' when 'inventory' then 'farm_inventory' when 'inventory_transaction' then 'farm_inventory_transactions' end;
    if v_table is null then raise exception using errcode='22023',message='Unsupported farm record'; end if;
    if p_operation<>'create' then
      execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table) into v_before using p_id;
      if v_before is null then raise exception using errcode='P0002',message='Farm record not found'; end if;
      if v_before->>'voided_at' is not null or v_before->>'archived_at' is not null then raise exception using errcode='23514',message='This record is no longer active'; end if;
      if p_kind in ('sale','expense','fund','supply','feed','daily_feed') then
        if v_payload->>'expected_revision' is null or (v_payload->>'expected_revision') !~ '^[0-9]+$' then raise exception using errcode='22023',message='Refresh the record before correcting it'; end if;
        v_rev:=coalesce((v_before->>'revision')::integer,0);
        if (v_payload->>'expected_revision')::integer<>v_rev then raise exception using errcode='40001',message='This record changed. Refresh before correcting it.'; end if;
      end if;
      -- Acquire old/new dates in a fixed order; never use today's status as a proxy.
      for v_date in select distinct x from unnest(array[(v_before->>'date')::date,(v_payload->>'date')::date]) x where x is not null order by x loop
        perform public.farm_v2_lock_date(v_date,v_admin,p_reason);
      end loop;
    end if;
    v_date:=coalesce((v_payload->>'date')::date,(v_before->>'date')::date,(now() at time zone 'Africa/Lagos')::date);
    perform public.farm_v2_lock_date(v_date,v_admin,p_reason);

    if p_kind='sale' then
      if p_operation='create' then
        v_sale:=jsonb_populate_record(null::public.farm_sales,v_payload);
        if v_sale.pricing_basis is null then raise exception using errcode='22023',message='Sale pricing basis is required'; end if;
        v_sale.id:=gen_random_uuid(); v_sale.date:=v_date; v_sale.created_by:=p_actor; v_sale.created_at:=now(); v_sale.revision:=0;
        v_sale.voided_at:=null; v_sale.voided_by:=null; v_sale.void_reason:=null;
        v_sale.payment_method:=coalesce(v_sale.payment_method,'cash');
      else
        v_sale:=jsonb_populate_record(null::public.farm_sales,v_before);
        if p_operation='update' then
          v_sale:=jsonb_populate_record(v_sale,v_payload- 'id'- 'created_by'- 'created_at'- 'voided_at'- 'voided_by'- 'void_reason'- 'revision');
          if v_before->>'pricing_basis' is null then
            v_sale.pricing_basis:=null; -- Never infer a legacy basis.
            v_sale.total_amount:=coalesce((v_payload->>'total_amount')::numeric,(v_before->>'total_amount')::numeric);
          end if;
        elsif p_operation='void' then
          v_sale.voided_at:=now(); v_sale.voided_by:=p_actor; v_sale.void_reason:=p_reason;
        else raise exception using errcode='22023',message='Unsupported sale operation'; end if;
        v_sale.revision:=v_rev+1; v_sale.is_edited:=true;
      end if;
      if v_sale.quantity is null or v_sale.quantity<=0 or v_sale.unit_price is null or v_sale.unit_price<0 then raise exception using errcode='22023',message='Positive sale quantity and valid price required'; end if;
      if p_operation<>'create' and v_before->>'pricing_basis' is not null and v_sale.pricing_basis is null then raise exception using errcode='22023',message='A V2 sale must retain an explicit pricing basis'; end if;
      if v_sale.pricing_basis='per_kg' then
        if v_sale.weight_kg is null or v_sale.weight_kg<=0 then raise exception using errcode='22023',message='Positive weight is required for per-kg sales'; end if;
        v_sale.total_amount:=v_sale.weight_kg*v_sale.unit_price;
      elsif v_sale.pricing_basis in ('per_head','per_unit') then v_sale.total_amount:=v_sale.quantity*v_sale.unit_price;
      end if;
      if p_operation='create' then insert into public.farm_sales select v_sale.*;
      else update public.farm_sales set date=v_sale.date,customer_name=v_sale.customer_name,product=v_sale.product,quantity=v_sale.quantity,unit_price=v_sale.unit_price,total_amount=v_sale.total_amount,payment_method=v_sale.payment_method,notes=v_sale.notes,weight_kg=v_sale.weight_kg,gender=v_sale.gender,other_product_name=v_sale.other_product_name,pricing_basis=v_sale.pricing_basis,is_edited=v_sale.is_edited,voided_at=v_sale.voided_at,voided_by=v_sale.voided_by,void_reason=v_sale.void_reason,revision=v_sale.revision where id=p_id;
      end if;
      v_id:=v_sale.id;
      -- Prospective only. Restore only V2 movements that actually exist.
      if p_operation<>'create' and v_before->>'pricing_basis' is not null and (p_operation='void' or (v_before->>'product')<>v_sale.product or (v_before->>'quantity')::numeric<>v_sale.quantity) then
        for v_tx in select * from public.farm_inventory_transactions t where sale_id=p_id and action='sale' and correction_role is distinct from 'reversal' and not exists(select 1 from public.farm_inventory_transactions r where r.correction_of=t.id and r.correction_role='reversal') loop
          insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,correction_of,correction_role,reason) values(v_tx.product,'add',v_tx.quantity,v_date,p_actor,p_id,v_tx.id,'reversal',p_reason);
        end loop;
      end if;
      if v_sale.pricing_basis is not null and p_operation<>'void' and (p_operation='create' or (v_before->>'product')<>v_sale.product or (v_before->>'quantity')::numeric<>v_sale.quantity) then
        if v_sale.product in ('catfish','goat','chicken','pig','turkey','cattle') or exists(select 1 from public.farm_inventory where product=v_sale.product) then
          select current_stock into v_current from public.farm_inventory where product=v_sale.product for update;
          if coalesce(v_current,0)<v_sale.quantity then raise exception using errcode='23514',message='Sale quantity exceeds recorded stock. Request an inventory correction first.'; end if;
          insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,reason) values(v_sale.product,'sale',v_sale.quantity,v_date,p_actor,v_sale.id,coalesce(p_reason,'V2 sale'));
        end if;
      end if;
      v_after:=to_jsonb(v_sale);
    elsif p_kind='inventory_transaction' then
      if p_operation='create' then
        v_product:=v_payload->>'product'; v_quantity:=(v_payload->>'quantity')::numeric;
        if v_payload->>'action' not in ('add','remove','mortality') then raise exception using errcode='22023',message='Sales movements are created by the sales workflow'; end if;
        if not v_admin and v_payload->>'action'='remove' then raise exception using errcode='42501',message='Only an admin may remove stock by correction'; end if;
        if v_quantity is null or v_quantity<=0 then raise exception using errcode='22023',message='Positive movement quantity is required'; end if;
        if v_payload->>'action' in ('remove','mortality') then
          select current_stock into v_current from public.farm_inventory where product=v_product for update;
          if coalesce(v_current,0)<v_quantity then raise exception using errcode='23514',message='Movement exceeds recorded stock'; end if;
        end if;
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,notes) values(v_product,v_payload->>'action',v_quantity,v_date,p_actor,v_payload->>'reason',v_payload->>'notes') returning to_jsonb(farm_inventory_transactions.*) into v_after;
      elsif p_operation='update' then
        v_tx:=jsonb_populate_record(null::public.farm_inventory_transactions,v_before);
        if v_tx.sale_id is not null or v_tx.correction_role='reversal' then raise exception using errcode='23514',message='Correct the linked sale or authoritative movement instead'; end if;
        if exists(select 1 from public.farm_inventory_transactions where correction_of=p_id and correction_role='reversal') then raise exception using errcode='40001',message='Movement was already corrected'; end if;
        v_quantity:=coalesce((v_payload->>'quantity')::numeric,v_tx.quantity); v_product:=coalesce(v_payload->>'product',v_tx.product);
        if v_quantity<=0 then raise exception using errcode='22023',message='Positive movement quantity is required'; end if;
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,correction_of,correction_role) values(v_tx.product,case when v_tx.action='add' then 'remove' else 'add' end,v_tx.quantity,v_date,p_actor,p_reason,p_id,'reversal');
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,notes,correction_of,correction_role) values(v_product,v_tx.action,v_quantity,v_date,p_actor,p_reason,coalesce(v_payload->>'notes',v_tx.notes),p_id,'replacement') returning to_jsonb(farm_inventory_transactions.*) into v_after;
      else raise exception using errcode='22023',message='Unsupported inventory movement operation'; end if;
      v_id:=(v_after->>'id')::uuid;
    elsif p_kind='inventory' then
      if p_operation<>'update' then raise exception using errcode='22023',message='Inventory is derived from movements'; end if;
      v_current:=(v_before->>'current_stock')::numeric; v_quantity:=(v_payload->>'target_quantity')::numeric;
      if v_payload->>'expected_current_stock' is null or (v_payload->>'expected_current_stock')::numeric is distinct from v_current then raise exception using errcode='40001',message='Stock changed. Refresh before correcting it.'; end if;
      if v_quantity is null or v_quantity<0 then raise exception using errcode='22023',message='A nonnegative target quantity is required'; end if;
      v_delta:=v_quantity-v_current;
      if v_delta<>0 then insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason) values(v_before->>'product',case when v_delta>0 then 'add' else 'remove' end,abs(v_delta),v_date,p_actor,p_reason); end if;
      select to_jsonb(t) into v_after from public.farm_inventory t where id=p_id; v_id:=p_id;
    elsif p_kind='supply' then
      if p_operation='create' then
        if nullif(trim(v_payload->>'item_name'),'') is null then raise exception using errcode='22023',message='Supply name required'; end if;
        v_quantity:=coalesce((v_payload->>'current_quantity')::numeric,0);
        if v_quantity<0 then raise exception using errcode='22023',message='Opening quantity cannot be negative'; end if;
        insert into public.farm_supply_inventory(item_name,category,unit,current_quantity,restock_threshold,notes) values(trim(v_payload->>'item_name'),coalesce(v_payload->>'category','other'),coalesce(v_payload->>'unit','units'),0,(v_payload->>'restock_threshold')::numeric,v_payload->>'notes') returning * into v_supply;
        v_id:=v_supply.id;
        if v_quantity>0 then insert into public.farm_supply_transactions(item_id,action,quantity_change,notes,created_by,date) values(v_id,'adjustment',v_quantity,'Opening quantity',p_actor,v_date); end if;
      elsif p_operation='update' then
        v_id:=p_id;
        if v_payload?'unit' and v_payload->>'unit'<>v_before->>'unit' and ((v_before->>'current_quantity')::numeric<>0 or exists(select 1 from public.farm_supply_transactions where item_id=p_id)) then raise exception using errcode='23514',message='Units cannot change after supply stock or activity exists'; end if;
        update public.farm_supply_inventory set item_name=coalesce(v_payload->>'item_name',item_name),category=coalesce(v_payload->>'category',category),unit=coalesce(v_payload->>'unit',unit),notes=case when v_payload?'notes' then v_payload->>'notes' else notes end,restock_threshold=case when v_payload?'restock_threshold' then (v_payload->>'restock_threshold')::numeric else restock_threshold end,updated_at=now(),revision=v_rev+1 where id=p_id;
        v_delta:=coalesce((v_payload->>'quantity_change')::numeric,0);
        if v_delta<>0 and (v_before->>'current_quantity')::numeric+v_delta<0 then raise exception using errcode='23514',message='Correction exceeds available supply quantity'; end if;
        if v_delta<>0 then insert into public.farm_supply_transactions(item_id,action,quantity_change,notes,created_by,date) values(p_id,'adjustment',v_delta,p_reason,p_actor,v_date); end if;
      elsif p_operation='archive' then
        v_id:=p_id; update public.farm_supply_inventory set archived_at=now(),archived_by=p_actor,archive_reason=p_reason,revision=v_rev+1,updated_at=now() where id=p_id;
      else raise exception using errcode='22023',message='Unsupported supply operation'; end if;
      select to_jsonb(t) into v_after from public.farm_supply_inventory t where id=v_id;
      if nullif(trim(v_after->>'item_name'),'') is null or coalesce((v_after->>'restock_threshold')::numeric,0)<0 then raise exception using errcode='22023',message='Invalid supply details'; end if;
    elsif p_kind='supply_transaction' then
      if p_operation='create' then
        select * into v_supply from public.farm_supply_inventory where id=(v_payload->>'item_id')::uuid for update;
        if not found then raise exception using errcode='P0002',message='Supply not found'; end if;
        if v_supply.archived_at is not null then raise exception using errcode='23514',message='This supply has been archived'; end if;
        v_delta:=(v_payload->>'quantity_change')::numeric;
        if v_delta is null or v_delta=0 or (v_payload->>'action'='purchase' and v_delta<0) or (v_payload->>'action'='use' and v_delta>0) then raise exception using errcode='22023',message='Invalid signed supply quantity'; end if;
        if v_payload->>'action'='adjustment' and not v_admin then raise exception using errcode='42501',message='Only an admin may adjust saved supply quantities'; end if;
        if v_supply.current_quantity+v_delta<0 then raise exception using errcode='23514',message='Supply use exceeds available quantity'; end if;
        insert into public.farm_supply_transactions(item_id,action,quantity_change,notes,created_by,date) values(v_supply.id,v_payload->>'action',v_delta,v_payload->>'notes',p_actor,v_date) returning to_jsonb(farm_supply_transactions.*) into v_after;
        update public.farm_supply_inventory set revision=coalesce(revision,0)+1 where id=v_supply.id;
      elsif p_operation='update' then
        select * into v_supply from public.farm_supply_inventory where id=(v_before->>'item_id')::uuid for update;
        if v_supply.archived_at is not null then raise exception using errcode='23514',message='Supply is archived'; end if;
        v_quantity:=(v_payload->>'quantity_change')::numeric; v_delta:=v_quantity-(v_before->>'quantity_change')::numeric;
        if v_quantity is null then raise exception using errcode='22023',message='Corrected signed quantity required'; end if;
        if v_supply.current_quantity+v_delta<0 then raise exception using errcode='23514',message='Correction exceeds available quantity'; end if;
        if exists(select 1 from public.farm_activity where record_type='supply_transaction' and record_id=p_id and operation='update') then raise exception using errcode='40001',message='Supply transaction was already corrected; adjust the item instead'; end if;
        insert into public.farm_supply_transactions(item_id,action,quantity_change,notes,created_by,date) values(v_supply.id,'adjustment',v_delta,p_reason,p_actor,v_date) returning to_jsonb(farm_supply_transactions.*) into v_after;
        update public.farm_supply_inventory set revision=coalesce(revision,0)+1 where id=v_supply.id;
      else raise exception using errcode='22023',message='Unsupported supply transaction operation'; end if;
      v_id:=coalesce(p_id,(v_after->>'id')::uuid);
    else
      -- Remaining financial/operational records use fixed table and field allowlists.
      if p_operation='create' then
        v_id:=gen_random_uuid();
        if p_kind='expense' then
          if v_payload->>'category'='feed' then raise exception using errcode='22023',message='Record feed through Feed Purchases, not general expenses'; end if;
          insert into public.farm_expenses(id,date,category,amount,paid_to,payment_method,notes,created_by,expense_source,item_name) values(v_id,v_date,v_payload->>'category',(v_payload->>'amount')::numeric,v_payload->>'paid_to',coalesce(v_payload->>'payment_method','cash'),v_payload->>'notes',p_actor,coalesce(v_payload->>'expense_source','bimbo_transfer'),v_payload->>'item_name');
        elsif p_kind='fund' then insert into public.farm_fund_transfers(id,date,amount,notes,created_by) values(v_id,v_date,(v_payload->>'amount')::numeric,v_payload->>'notes',p_actor);
        elsif p_kind='feed' then insert into public.farm_feed_purchases(id,date,feed_type,feed_source,weight_unit,weight_amount,num_bags,cost,notes,created_by) values(v_id,v_date,v_payload->>'feed_type',coalesce(v_payload->>'feed_source','local'),coalesce(v_payload->>'weight_unit','kg'),(v_payload->>'weight_amount')::numeric,(v_payload->>'num_bags')::integer,(v_payload->>'cost')::numeric,v_payload->>'notes',p_actor);
        elsif p_kind='daily_feed' then insert into public.farm_daily_feed(id,date,feed_type,feed_source,num_bags,notes,created_by) values(v_id,v_date,v_payload->>'feed_type',coalesce(v_payload->>'feed_source','local'),(v_payload->>'num_bags')::integer,v_payload->>'notes',p_actor);
        else raise exception using errcode='22023',message='Unsupported creation'; end if;
      elsif p_operation='void' and p_kind in ('expense','fund') then
        v_id:=p_id;
        execute format('update public.%I set voided_at=now(),voided_by=$1,void_reason=$2,revision=coalesce(revision,0)+1 where id=$3',v_table) using p_actor,p_reason,p_id;
      elsif p_operation='update' then
        v_id:=p_id;
        if p_kind='expense' then
          if v_payload->>'category'='feed' and v_before->>'category'<>'feed' then raise exception using errcode='22023',message='Use Feed Purchases for feed'; end if;
          update public.farm_expenses set date=v_date,category=coalesce(v_payload->>'category',category),amount=coalesce((v_payload->>'amount')::numeric,amount),paid_to=case when v_payload?'paid_to' then v_payload->>'paid_to' else paid_to end,payment_method=coalesce(v_payload->>'payment_method',payment_method),notes=case when v_payload?'notes' then v_payload->>'notes' else notes end,expense_source=coalesce(v_payload->>'expense_source',expense_source),item_name=case when v_payload?'item_name' then v_payload->>'item_name' else item_name end,is_edited=true,revision=v_rev+1 where id=p_id;
        elsif p_kind='fund' then update public.farm_fund_transfers set date=v_date,amount=coalesce((v_payload->>'amount')::numeric,amount),notes=case when v_payload?'notes' then v_payload->>'notes' else notes end,revision=v_rev+1 where id=p_id;
        elsif p_kind='feed' then update public.farm_feed_purchases set date=v_date,feed_type=coalesce(v_payload->>'feed_type',feed_type),feed_source=coalesce(v_payload->>'feed_source',feed_source),weight_unit=coalesce(v_payload->>'weight_unit',weight_unit),weight_amount=coalesce((v_payload->>'weight_amount')::numeric,weight_amount),num_bags=coalesce((v_payload->>'num_bags')::integer,num_bags),cost=coalesce((v_payload->>'cost')::numeric,cost),notes=case when v_payload?'notes' then v_payload->>'notes' else notes end,revision=v_rev+1 where id=p_id;
        elsif p_kind='daily_feed' then update public.farm_daily_feed set date=v_date,feed_type=coalesce(v_payload->>'feed_type',feed_type),feed_source=coalesce(v_payload->>'feed_source',feed_source),num_bags=coalesce((v_payload->>'num_bags')::integer,num_bags),notes=case when v_payload?'notes' then v_payload->>'notes' else notes end,revision=v_rev+1 where id=p_id;
        else raise exception using errcode='22023',message='Unsupported update'; end if;
      else raise exception using errcode='22023',message='Unsupported operation'; end if;
      execute format('select to_jsonb(t) from public.%I t where id=$1',v_table) into v_after using v_id;
      if p_kind='expense' and (v_after->>'amount')::numeric<=0 then raise exception using errcode='22023',message='Expense must be positive'; end if;
    end if;
    insert into public.farm_activity(record_type,record_id,operation,actor_id,record_date,before_value,after_value,reason) values(p_kind,coalesce(p_id,v_id),p_operation,p_actor,v_date,v_before,v_after,p_reason);
    v_result:=v_after;
  end if;
  if p_request_id is not null then insert into public.farm_write_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fingerprint,v_result); end if;
  return v_result;
end $$;
revoke all on function public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
grant all on public.farm_activity,public.farm_correction_requests,public.farm_write_receipts to service_role;
commit;
