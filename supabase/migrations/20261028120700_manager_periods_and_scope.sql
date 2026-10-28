-- Preconditions: existing Primefield V2, operations, feed and livestock migrations.
-- Adds scope metadata only; no original row/value/legacy actor is backfilled or updated.
-- NULL starts_on means unknown legacy start. Activation captures existing account IDs,
-- not their historical balances. Locks serialize activation with existing business writes.
-- Before personal activity, rollback can leave these additive tables dormant. Afterwards
-- retain the scope boundary and use compatible code; disabling UI must never restore
-- business-wide access for a personal account. No destructive down migration is safe.
begin;
create schema if not exists operations_private;
revoke all on schema operations_private from public,anon,authenticated,service_role;
create table public.operations_release_state(
 id boolean primary key default true check(id),enabled boolean not null default false,
 activated_at timestamptz,activated_by uuid references public.profiles(id)
);
insert into public.operations_release_state(id) values(true);
create table public.manager_periods(
 id uuid primary key default gen_random_uuid(),manager_id uuid not null references profiles(id),
 business text not null check(business in ('farm','property','content')),
 mode text not null check(mode in ('legacy','personal')),starts_on date,
 status text not null check(status in ('active','awaiting_handover','closed')),
 ended_at timestamptz,created_by uuid not null references profiles(id),created_at timestamptz not null default now(),
 check((mode='legacy' and starts_on is null) or (mode='personal' and starts_on is not null)),
 check((status='closed')=(ended_at is not null))
);
create unique index manager_period_active on manager_periods(manager_id,business) where ended_at is null;
create table public.manager_record_links(
 resource text not null,record_id uuid not null,period_id uuid references manager_periods(id),
 recorded_by uuid references profiles(id),linked_at timestamptz not null default now(),primary key(resource,record_id)
);
create index manager_record_period on manager_record_links(period_id,resource,record_id);
create table public.manager_asset_assignments(
 period_id uuid not null references manager_periods(id),resource text not null,record_id uuid not null,
 assigned_by uuid not null references profiles(id),assigned_at timestamptz not null default now(),
 primary key(period_id,resource,record_id)
);
create table public.manager_period_days(
 period_id uuid not null references manager_periods(id),date date not null,
 status text not null default 'open' check(status in ('open','closed')),
 closed_by uuid references profiles(id),closed_at timestamptz,primary key(period_id,date),
 check((status='closed')=(closed_at is not null and closed_by is not null))
);

create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$ values
 ('farm_sales','farm','date','created_by',false),('farm_expenses','farm','date','created_by',false),
 ('farm_feed_purchases','farm','date','created_by',false),('farm_fund_transfers','farm','date','created_by',false),
 ('farm_inventory','farm',null,null,true),('farm_inventory_transactions','farm','date','created_by',false),
 ('farm_daily_records','farm','date','manager_id',false),('farm_daily_feed','farm','date','created_by',false),
 ('farm_feed_stock','farm','opening_date','initialized_by',true),('farm_feed_stock_movements','farm','movement_date','actor_id',false),
 ('farm_supply_inventory','farm',null,null,true),('farm_supply_transactions','farm','date','created_by',false),
 ('farm_livestock_groups','farm',null,'created_by',true),('farm_livestock_events','farm','event_date','actor_id',false),
 ('farm_daily_reports','farm','report_date','manager_id',false),('farm_operational_requests','farm','request_date','requested_by',false),
 ('farm_activity','farm','happened_at','actor_id',false),('farm_correction_requests','farm','created_at','requested_by',false),
 ('farm_operation_events','farm','happened_at','actor_id',false),
 ('property_properties','property',null,'created_by',true),('property_units','property',null,'created_by',true),
 ('property_tenancies','property','start_date','created_by',true),('property_rent_payments','property','payment_date','created_by',false),
 ('property_expenses','property','expense_date','created_by',false),('property_maintenance','property',null,'created_by',false),
 ('property_events','property','happened_at','actor_id',false),
 ('content_records','content','created_at','created_by',true),('content_performance','content','metric_date','created_by',false),
 ('content_leads','content','lead_date','created_by',false),('content_sales','content','sale_date','created_by',false),
 ('content_social_integrations','content',null,'created_by',true),('content_audit','content','happened_at','actor_id',false)
$$;

