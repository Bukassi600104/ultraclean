-- Preconditions: manager_periods_and_scope and existing guarded business writers.
-- Additive boundary only. No original values, dates, actors or balances are rewritten.
-- Legacy periods retain existing closure behavior; personal days are separately locked.
-- New metadata has no historical backfill. After activation retain these guards on rollback.
begin;
create table public.manager_write_contexts(
 actor_id uuid not null references profiles(id),request_id uuid not null,period_id uuid references manager_periods(id),
 fingerprint text not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
alter table manager_write_contexts enable row level security;
revoke all on manager_write_contexts from public,anon,authenticated,service_role;
grant select on manager_write_contexts to service_role;

create function operations_private.prepare_write(p_actor uuid,p_business text,p_payload jsonb,p_request uuid,p_fingerprint text,p_target_period uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb; selected uuid; receipt manager_write_contexts;
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 selected:=coalesce(nullif(coalesce(p_payload->>'manager_period_id',p_payload->0->>'manager_period_id'),'')::uuid,nullif(current_setting('operations.period',true),'')::uuid);
 if p_target_period is not null and selected is not null and selected<>p_target_period then raise exception using errcode='42501',message='Correction must retain its original responsible period';end if;
 selected:=coalesce(p_target_period,selected);
 c:=manager_context(p_actor,p_business,selected);
 if c->>'mode'='personal' and (now() at time zone 'Africa/Lagos')::date<(c->>'startsOn')::date and not exists(select 1 from profiles where id=p_actor and role='admin') then
  raise exception using errcode='42501',message='Your work period has not started yet';end if;
 if c->>'status'<>'active' and not exists(select 1 from profiles where id=p_actor and role='admin') then
  raise exception using errcode='42501',message='Complete your inventory handover before recording activity';end if;
 perform set_config('operations.actor',p_actor::text,true);
 perform set_config('operations.period',coalesce(c->>'periodId',''),true);
 if p_request is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_request::text,0));
  select * into receipt from manager_write_contexts where actor_id=p_actor and request_id=p_request;
  if receipt.request_id is null and c->>'mode'='personal' and (
    exists(select 1 from farm_write_receipts where actor_id=p_actor and request_id=p_request)
    or exists(select 1 from property_write_receipts where actor_id=p_actor and request_id=p_request)
    or exists(select 1 from content_write_receipts where actor_id=p_actor and request_id=p_request)
    or exists(select 1 from farm_operation_receipts where actor_id=p_actor and request_id=p_request)
    or exists(select 1 from farm_feed_stock_receipts where actor_id=p_actor and request_id=p_request)) then
   raise exception using errcode='23514',message='This earlier retry has no verified responsibility period. Keep it for review';end if;
  if receipt.request_id is not null and (receipt.period_id is distinct from (c->>'periodId')::uuid or receipt.fingerprint<>p_fingerprint) then
   raise exception using errcode='23514',message='This retry belongs to a different period or entry. Keep it for review';end if;
  insert into manager_write_contexts(actor_id,request_id,period_id,fingerprint) values(p_actor,p_request,(c->>'periodId')::uuid,p_fingerprint) on conflict do nothing;
 end if;
 return c;
end $$;

create function operations_private.write_resource(p_writer text,p_kind text) returns text language sql immutable set search_path=public,pg_temp as $$ select case p_writer
 when 'property_write' then case p_kind when 'property' then 'property_properties' when 'unit' then 'property_units' when 'tenancy' then 'property_tenancies' when 'rent_payment' then 'property_rent_payments' when 'expense' then 'property_expenses' when 'maintenance' then 'property_maintenance' end
 when 'content_write' then case p_kind when 'record' then 'content_records' when 'performance' then 'content_performance' when 'lead' then 'content_leads' when 'sale' then 'content_sales' when 'integration' then 'content_social_integrations' end
 when 'farm_operations_write' then case p_kind when 'report' then 'farm_daily_reports' when 'request' then 'farm_operational_requests' end
 when 'farm_feed_stock_write' then 'farm_feed_stock'
 else case p_kind when 'sale' then 'farm_sales' when 'expense' then 'farm_expenses' when 'feed' then 'farm_feed_purchases' when 'daily_feed' then 'farm_daily_feed' when 'fund' then 'farm_fund_transfers' when 'supply' then 'farm_supply_inventory' when 'supply_transaction' then 'farm_supply_transactions' when 'inventory' then 'farm_inventory' when 'inventory_transaction' then 'farm_inventory_transactions' when 'request' then 'farm_correction_requests' end end $$;

