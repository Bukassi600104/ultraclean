-- Preconditions: manager scope/write guards and existing farm inventory/feed routines.
-- No legacy source row is updated or seeded. Unknown feed counts remain NULL.
-- Handover snapshots/ticks/acceptance add metadata and append-only activity only.
-- Shared provisioning/stock locks serialize final verification with actual stock writes.
-- Retain accepted snapshots and access guards on rollback; acceptance never resets stock.
begin;
create table public.manager_handover_sessions(
 id uuid primary key default gen_random_uuid(),period_id uuid not null unique references manager_periods(id),
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),checked_at timestamptz not null default now(),
 accepted_at timestamptz,accepted_by uuid references profiles(id),
 check((status='accepted')=(accepted_at is not null and accepted_by is not null))
);
create table public.manager_handover_items(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references manager_handover_sessions(id),
 item_key text not null,resource text not null,record_id uuid,step_key text not null,
 snapshot jsonb not null,version text not null,present boolean not null default true,
 status text not null default 'pending' check(status in ('pending','confirmed','cannot_confirm')),
 decided_at timestamptz,unique(session_id,item_key)
);
create index manager_handover_issues on manager_handover_items(session_id,status) where present;
do $$ declare t text;begin
 foreach t in array array['manager_handover_sessions','manager_handover_items'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;

create function operations_private.handover_sources()
returns table(item_key text,resource text,record_id uuid,step_key text,snapshot jsonb,version text)
language sql stable security definer set search_path=public,pg_temp as $$
 with livestock as (select value row from jsonb_array_elements(farm_livestock_balances())),
 inventory as (
  select i.*,coalesce((select jsonb_agg(l.row||jsonb_build_object('quantity',l.row->>'quantity') order by l.row->>'growth_stage',l.row->>'sex',l.row->>'chicken_type',l.row->>'id') from livestock l where l.row->>'product'=i.product),'[]'::jsonb) details
  from farm_inventory i
 ), feed_keys as (
  select feed_type,feed_source from farm_feed_stock union select feed_type,feed_source from farm_feed_purchases union select feed_type,feed_source from farm_daily_feed
 ), sources as (
  select 'inventory:'||i.id item_key,'farm_inventory' resource,i.id record_id,'stock' step_key,
   jsonb_build_object('label',i.product,'quantity',i.current_stock::text,'unit',case when product='catfish' then 'fish' when product in ('chicken','turkey') then 'birds' when product in ('goat','cattle','pig') then 'animals' else 'recorded units' end,'details',i.details) snapshot,
   md5(to_jsonb(i)::text) version from inventory i
  union all
  select 'feed:'||k.feed_type||':'||k.feed_source,'farm_feed_stock',s.id,'feed',
   jsonb_build_object('label',k.feed_type||' feed · '||k.feed_source,'quantity',s.current_bags::text,'unit','unopened bags','feedType',k.feed_type,'feedSource',k.feed_source,'details','[]'::jsonb),md5(jsonb_build_array(k.feed_type,k.feed_source,to_jsonb(s))::text)
   from feed_keys k left join farm_feed_stock s using(feed_type,feed_source)
  union all
  select 'supply:'||s.id,'farm_supply_inventory',s.id,'supplies',
   jsonb_build_object('label',s.item_name,'quantity',s.current_quantity::text,'unit',s.unit,'category',s.category,'details','[]'::jsonb),md5(to_jsonb(s)::text)
   from farm_supply_inventory s where s.archived_at is null
 )
 select * from sources order by step_key,item_key
$$;

create function operations_private.handover_view(p_session uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 with numbered as (
  select h.*,((row_number() over(partition by step_key order by item_key)-1)/6)::integer batch
  from manager_handover_items h where session_id=p_session and present
 ), steps as (
  select step_key,batch,jsonb_agg(snapshot||jsonb_build_object('itemId',id,'resource',resource,'recordId',record_id,'version',version,'status',status) order by item_key) items
  from numbered group by step_key,batch
 )
 select jsonb_build_object('sessionId',s.id,'periodId',s.period_id,'status',case when s.status='accepted' then 'active' else 'awaiting_handover' end,
  'asOf',s.checked_at,'acceptedAt',s.accepted_at,'snapshotVersion',coalesce((select md5(string_agg(item_key||version,',' order by item_key)) from numbered),'empty'),
  'steps',coalesce((select jsonb_agg(jsonb_build_object('id',step_key||':'||batch,'title',case step_key when 'stock' then 'Livestock and stock' when 'feed' then 'Feed' else 'Farm supplies' end,'items',items) order by case step_key when 'stock' then 1 when 'feed' then 2 else 3 end,batch) from steps),'[]'::jsonb),
  'issues',coalesce((select jsonb_agg(jsonb_build_object('itemId',id,'label',snapshot->>'label','status',status,'countNeeded',snapshot->>'quantity' is null)) from numbered where status='cannot_confirm' or snapshot->>'quantity' is null),'[]'::jsonb)
 ) from manager_handover_sessions s where s.id=p_session
$$;

create function public.handover_write(p_actor uuid,p_operation text,p_session_id uuid default null,p_items jsonb default '[]',p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;s manager_handover_sessions;source record;choice jsonb;item manager_handover_items;before_state jsonb;after_state jsonb;fingerprint text;receipt manager_write_contexts;old_actor text:=current_setting('operations.actor',true);old_period text:=current_setting('operations.period',true);old_handover text:=current_setting('operations.handover',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 c:=manager_context(p_actor,'farm');
 if c->>'mode'<>'personal' then
  if p_operation='get' then return jsonb_build_object('status','active','periodId',c->'periodId','sessionId',null,'steps','[]'::jsonb,'issues','[]'::jsonb);end if;
  raise exception using errcode='42501',message='Only the new manager can accept their inventory handover';
 end if;
 if p_operation not in ('get','save','finalize') or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>500 or octet_length(p_items::text)>100000 then raise exception using errcode='22023',message='Invalid handover operation';end if;
 if p_operation<>'get' and p_request_id is null then raise exception using errcode='22023',message='A retry identifier is required';end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 insert into manager_handover_sessions(period_id) values((c->>'periodId')::uuid) on conflict do nothing;
 select * into s from manager_handover_sessions where period_id=(c->>'periodId')::uuid for update;
 if p_session_id is not null and p_session_id<>s.id then raise exception using errcode='42501',message='Own handover only';end if;
 if s.status='accepted' then return operations_private.handover_view(s.id);end if;
 if c->>'status'<>'awaiting_handover' then raise exception using errcode='42501',message='No pending handover for this period';end if;
 perform set_config('operations.actor',p_actor::text,true);perform set_config('operations.period',c->>'periodId',true);perform set_config('operations.handover','1',true);
 before_state:=operations_private.handover_view(s.id);
 update manager_handover_items set present=false where session_id=s.id;
 for source in select * from operations_private.handover_sources() loop
  insert into manager_handover_items(session_id,item_key,resource,record_id,step_key,snapshot,version)
   values(s.id,source.item_key,source.resource,source.record_id,source.step_key,source.snapshot,source.version)
   on conflict(session_id,item_key) do update set snapshot=excluded.snapshot,record_id=excluded.record_id,version=excluded.version,present=true,
    status=case when manager_handover_items.version=excluded.version then manager_handover_items.status else 'pending' end,
    decided_at=case when manager_handover_items.version=excluded.version then manager_handover_items.decided_at else null end;
 end loop;
 update manager_handover_sessions set checked_at=now() where id=s.id;
 after_state:=operations_private.handover_view(s.id);
 if before_state->>'snapshotVersion' is distinct from after_state->>'snapshotVersion' then
  insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason)
   values('handover',s.id,'snapshot',p_actor,before_state,after_state,'Current recorded inventory; no stock movement');
 end if;
 if p_operation<>'get' then
  fingerprint:=md5(jsonb_build_array('handover',p_operation,s.id,p_items)::text);
  select * into receipt from manager_write_contexts where actor_id=p_actor and request_id=p_request_id;
  if receipt.request_id is not null and (receipt.period_id is distinct from s.period_id or receipt.fingerprint<>fingerprint) then raise exception using errcode='23514',message='Retry identifier belongs to a different handover decision';end if;
  insert into manager_write_contexts(actor_id,request_id,period_id,fingerprint) values(p_actor,p_request_id,s.period_id,fingerprint) on conflict do nothing;
  for choice in select value from jsonb_array_elements(p_items) loop
   select * into item from manager_handover_items where session_id=s.id and id=(choice->>'itemId')::uuid and present;
   if item.id is null then raise exception using errcode='42501',message='Item is outside this handover';end if;
   if item.version is distinct from choice->>'version' then after_state:=after_state||jsonb_build_object('conflict','inventory_changed');exit;end if;
  end loop;
  if after_state->>'conflict' is null then
   for choice in select value from jsonb_array_elements(p_items) loop
    if choice->>'status' not in ('confirmed','cannot_confirm') or choice->>'status' is null then raise exception using errcode='22023',message='Choose confirmed or cannot confirm';end if;
    select * into item from manager_handover_items where session_id=s.id and id=(choice->>'itemId')::uuid;
    if choice->>'status'='confirmed' and item.snapshot->>'quantity' is null then raise exception using errcode='22023',message='Record the real starting feed count first; an unknown count is not zero';end if;
    if item.status is distinct from choice->>'status' then
     update manager_handover_items set status=choice->>'status',decided_at=now() where id=item.id;
     insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason)
      values('handover',s.id,'item_confirmation',p_actor,to_jsonb(item),choice,'Manager physical inventory confirmation');
    end if;
   end loop;
   if p_operation='finalize' then
    if (now() at time zone 'Africa/Lagos')::date<(c->>'startsOn')::date then raise exception using errcode='42501',message='Accept the handover on or after your work start date';end if;
    if exists(select 1 from manager_handover_items where session_id=s.id and present and (status<>'confirmed' or snapshot->>'quantity' is null)) then
     after_state:=operations_private.handover_view(s.id)||jsonb_build_object('conflict','confirmation_required');
    else
     insert into manager_asset_assignments(period_id,resource,record_id,assigned_by)
      select s.period_id,resource,record_id,p_actor from manager_handover_items where session_id=s.id and present and record_id is not null on conflict do nothing;
     insert into manager_asset_assignments(period_id,resource,record_id,assigned_by)
      select s.period_id,'farm_livestock_groups',g.id,p_actor from farm_livestock_groups g join farm_inventory i on i.product=g.product join manager_handover_items h on h.record_id=i.id and h.resource='farm_inventory' and h.session_id=s.id and h.present on conflict do nothing;
     update manager_periods set status='active' where id=s.period_id and status='awaiting_handover';
     update manager_handover_sessions set status='accepted',accepted_at=now(),accepted_by=p_actor where id=s.id;
     insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason)
      values('handover',s.id,'accepted',p_actor,before_state,operations_private.handover_view(s.id),'Manager accepted the current inventory at the start of responsibility; no financial opening created');
     after_state:=operations_private.handover_view(s.id);
    end if;
   else after_state:=operations_private.handover_view(s.id);end if;
  end if;
 end if;
 perform set_config('operations.actor',coalesce(old_actor,''),true);perform set_config('operations.period',coalesce(old_period,''),true);perform set_config('operations.handover',coalesce(old_handover,''),true);
 return after_state;
end $$;
revoke all on function handover_write(uuid,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function handover_write(uuid,text,uuid,jsonb,uuid) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;

create or replace function operations_private.tag_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
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
  if p.id is null or (p.status<>'active' and not (tg_table_name='farm_activity' and payload->>'record_type'='handover' and current_setting('operations.handover',true)='1')) then raise exception using errcode='42501',message='Active manager period required';end if;
 end if;
 insert into manager_record_links(resource,record_id,period_id,recorded_by) values(tg_table_name,new.id,p.id,actor);
 return new;
end $$;

create or replace function operations_private.guard_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid; c jsonb; r record; value jsonb:=to_jsonb(new); reference record; target text; actual_date date; selected uuid;
begin
 if (select activated_at is null from operations_release_state) then return new;end if;
 actor:=nullif(current_setting('operations.actor',true),'')::uuid;
 if actor is null then raise exception using errcode='42501',message='Use the guarded operations workflow';end if;
 select * into r from operations_private.resources() where resource=tg_table_name;
 selected:=nullif(current_setting('operations.period',true),'')::uuid;
 c:=manager_context(actor,r.business,selected);
 if exists(select 1 from profiles where id=actor and role='admin') then return new;end if;
 if c->>'status'<>'active' and tg_table_name='farm_activity' and value->>'record_type'='handover' and current_setting('operations.handover',true)='1' then return new;end if;
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

revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
