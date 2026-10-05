-- Additive property domain. No legacy record or account changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.property_properties(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 200),address text not null check(length(trim(address)) between 1 and 1000),status text not null default 'active' check(status in ('active','inactive')),currency text not null check(currency ~ '^[A-Z]{3}$'),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0);
create table public.property_units(id uuid primary key default gen_random_uuid(),property_id uuid not null references property_properties(id),name text not null check(length(trim(name)) between 1 and 200),status text not null default 'vacant' check(status in ('vacant','occupied','unavailable')),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,unique(property_id,name),unique(id,property_id));
create table public.property_tenancies(id uuid primary key default gen_random_uuid(),unit_id uuid not null references property_units(id),tenant_name text not null check(length(trim(tenant_name)) between 1 and 200),tenant_contact text check(length(tenant_contact)<=500),start_date date not null,end_date date,rent_amount numeric(16,2) not null check(rent_amount>=0),currency text not null check(currency ~ '^[A-Z]{3}$'),status text not null default 'active' check(status in ('active','ended')),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,check(end_date is null or end_date>=start_date));
create unique index property_one_active_tenancy on property_tenancies(unit_id) where status='active';
create table public.property_rent_payments(id uuid primary key default gen_random_uuid(),tenancy_id uuid not null references property_tenancies(id),amount numeric(16,2) not null check(amount>0),currency text not null check(currency ~ '^[A-Z]{3}$'),payment_date date not null,period_start date not null,period_end date not null,payment_method text not null check(length(trim(payment_method)) between 1 and 100),notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,check(period_end>=period_start));
create table public.property_expenses(id uuid primary key default gen_random_uuid(),property_id uuid not null references property_properties(id),unit_id uuid,category text not null check(length(trim(category)) between 1 and 100),amount numeric(16,2) not null check(amount>0),currency text not null check(currency ~ '^[A-Z]{3}$'),expense_date date not null,notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,foreign key(unit_id,property_id) references property_units(id,property_id));
create table public.property_maintenance(id uuid primary key default gen_random_uuid(),property_id uuid not null references property_properties(id),unit_id uuid,issue text not null check(length(trim(issue)) between 1 and 3000),category text not null check(category in ('maintenance','repair')),status text not null default 'open' check(status in ('open','in_progress','resolved')),priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),cost numeric(16,2) check(cost>=0),currency text not null check(currency ~ '^[A-Z]{3}$'),resolution text check(length(resolution)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,foreign key(unit_id,property_id) references property_units(id,property_id),check(status<>'resolved' or nullif(trim(resolution),'') is not null));
create table public.property_events(id uuid primary key default gen_random_uuid(),record_type text not null,record_id uuid not null,operation text not null,actor_id uuid not null references profiles(id),before_value jsonb,after_value jsonb,reason text,happened_at timestamptz not null default now());
create table public.property_write_receipts(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id));
create index property_units_property on property_units(property_id);
create index property_rent_history on property_rent_payments(payment_date desc,tenancy_id);
create index property_expense_history on property_expenses(expense_date desc,property_id);
create index property_maintenance_queue on property_maintenance(status,property_id);
create index property_events_history on property_events(record_type,record_id,happened_at desc);
create trigger property_events_immutable before update or delete on property_events for each row execute function farm_activity_immutable();