create function operations_private.correction_period(p_actor uuid,p_writer text,p_kind text,p_id uuid)
returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
declare resource_name text; result uuid; value jsonb; actor_column text; business_name text;
begin
 if p_id is null or not exists(select 1 from profiles where id=p_actor and role='admin') then return null;end if;
 resource_name:=operations_private.write_resource(p_writer,p_kind);
 if resource_name is null then return null;end if;
 select period_id into result from manager_record_links where resource=resource_name and record_id=p_id;
 if found then return result;end if;
 select r.actor_column,r.business into actor_column,business_name from operations_private.resources() r where r.resource=resource_name;
 if actor_column is null then return null;end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',resource_name) into value using p_id;
 select id into result from manager_periods where manager_id=(value->>actor_column)::uuid and business=business_name and mode='legacy' order by created_at limit 1;
 return result;
end $$;

create function operations_private.require_record(p_actor uuid,p_resource text,p_id uuid,p_period uuid)
returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
declare value jsonb; effective_period uuid:=p_period;
begin
 if p_id is null then return;end if;
 if not exists(select 1 from operations_private.resources() where resource=p_resource) then raise exception using errcode='42501',message='Unsupported linked record';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',p_resource) into value using p_id;
 if exists(select 1 from manager_periods where id=p_period and manager_id=p_actor and mode='legacy') then effective_period:=null;end if;
 if value is null or not operations_private.record_visible(p_actor,p_resource,value,effective_period) then
  raise exception using errcode='42501',message='This linked record is outside your responsibility';end if;
end $$;

create function operations_private.prepare_target(p_actor uuid,p_writer text,p_kind text,p_id uuid,p_payload jsonb,p_period uuid)
returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
declare resource_name text;row_value jsonb;ref record;
begin
 if exists(select 1 from profiles where id=p_actor and role='admin') then return;end if;
 resource_name:=operations_private.write_resource(p_writer,p_kind);
 if p_id is not null then perform operations_private.require_record(p_actor,resource_name,p_id,p_period);end if;
 for row_value in select value from jsonb_array_elements(case when jsonb_typeof(p_payload)='array' then p_payload else jsonb_build_array(p_payload) end) loop
  for ref in select key,val from jsonb_each_text(row_value) e(key,val) where key=any(array['property_id','unit_id','tenancy_id','content_id','lead_id','stock_group_id','item_id','daily_feed_id','stock_id','inventory_id']) and val is not null loop
   resource_name:=case ref.key when 'property_id' then 'property_properties' when 'unit_id' then 'property_units' when 'tenancy_id' then 'property_tenancies' when 'content_id' then 'content_records' when 'lead_id' then 'content_leads' when 'stock_group_id' then 'farm_livestock_groups' when 'item_id' then 'farm_supply_inventory' when 'daily_feed_id' then 'farm_daily_feed' when 'stock_id' then 'farm_feed_stock' when 'inventory_id' then 'farm_inventory' end;
   perform operations_private.require_record(p_actor,resource_name,ref.val::uuid,p_period);
  end loop;
 end loop;
end $$;