create function public.manager_context(p_actor uuid,p_business text,p_period_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare a profiles; p manager_periods; activated timestamptz; expected_role text;
begin
 select * into a from profiles where id=p_actor and not suspended;
 expected_role:=case p_business when 'farm' then 'manager' when 'property' then 'property_manager' when 'content' then 'content_manager' end;
 if a.id is null or expected_role is null or a.role not in ('admin',expected_role) then raise exception using errcode='42501',message='Manager access required';end if;
 if a.role='admin' and p_period_id is null then
  return jsonb_build_object('business',p_business,'actorId',a.id,'mode','admin_all','managerId',null,'periodId',null,'startsOn',null,'status','active');
 end if;
 if p_period_id is not null then select * into p from manager_periods where id=p_period_id and business=p_business;
 else select * into p from manager_periods where manager_id=a.id and business=p_business and ended_at is null;end if;
 if p_period_id is not null and (p.id is null or (a.role<>'admin' and p.manager_id<>a.id)) then raise exception using errcode='42501',message='Own manager period only';end if;
 if p.id is null then
  select activated_at into activated from operations_release_state;
  if activated is not null then raise exception using errcode='42501',message='Account setup is incomplete. Ask Bimbo to finish assigning access.';end if;
  return jsonb_build_object('business',p_business,'actorId',a.id,'mode','legacy','managerId',a.id,'periodId',null,'startsOn',null,'status','active');
 end if;
 return jsonb_build_object('business',p.business,'actorId',a.id,'mode',p.mode,'managerId',p.manager_id,'periodId',p.id,'startsOn',p.starts_on,'status',p.status);
end $$;

create function public.manager_period_write(p_actor uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p manager_periods; person profiles; item jsonb; business_name text; asset_exists boolean;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if p_operation='activate' then
  perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
  perform pg_advisory_xact_lock(hashtextextended('property-operations',0));
  perform pg_advisory_xact_lock(hashtextextended('content-operations',0));
  if (select activated_at is not null from operations_release_state) then return jsonb_build_object('active',true);end if;
  insert into manager_periods(manager_id,business,mode,status,created_by)
   select id,case role when 'manager' then 'farm' when 'property_manager' then 'property' else 'content' end,'legacy','active',p_actor
   from profiles where role in ('manager','property_manager','content_manager');
  update operations_release_state set enabled=true,activated_at=now(),activated_by=p_actor;
  return jsonb_build_object('active',true);
 end if;
 if p_operation='provision' then
  select * into person from profiles where id=(p_payload->>'manager_id')::uuid and not suspended;
  business_name:=case person.role when 'manager' then 'farm' when 'property_manager' then 'property' when 'content_manager' then 'content' end;
  if business_name is null or business_name is distinct from p_payload->>'business' then raise exception using errcode='42501',message='Account role does not match business';end if;
  if coalesce(p_payload->>'starts_on','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception using errcode='22023',message='A work start date is required';end if;
  select * into p from manager_periods where manager_id=person.id and business=business_name and ended_at is null;
  if p.id is not null then
   if p.mode='personal' and p.starts_on=(p_payload->>'starts_on')::date then return to_jsonb(p);end if;
   raise exception using errcode='23514',message='Close the existing period explicitly before starting another';
  end if;
  insert into manager_periods(manager_id,business,mode,starts_on,status,created_by)
   values(person.id,business_name,'personal',(p_payload->>'starts_on')::date,case when business_name='farm' then 'awaiting_handover' else 'active' end,p_actor) returning * into p;
  return to_jsonb(p);
 end if;
 if p_operation='assign' then
  select * into p from manager_periods where id=(p_payload->>'period_id')::uuid and ended_at is null;
  if p.id is null then raise exception using errcode='22023',message='Choose an active period';end if;
  for item in select value from jsonb_array_elements(p_payload->'assets') loop
   if not exists(select 1 from operations_private.resources() r where r.resource=item->>'resource' and r.business=p.business and r.is_asset) then raise exception using errcode='22023',message='Invalid business asset';end if;
   execute format('select exists(select 1 from public.%I where id=$1)',item->>'resource') into asset_exists using (item->>'record_id')::uuid;
   if not asset_exists then raise exception using errcode='P0002',message='Asset not found';end if;
   insert into manager_asset_assignments(period_id,resource,record_id,assigned_by) values(p.id,item->>'resource',(item->>'record_id')::uuid,p_actor) on conflict do nothing;
  end loop;
  return to_jsonb(p);
 end if;
 raise exception using errcode='22023',message='Unknown manager-period operation';
end $$;

create function operations_private.record_visible(p_actor uuid,p_resource text,p_row jsonb,p_period_id uuid default null,p_personal_report boolean default false)
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
 if link.record_id is not null then return false;end if;
 if p_period_id is not null or p_personal_report then
  creator:=nullif(p_row->>r.actor_column,'')::uuid;
  return creator=(c->>'managerId')::uuid;
 end if;
 select activated_at into activated from operations_release_state;
 return activated is null or coalesce((p_row->>'created_at')::timestamptz,(p_row->>'happened_at')::timestamptz,'-infinity')<=activated;
exception when insufficient_privilege then return false;
end $$;

create function public.manager_can_read_record(p_resource text,p_row jsonb)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select operations_private.record_visible(auth.uid(),p_resource,p_row)
$$;

create function public.manager_read_records(p_actor uuid,p_business text,p_resource text,p_period_id uuid default null,p_filters jsonb default '{}')
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
  elsif field.key=any(array['date','product','category','action','item_id','stock_id','status','feed_type','feed_source','manager_id','requested_by','record_id']) and exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_resource and column_name=field.key) then
   clause:=clause||format(' and t.%I::text=%L',field.key,field.value);
  else raise exception using errcode='22023',message='Unsupported record filter';end if;
 end loop;
 execute format('with matched as (select to_jsonb(t) row from public.%I t where %s order by %s), page as (select row from matched limit %s offset %s) select jsonb_build_object(''data'',coalesce((select jsonb_agg(row) from page),''[]''::jsonb),''total'',(select count(*) from matched),''has_more'',(select count(*) from matched)>%s)',p_resource,clause,ordering,size,page*size,(page+1)*size)
  into result using p_actor,p_resource,p_period_id,p_filters;
 return result;
end $$;

create function operations_private.tag_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; payload jsonb:=to_jsonb(new); actor uuid; p manager_periods; selected uuid; role_name text;
begin
 if (select activated_at is null from operations_release_state) then return new;end if;
 select * into r from operations_private.resources() where resource=tg_table_name;
 actor:=coalesce(nullif(payload->>r.actor_column,'')::uuid,nullif(current_setting('operations.actor',true),'')::uuid);
 if actor is null then return new;end if;
 select role into role_name from profiles where id=actor and not suspended;
 if role_name is null then raise exception using errcode='42501',message='Active recording actor required';end if;
 selected:=nullif(current_setting('operations.period',true),'')::uuid;
 if role_name='admin' then
  if selected is not null then select * into p from manager_periods where id=selected and business=r.business; if p.id is null then raise exception using errcode='42501',message='Invalid responsible manager';end if;end if;
 else
  select * into p from manager_periods where manager_id=actor and business=r.business and ended_at is null;
  if p.id is null or p.status<>'active' then raise exception using errcode='42501',message='Active manager period required';end if;
 end if;
 insert into manager_record_links(resource,record_id,period_id,recorded_by) values(tg_table_name,new.id,p.id,actor);
 return new;
end $$;

do $$ declare r record; policy record;begin
 for r in select * from operations_private.resources() loop
  if to_regclass('public.'||r.resource) is null then raise exception 'Missing prerequisite table %',r.resource;end if;
  execute format('alter table public.%I enable row level security',r.resource);
  -- Runtime mutations use existing guarded service RPCs, not authenticated table writes.
  execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from anon,authenticated',r.resource);
  for policy in select policyname from pg_policies where schemaname='public' and tablename=r.resource and cmd='SELECT' loop
   execute format('drop policy %I on public.%I',policy.policyname,r.resource);
  end loop;
  execute format('create policy manager_period_role_read on public.%I for select to authenticated using (true)',r.resource);
  -- Restrictive policies AND with old permissive ALL policies instead of being bypassed by them.
  execute format('create policy manager_period_read on public.%I as restrictive for select to authenticated using (public.manager_can_read_record(%L,to_jsonb(%I.*)))',r.resource,r.resource,r.resource);
  execute format('grant select on public.%I to authenticated',r.resource);
  execute format('create trigger manager_record_attribution after insert on public.%I for each row execute function operations_private.tag_record()',r.resource);
 end loop;
 for r in select unnest(array['manager_periods','manager_record_links','manager_asset_assignments','manager_period_days','operations_release_state']) name loop
  execute format('alter table public.%I enable row level security',r.name);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',r.name);
  execute format('grant select on public.%I to service_role',r.name);
 end loop;
end $$;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
revoke all on function manager_context(uuid,text,uuid),manager_period_write(uuid,text,jsonb),manager_read_records(uuid,text,text,uuid,jsonb),manager_can_read_record(text,jsonb) from public,anon,authenticated;
grant execute on function manager_context(uuid,text,uuid),manager_period_write(uuid,text,jsonb),manager_read_records(uuid,text,text,uuid,jsonb) to service_role;
grant execute on function manager_can_read_record(text,jsonb) to authenticated;
commit;
