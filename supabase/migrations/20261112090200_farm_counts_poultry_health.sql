-- Existing quantities and reports are read as recorded. Decisions post through the stock ledger.
begin;
set local lock_timeout='5s';

alter table public.farm_stock_counts drop constraint farm_stock_counts_resource_check;
alter table public.farm_stock_counts add constraint farm_stock_counts_resource_check check(resource in ('feed','supply','eggs','animals'));

create function operations_private.animal_stock_snapshot(p_actor uuid,p_stock uuid,p_period uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s farm_inventory;latest date;movement_count bigint;
begin
 perform operations_private.require_record(p_actor,'farm_inventory',p_stock,p_period);
 select * into strict s from farm_inventory where id=p_stock;
 if s.product not in ('catfish','chicken','turkey','goat','ram','pig','cattle') then
  raise exception using errcode='22023',message='Choose a livestock item';
 end if;
 select max(date),count(*) into latest,movement_count from farm_inventory_transactions where product=s.product;
 return jsonb_build_object('quantity',s.current_stock,'unit','animals','label',initcap(s.product),'product',s.product,
  'latest_date',latest,'fingerprint',md5(to_jsonb(s)::text||movement_count::text));
end $$;
revoke all on function operations_private.animal_stock_snapshot(uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- Pen notes are observations. Only a named batch collection or approved store movement changes saleable eggs.
create function operations_private.area_observations(p_actor uuid,p_period uuid,p_from date,p_to date,p_poultry_only boolean)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.report_date,'area',r.sections->>'area',
  'actor_name',p.name,'observations',(r.sections->'observations')-array['notes','water_quality']) order by r.report_date desc,r.created_at desc,r.id),'[]')
 from farm_daily_reports r left join profiles p on p.id=r.manager_id
 where r.status='submitted' and r.sections->'template_version'='3'::jsonb and (r.sections->>'area' in ('poultry_a','poultry_b','poultry_c','poultry_d') or (not p_poultry_only and r.sections->'observations'?'animal_count'))
 and (p_from is null or r.report_date>=p_from) and r.report_date<=p_to
 and operations_private.record_visible(p_actor,'farm_daily_reports',to_jsonb(r),p_period);
$$;
revoke all on function operations_private.area_observations(uuid,uuid,date,date,boolean) from public,anon,authenticated,service_role;