create function operations_private.guard_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid; c jsonb; r record; value jsonb:=to_jsonb(new); reference record; target text; actual_date date; selected uuid;
begin
 if (select activated_at is null from operations_release_state) then return new;end if;
 actor:=nullif(current_setting('operations.actor',true),'')::uuid;
 if actor is null then raise exception using errcode='42501',message='Use the guarded operations workflow';end if;
 select * into r from operations_private.resources() where resource=tg_table_name;
 selected:=nullif(current_setting('operations.period',true),'')::uuid;
 c:=manager_context(actor,r.business,selected);
 if exists(select 1 from profiles where id=actor and role='admin') then return new;end if;
 if c->>'status'<>'active' then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 if tg_op='UPDATE' then perform operations_private.require_record(actor,tg_table_name,old.id,selected);end if;
 if c->>'mode'='personal' and r.date_column is not null and r.date_column not in ('created_at','happened_at','requested_at') then
  actual_date:=(value->>r.date_column)::date;
  if actual_date<(c->>'startsOn')::date then raise exception using errcode='42501',message='Activity cannot predate your work start date';end if;
 end if;
 for reference in select key,val from jsonb_each_text(value) e(key,val) where key=any(array['property_id','unit_id','tenancy_id','content_id','lead_id','stock_group_id','item_id','daily_feed_id','stock_id','inventory_id']) and val is not null loop
  target:=case reference.key when 'property_id' then 'property_properties' when 'unit_id' then 'property_units' when 'tenancy_id' then 'property_tenancies'
   when 'content_id' then 'content_records' when 'lead_id' then 'content_leads' when 'stock_group_id' then 'farm_livestock_groups' when 'item_id' then 'farm_supply_inventory'
   when 'daily_feed_id' then 'farm_daily_feed' when 'stock_id' then 'farm_feed_stock' when 'inventory_id' then 'farm_inventory' end;
  perform operations_private.require_record(actor,target,reference.val::uuid,selected);
 end loop;
 if tg_table_name='farm_correction_requests' then
  target:=case value->>'record_type' when 'sale' then 'farm_sales' when 'expense' then 'farm_expenses' when 'feed' then 'farm_feed_purchases' when 'daily_feed' then 'farm_daily_feed' when 'inventory' then 'farm_inventory' when 'inventory_transaction' then 'farm_inventory_transactions' when 'supply' then 'farm_supply_inventory' when 'supply_transaction' then 'farm_supply_transactions' end;
  perform operations_private.require_record(actor,target,(value->>'record_id')::uuid,selected);
 end if;
 return new;
end $$;
do $$ declare r record;begin
 for r in select * from operations_private.resources() loop
  execute format('create trigger manager_record_guard before insert or update on public.%I for each row execute function operations_private.guard_record()',r.resource);
 end loop;
end $$;