create function public.property_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_table text; v_cols text; v_sets text; v_allowed text[]; v_key text; v_before jsonb; v_data jsonb; v_result jsonb; v_receipt record; v_fp text; v_currency text; v_unit uuid; v_unit_before jsonb; v_unit_after jsonb;
begin
 select role into v_role from profiles where id=p_actor and not suspended;
 if v_role is null or v_role not in ('admin','property_manager') then raise exception using errcode='42501',message='Active property role required'; end if;
 if p_operation not in ('create','update') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>15000 then raise exception using errcode='22023',message='Invalid property operation'; end if;
 if p_operation='update' and nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='Change reason required'; end if;
 if length(coalesce(p_reason,''))>2000 then raise exception using errcode='22023',message='Reason too long'; end if;
 perform pg_advisory_xact_lock(hashtextextended('property-operations',0));
 if p_request_id is not null then
  v_fp:=md5(jsonb_build_array(p_kind,p_operation,p_payload,p_id,p_reason)::text);
  select * into v_receipt from property_write_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then if v_receipt.fingerprint<>v_fp then raise exception using errcode='23514',message='Retry identifier reused'; end if; return v_receipt.result; end if;
 end if;
 v_table:=case p_kind when 'property' then 'property_properties' when 'unit' then 'property_units' when 'tenancy' then 'property_tenancies' when 'rent_payment' then 'property_rent_payments' when 'expense' then 'property_expenses' when 'maintenance' then 'property_maintenance' end;
 if v_table is null then raise exception using errcode='22023',message='Unsupported property record'; end if;
 select array_agg(column_name order by ordinal_position) into v_allowed from information_schema.columns where table_schema='public' and table_name=v_table and column_name not in ('id','created_by','created_at','updated_at','revision');
 for v_key in select jsonb_object_keys(p_payload) loop if v_key<>'expected_revision' and not v_key=any(v_allowed) then raise exception using errcode='22023',message='Unsupported property field'; end if; end loop;
 if p_operation='update' then
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table) into v_before using p_id;
  if v_before is null then raise exception using errcode='P0002',message='Property record not found'; end if;
  if p_payload->>'expected_revision' is null or (p_payload->>'expected_revision')!~'^[0-9]+$' then raise exception using errcode='22023',message='Revision required'; end if;
  if (p_payload->>'expected_revision')::integer<>(v_before->>'revision')::integer then raise exception using errcode='40001',message='Record changed; refresh'; end if;
 end if;
 v_data:=coalesce(v_before,'{}')||(p_payload-'expected_revision');
 if p_kind='property' and v_before is not null and v_data->>'currency'<>v_before->>'currency' then raise exception using errcode='23514',message='Property currency is fixed'; end if;
 if p_kind='unit' then
  if v_before is not null and v_data->>'property_id'<>v_before->>'property_id' then raise exception using errcode='23514',message='Unit property is fixed'; end if;
  if v_data->>'status'='occupied' and not exists(select 1 from property_tenancies where unit_id=p_id and status='active') then raise exception using errcode='23514',message='Active tenancy required for occupancy'; end if;
  if v_data->>'status' in ('vacant','unavailable') and exists(select 1 from property_tenancies where unit_id=p_id and status='active') then raise exception using errcode='23514',message='End active tenancy before changing occupancy'; end if;
 end if;
 if p_kind='tenancy' then
  if v_before is not null and v_data->>'unit_id'<>v_before->>'unit_id' then raise exception using errcode='23514',message='Tenancy unit is fixed'; end if;
  select p.currency into v_currency from property_units u join property_properties p on p.id=u.property_id where u.id=(v_data->>'unit_id')::uuid;
  if v_data->>'status'='ended' and v_data->>'end_date' is null then raise exception using errcode='22023',message='Tenancy end date required'; end if;
  if v_before is not null and exists(select 1 from property_rent_payments where tenancy_id=p_id and (period_start<(v_data->>'start_date')::date or ((v_data->>'end_date')::date is not null and period_end>(v_data->>'end_date')::date))) then raise exception using errcode='23514',message='Tenancy dates must retain recorded rent periods'; end if;
  if v_data->>'status'='active' and exists(select 1 from property_units where id=(v_data->>'unit_id')::uuid and status='unavailable') then raise exception using errcode='23514',message='Unit is unavailable'; end if;
 elsif p_kind='rent_payment' then
  if v_before is not null and v_data->>'tenancy_id'<>v_before->>'tenancy_id' then raise exception using errcode='23514',message='Payment tenancy is fixed'; end if;
  select currency into v_currency from property_tenancies where id=(v_data->>'tenancy_id')::uuid;
  if exists(select 1 from property_tenancies where id=(v_data->>'tenancy_id')::uuid and ((v_data->>'period_start')::date<start_date or (end_date is not null and (v_data->>'period_end')::date>end_date))) then raise exception using errcode='23514',message='Rent period must fall within tenancy'; end if;
 elsif p_kind in ('expense','maintenance') then
  if v_before is not null and v_data->>'property_id'<>v_before->>'property_id' then raise exception using errcode='23514',message='Record property is fixed'; end if;
  select currency into v_currency from property_properties where id=(v_data->>'property_id')::uuid;
 end if;
 if p_kind in ('tenancy','rent_payment','expense','maintenance') and (v_currency is null or v_data->>'currency' is distinct from v_currency) then raise exception using errcode='23514',message='Currency must match property or tenancy'; end if;
 if p_operation='create' then
  -- Populate only supplied columns so table defaults still apply.
  select string_agg(format('%I',k),','),string_agg(format('r.%I',k),',') into v_cols,v_sets from jsonb_object_keys(p_payload-'expected_revision') k;
  execute format('insert into public.%I(%s,created_by) select %s,$2 from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',v_table,v_cols,v_sets,v_table,v_table) into v_result using p_payload,p_actor;
 else
  select string_agg(format('%1$I=r.%1$I',k),',') into v_sets from unnest(v_allowed) k;
  execute format('update public.%I t set %s,revision=t.revision+1,updated_at=now() from jsonb_populate_record(null::public.%I,$1) r where t.id=$2 returning to_jsonb(t)',v_table,v_sets,v_table) into v_result using v_data,p_id;
 end if;
 if p_kind='tenancy' then
  v_unit:=(v_result->>'unit_id')::uuid;
  select to_jsonb(u) into v_unit_before from property_units u where id=v_unit;
  update property_units set status=case when exists(select 1 from property_tenancies where unit_id=v_unit and status='active') then 'occupied' else 'vacant' end,revision=revision+1,updated_at=now() where id=v_unit returning to_jsonb(property_units.*) into v_unit_after;
  insert into property_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('unit',v_unit,'occupancy',p_actor,v_unit_before,v_unit_after,p_reason);
 end if;
 insert into property_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values(p_kind,(v_result->>'id')::uuid,p_operation,p_actor,v_before,v_result,p_reason);
 if p_request_id is not null then insert into property_write_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fp,v_result); end if;
 return v_result;
end $$;
revoke all on function public.property_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.property_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
do $$ declare t text; begin
 foreach t in array array['property_properties','property_units','property_tenancies','property_rent_payments','property_expenses','property_maintenance','property_events','property_write_receipts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to service_role',t);
  if t<>'property_write_receipts' then
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy %I on public.%I for select to authenticated using(public.operations_has_role(''property_manager''))',t||'_read',t);
  end if;
 end loop;
end $$;
commit;