do $migration$
declare d text; before_text text;
begin
 d:=pg_get_functiondef('operations_private.store_snapshot(uuid,text,uuid,uuid)'::regprocedure);
 before_text:=' resource_name:=case p_resource';
 if strpos(d,before_text)=0 then raise exception 'Stock snapshot precondition changed';end if;
 execute replace(d,before_text,$fragment$
 if p_resource='animals' then return operations_private.animal_stock_snapshot(p_actor,p_id,p_period);end if;
 resource_name:=case p_resource$fragment$);

 d:=pg_get_functiondef('public.farm_store_write(uuid,text,jsonb,uuid,uuid)'::regprocedure);
 if strpos(d,$needle$if p_payload->>'resource' in ('feed','eggs')$needle$)=0 or strpos(d,$needle$if observed.resource='eggs' then$needle$)=0 then
  raise exception 'Physical count approval precondition changed';
 end if;
 d:=replace(d,$needle$if p_payload->>'resource' in ('feed','eggs')$needle$,$needle$if p_payload->>'resource' in ('feed','eggs','animals')$needle$);
 d:=replace(d,'Count whole bags or whole eggs','Enter a whole count');
 execute replace(d,$needle$if observed.resource='eggs' then$needle$,$fragment$if observed.resource='animals' then
     movement:=farm_v2_write(p_actor,'inventory','update',jsonb_build_object('date',observed.date,
      'expected_current_stock',observed.system_quantity,'target_quantity',observed.quantity),
      observed.asset_id,p_payload->>'reason',md5(p_request::text||':count')::uuid);
     resource_name:='farm_inventory';
    elsif observed.resource='eggs' then$fragment$);

 d:=pg_get_functiondef('public.farm_store_read(uuid,uuid,date)'::regprocedure);
 if strpos(d,'case n.resource when ''eggs''')=0 or strpos(d,'''assets'',assets,''counts'',counts')=0 then
  raise exception 'Physical count report precondition changed';
 end if;
 d:=replace(d,'case n.resource when ''eggs''','case n.resource when ''animals'' then (select initcap(product) from farm_inventory where id=n.asset_id) when ''eggs''');
 execute replace(d,'''assets'',assets,''counts'',counts',$fragment$'assets',assets,'counts',counts,
 'animal_assets',(select coalesce(jsonb_agg(operations_private.animal_stock_snapshot(p_actor,s.id,(c->>'periodId')::uuid)||
 jsonb_build_object('id',s.id,'resource','animals') order by s.product),'[]'::jsonb) from farm_inventory s where
 s.product in ('catfish','chicken','turkey','goat','ram','pig','cattle') and operations_private.record_visible(p_actor,'farm_inventory',to_jsonb(s),(c->>'periodId')::uuid)),
 'area_observations',operations_private.area_observations(p_actor,(c->>'periodId')::uuid,null,p_date,false)$fragment$);

 d:=pg_get_functiondef('public.farm_performance_read(uuid,uuid,date,date)'::regprocedure);
 if strpos(d,'''batches'',batches,''records'',records')=0 then raise exception 'Performance report precondition changed';end if;
 execute replace(d,'''batches'',batches,''records'',records','''batches'',batches,''records'',records,''poultry_observations'',operations_private.area_observations(p_actor,(c->>''periodId'')::uuid,p_from,p_to,true)');

 d:=pg_get_functiondef('public.farm_validate_report(jsonb)'::regprocedure);
 if strpos(d,$needle$field not in ('feed_kg','deaths','eggs','sample_count'$needle$)=0 or strpos(d,$needle$(field in ('deaths','eggs','sample_count')$needle$)=0 then raise exception 'Area report precondition changed';end if;
 d:=replace(d,$needle$field not in ('feed_kg','deaths','eggs','sample_count'$needle$,$needle$field not in ('animal_count','feed_kg','deaths','eggs','sample_count'$needle$);
 execute replace(d,$needle$(field in ('deaths','eggs','sample_count')$needle$,$needle$(field in ('animal_count','deaths','eggs','sample_count')$needle$);
end $migration$;

-- Health observations can be written before a named batch exists. A note never completes a scheduled task.
create table public.farm_health_notes(
 id uuid primary key default gen_random_uuid(),date date not null,actor_id uuid not null references profiles(id),
 period_id uuid not null references manager_periods(id),task_id uuid references farm_health_tasks(id),
 title text not null check(length(trim(title)) between 1 and 200),
 area text check(length(area)<=200),details text not null check(length(trim(details)) between 1 and 4000),
 follow_up date check(follow_up>=date),created_at timestamptz not null default now()
);
create index farm_health_notes_period_date on public.farm_health_notes(period_id,date desc);
alter table public.farm_health_notes enable row level security;
revoke all on public.farm_health_notes from public,anon,authenticated,service_role;
grant select on public.farm_health_notes to service_role;
alter function operations_private.resources() rename to resources_before_health_notes;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_health_notes() union all values('farm_health_notes','farm','date','actor_id',false);
$$;
revoke all on function operations_private.resources(),operations_private.resources_before_health_notes() from public,anon,authenticated,service_role;
create trigger manager_record_guard before insert on farm_health_notes for each row execute function operations_private.guard_record();
create trigger manager_record_attribution after insert on farm_health_notes for each row execute function operations_private.tag_record();
create trigger health_note_immutable before update or delete on farm_health_notes for each row execute function farm_activity_immutable();

do $migration$
declare d text;
begin
 d:=pg_get_functiondef('public.farm_health_write(uuid,text,jsonb,uuid,uuid)'::regprocedure);
 if strpos(d,'if p_operation=''schedule'' then')=0 then raise exception 'Health write precondition changed';end if;
 execute replace(d,'if p_operation=''schedule'' then',$fragment$if p_operation='note' then
  d:=(p_payload->>'date')::date;
  if d is null or d>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='22023',message='Choose the day you observed this';end if;
  if p_id is not null then
   perform operations_private.require_record(p_actor,'farm_health_tasks',p_id,(c->>'periodId')::uuid);
   select * into strict t from farm_health_tasks where id=p_id;
  end if;
  select * into responsible from manager_periods where id=coalesce(t.period_id,(p_payload->>'period_id')::uuid,(c->>'periodId')::uuid)
   and business='farm' and status='active' and ended_at is null;
  if responsible.id is null or (not is_admin and responsible.id is distinct from (c->>'periodId')::uuid)
   or ((p_payload->>'period_id') is not null and responsible.id is distinct from (p_payload->>'period_id')::uuid)
   or ((c->>'periodId') is not null and responsible.id is distinct from (c->>'periodId')::uuid) then
   raise exception using errcode='42501',message='Choose the responsible farm supervisor';
  end if;
  if d<responsible.starts_on then raise exception using errcode='22023',message='Choose a date in the supervisor’s work period';end if;
  perform farm_v2_lock_date(d,is_admin,null);
  perform set_config('operations.period',responsible.id::text,true);
  insert into farm_health_notes(date,actor_id,period_id,task_id,title,area,details,follow_up)
   values(d,p_actor,responsible.id,p_id,trim(p_payload->>'title'),nullif(trim(p_payload->>'area'),''),trim(p_payload->>'details'),(p_payload->>'follow_up')::date)
   returning to_jsonb(farm_health_notes.*) into result;
 elsif p_operation='schedule' then$fragment$);
 d:=pg_get_functiondef('public.farm_health_read(uuid,uuid,date)'::regprocedure);
 if strpos(d,'''tasks'',tasks')=0 then raise exception 'Health read precondition changed';end if;
 execute replace(d,'''tasks'',tasks',$fragment$'tasks',tasks,'notes',(select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('actor_name',p.name,'manager_name',m.name)
  order by n.date desc,n.created_at desc,n.id),'[]') from farm_health_notes n join profiles p on p.id=n.actor_id
  join manager_periods mp on mp.id=n.period_id join profiles m on m.id=mp.manager_id
  where operations_private.record_visible(p_actor,'farm_health_notes',to_jsonb(n),(c->>'periodId')::uuid))$fragment$);
end $migration$;
commit;