alter function farm_v2_lock_date(date,boolean,text) rename to farm_v2_lock_date_before_manager_periods;
revoke all on function farm_v2_lock_date_before_manager_periods(date,boolean,text) from public,anon,authenticated,service_role;
create function public.farm_v2_lock_date(p_date date,p_is_admin boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p manager_periods;
begin
 select * into p from manager_periods where id=nullif(current_setting('operations.period',true),'')::uuid;
 if p.mode is distinct from 'personal' then perform farm_v2_lock_date_before_manager_periods(p_date,p_is_admin,p_reason);return;end if;
 if p_date is null then raise exception using errcode='22023',message='Operational date required';end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-day:'||p_date::text,0));
 perform pg_advisory_xact_lock(hashtextextended('manager-day:'||p.id::text||':'||p_date::text,0));
 if p_date<p.starts_on and not p_is_admin then raise exception using errcode='42501',message='Activity cannot predate your work start date';end if;
 if exists(select 1 from manager_period_days where period_id=p.id and date=p_date and status='closed') then
  if not p_is_admin then raise exception using errcode='23514',message='This date is closed. Keep the entry and request a correction';end if;
  if nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='A reason is required for a closed-day correction';end if;
 end if;
end $$;

create function operations_private.business_payload(p_payload jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select case when jsonb_typeof(p_payload)='array' then (select jsonb_agg(value-'manager_period_id') from jsonb_array_elements(p_payload)) else p_payload-'manager_period_id' end
$$;

-- Keep existing writer implementations, validation and audit routines as the delegates.
do $$ declare name text;business text;signature text;arguments text;kind text;body text;begin
 foreach name in array array['farm_v2_write','farm_operations_write','property_write','content_write','farm_feed_stock_write','farm_livestock_group_write'] loop
  business:=case when name='property_write' then 'property' when name='content_write' then 'content' else 'farm' end;
  signature:=case when name='farm_feed_stock_write' then 'uuid,text,jsonb,uuid,text,uuid' when name='farm_livestock_group_write' then 'uuid,text,jsonb,text,uuid' else 'uuid,text,text,jsonb,uuid,text,uuid' end;
  arguments:=case when name='farm_feed_stock_write' then 'p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null'
   when name='farm_livestock_group_write' then 'p_actor uuid,p_operation text,p_payload jsonb,p_reason text,p_request_id uuid'
   else 'p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null' end;
  kind:=case when name in ('farm_feed_stock_write','farm_livestock_group_write') then quote_literal(name) else 'p_kind' end;
  execute format('alter function public.%I(%s) rename to %I',name,signature,name||'_before_manager_periods');
  execute format('revoke all on function public.%I(%s) from public,anon,authenticated,service_role',name||'_before_manager_periods',signature);
  body:=format($body$
declare c jsonb; result jsonb; saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);d date;p uuid;
begin
 c:=operations_private.prepare_write(p_actor,%L,p_payload,p_request_id,md5(jsonb_build_array(%L,%s,p_operation,p_payload,%s,p_reason)::text),operations_private.correction_period(p_actor,%L,%s,%s));
 perform operations_private.prepare_target(p_actor,%L,%s,%s,p_payload,(c->>'periodId')::uuid);
 %s
 result:=public.%I(%s);
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);
 return result;
end $body$,business,name,kind,case when name='farm_livestock_group_write' then 'null' else 'p_id' end,name,kind,case when name='farm_livestock_group_write' then 'null' else 'p_id' end,name,kind,case when name='farm_livestock_group_write' then 'null' else 'p_id' end,
 case when name='farm_v2_write' then $day$
 if p_kind='day' and c->>'mode'='personal' then
  if p_operation not in ('open','close') then raise exception using errcode='22023',message='Invalid day operation';end if;
  d:=coalesce((p_payload->>'date')::date,(now() at time zone 'Africa/Lagos')::date);p:=(c->>'periodId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
  perform pg_advisory_xact_lock(hashtextextended('primefield-day:'||d::text,0));
  perform pg_advisory_xact_lock(hashtextextended('manager-day:'||p::text||':'||d::text,0));
  if d<(c->>'startsOn')::date then raise exception using errcode='42501',message='Date precedes your work start';end if;
  insert into manager_period_days(period_id,date) values(p,d) on conflict do nothing;
  if p_operation='close' then update manager_period_days set status='closed',closed_by=p_actor,closed_at=now() where period_id=p and date=d and status='open';end if;
  select to_jsonb(t) into result from manager_period_days t where period_id=p and date=d;
  perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);return result;
 end if;
 $day$ else '' end,
 name||'_before_manager_periods',
 case when name='farm_feed_stock_write' then 'p_actor,p_operation,operations_private.business_payload(p_payload),p_id,p_reason,p_request_id'
 when name='farm_livestock_group_write' then 'p_actor,p_operation,operations_private.business_payload(p_payload),p_reason,p_request_id'
 else 'p_actor,p_kind,p_operation,operations_private.business_payload(p_payload),p_id,p_reason,p_request_id' end);
  execute format('create function public.%I(%s) returns jsonb language plpgsql security definer set search_path=public,pg_temp as %L',name,arguments,body);
  execute format('revoke all on function public.%I(%s) from public,anon,authenticated',name,signature);
  execute format('grant execute on function public.%I(%s) to service_role',name,signature);
 end loop;
end $$;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
revoke all on function farm_v2_lock_date(date,boolean,text) from public,anon,authenticated,service_role;


create or replace function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$ values
 ('farm_sales','farm','date','created_by',false),('farm_expenses','farm','date','created_by',false),
 ('farm_feed_purchases','farm','date','created_by',false),('farm_fund_transfers','farm','date','created_by',false),
 ('farm_inventory','farm',null,null,true),('farm_inventory_transactions','farm','date','created_by',false),
 ('farm_daily_records','farm','date','manager_id',false),('farm_daily_feed','farm','date','created_by',false),
 ('farm_feed_stock','farm','opening_date','initialized_by',true),('farm_feed_stock_movements','farm','movement_date','actor_id',false),
 ('farm_supply_inventory','farm',null,null,true),('farm_supply_transactions','farm','date','created_by',false),
 ('farm_livestock_groups','farm',null,'created_by',true),('farm_livestock_events','farm','event_date','actor_id',false),
 ('farm_daily_reports','farm','report_date','manager_id',false),('farm_operational_requests','farm','request_date','requested_by',false),
 ('farm_activity','farm','happened_at','actor_id',false),('farm_correction_requests','farm','requested_at','requested_by',false),
 ('farm_operation_events','farm','happened_at','actor_id',false),
 ('property_properties','property',null,'created_by',true),('property_units','property',null,'created_by',true),
 ('property_tenancies','property','start_date','created_by',true),('property_rent_payments','property','payment_date','created_by',false),
 ('property_expenses','property','expense_date','created_by',false),('property_maintenance','property',null,'created_by',false),
 ('property_events','property','happened_at','actor_id',false),
 ('content_records','content','created_at','created_by',true),('content_performance','content','metric_date','created_by',false),
 ('content_leads','content','lead_date','created_by',false),('content_sales','content','sale_date','created_by',false),
 ('content_social_integrations','content',null,'created_by',true),('content_audit','content','happened_at','actor_id',false)
$$;

create or replace function operations_private.record_visible(p_actor uuid,p_resource text,p_row jsonb,p_period_id uuid default null,p_personal_report boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r record; c jsonb; link manager_record_links; activated timestamptz; creator uuid; target uuid; id uuid;
begin
 select * into r from operations_private.resources() where resource=p_resource;
 if r.resource is null then return false;end if;
 c:=manager_context(p_actor,r.business,p_period_id);
 if c->>'mode'='admin_all' then return true;end if;
 id:=(p_row->>'id')::uuid;target:=(c->>'periodId')::uuid;
 select * into link from manager_record_links where resource=p_resource and record_id=id;
 if link.record_id is not null and link.period_id=target then return true;end if;
 if r.is_asset and exists(select 1 from manager_asset_assignments where period_id=target and resource=p_resource and record_id=id) then return true;end if;
 if c->>'mode'='personal' then return false;end if;
 if link.record_id is not null then
  if r.is_asset and link.period_id is null and p_period_id is null and not p_personal_report then return true;end if;return false;end if;
 if p_period_id is not null or p_personal_report then
  creator:=nullif(p_row->>r.actor_column,'')::uuid;
  return creator=(c->>'managerId')::uuid;
 end if;
 select activated_at into activated from operations_release_state;
 return activated is null or coalesce((p_row->>'created_at')::timestamptz,(p_row->>'happened_at')::timestamptz,'-infinity')<=activated;
exception when insufficient_privilege then return false;
end $$;


create function operations_private.row_payload(p_actor uuid,p_resource text,p_row jsonb,p_period uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb:=p_row; col text; related jsonb; target text; actor uuid;
begin
 foreach col in array array['amount','cost','total_amount','unit_price','rent_amount'] loop
  if p_row ? col then result:=result||jsonb_build_object(col||'_exact',p_row->>col);end if;
 end loop;
 if p_row->>'stock_group_id' is not null then
  select to_jsonb(g) into related from farm_livestock_groups g where id=(p_row->>'stock_group_id')::uuid;
  if operations_private.record_visible(p_actor,'farm_livestock_groups',related,p_period) then result:=result||jsonb_build_object('stock_group',related);end if;
 end if;
 actor:=coalesce((p_row->>'actor_id')::uuid,(p_row->>'created_by')::uuid,(p_row->>'requested_by')::uuid,(p_row->>'manager_id')::uuid);
 if actor is not null then
  select jsonb_build_object('id',id,'name',name) into related from profiles where id=actor;
  result:=result||jsonb_build_object('actor',related,'created_by_name',related->'name');
  if p_resource='farm_daily_reports' then result:=result||jsonb_build_object('manager',related);end if;
  if p_resource='farm_operational_requests' then result:=result||jsonb_build_object('requester',related);end if;
  if p_resource='farm_correction_requests' then result:=result||jsonb_build_object('requested_by_name',related->'name');end if;
 end if;
 if p_resource='farm_correction_requests' then
  target:=operations_private.write_resource('farm_v2_write',p_row->>'record_type');
  if target is not null then
   execute format('select to_jsonb(t) from public.%I t where id=$1',target) into related using (p_row->>'record_id')::uuid;
   if operations_private.record_visible(p_actor,target,related,p_period) then result:=result||jsonb_build_object('target',related);end if;
  end if;
 end if;
 return result;
end $$;
create or replace function public.manager_read_records(p_actor uuid,p_business text,p_resource text,p_period_id uuid default null,p_filters jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r record; c jsonb; clause text; dates text; ordering text; field record; result jsonb; size integer; page integer;
begin
 c:=manager_context(p_actor,p_business,p_period_id);
 if c->>'status'='awaiting_handover' and c->>'mode'<>'admin_all' and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Confirm your inventory handover first';end if;
 select * into r from operations_private.resources() where resource=p_resource and business=p_business;
 if r.resource is null then raise exception using errcode='42501',message='Resource is outside this business';end if;
 size:=coalesce((p_filters->>'limit')::integer,100);page:=coalesce((p_filters->>'page')::integer,0);
 if size not between 1 and 500 or page<0 then raise exception using errcode='22023',message='Invalid page';end if;
 clause:='operations_private.record_visible($1,$2,to_jsonb(t),$3,coalesce(($4->>''personal_report'')::boolean,false))';
 if r.date_column is not null then
  dates:=format('t.%I::date',r.date_column);
  if nullif(p_filters->>'from','') is not null then clause:=clause||format(' and %s >= %L::date',dates,p_filters->>'from');end if;
  if nullif(p_filters->>'to','') is not null then clause:=clause||format(' and %s <= %L::date',dates,p_filters->>'to');end if;
  ordering:=format('t.%I desc nulls last,t.id desc',r.date_column);
 else ordering:='t.id desc';end if;
 for field in select key,value from jsonb_each_text(p_filters) where key not in ('from','to','page','limit','personal_report') loop
  if field.key='active' then
   if field.value='true' and exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_resource and column_name='voided_at') then clause:=clause||' and t.voided_at is null';end if;
   if field.value='true' and exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_resource and column_name='archived_at') then clause:=clause||' and t.archived_at is null';end if;
  elsif field.key=any(array['date','product','category','action','item_id','stock_id','status','feed_type','feed_source','manager_id','requested_by','record_id','id']) and exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_resource and column_name=field.key) then
   clause:=clause||format(' and t.%I::text=%L',field.key,field.value);
  else raise exception using errcode='22023',message='Unsupported record filter';end if;
 end loop;
 execute format('with matched as (select operations_private.row_payload($1,$2,to_jsonb(t),$3) row from public.%I t where %s order by %s), page as (select row from matched limit %s offset %s) select jsonb_build_object(''data'',coalesce((select jsonb_agg(row) from page),''[]''::jsonb),''total'',(select count(*) from matched),''has_more'',(select count(*) from matched)>%s)',p_resource,clause,ordering,size,page*size,(page+1)*size)
  into result using p_actor,p_resource,p_period_id,p_filters;
 return result;
end $$;


create function public.manager_day_read(p_actor uuid,p_period_id uuid,p_date date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;result jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period_id);
 if c->>'status'='awaiting_handover' then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 select to_jsonb(t) into result from manager_period_days t where period_id=p_period_id and date=p_date;
 return result;
end $$;
create function public.manager_account_provision(p_actor uuid,p_id uuid,p_role text,p_name text,p_starts_on date) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare business text;result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if (select activated_at is null from operations_release_state) then raise exception using errcode='55000',message='New account setup is paused during the release';end if;
 business:=case p_role when 'manager' then 'farm' when 'property_manager' then 'property' when 'content_manager' then 'content' end;
 if business is null or p_starts_on is null or nullif(trim(p_name),'') is null then raise exception using errcode='22023',message='Role, name and work start date are required';end if;
 if exists(select 1 from manager_periods where manager_id=p_id) then raise exception using errcode='23514',message='Manage the existing period explicitly';end if;
 update profiles set role=p_role,name=p_name,suspended=false where id=p_id;
 if not found then raise exception using errcode='P0002',message='New account profile is unavailable';end if;
 result:=manager_period_write(p_actor,'provision',jsonb_build_object('manager_id',p_id,'business',business,'starts_on',p_starts_on));
 return (select to_jsonb(p) from profiles p where id=p_id);
end $$;
create function public.manager_release_status(p_actor uuid) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 return (select activated_at is not null from operations_release_state);
end $$;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
revoke all on function manager_day_read(uuid,uuid,date),manager_account_provision(uuid,uuid,text,text,date),manager_release_status(uuid) from public,anon,authenticated;
grant execute on function manager_day_read(uuid,uuid,date),manager_account_provision(uuid,uuid,text,text,date),manager_release_status(uuid) to service_role;
commit;
