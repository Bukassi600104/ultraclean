-- Preconditions: manager scopes/handover and the existing feed stock ledger.
-- No historical receipt, purchase, movement, quantity or actor is backfilled.
-- A verified starting count replaces unknown stock only through an actual user action.
-- Shared provisioning/stock/date locks serialize all new physical effects.
-- Retain this additive history and its links on rollback; never reset established counts.
begin;
-- Daily feeding already accepts fractional bag equivalents in the UI/API.
-- Widen only that quantity without a fixed scale, so every old integer serializes
-- identically. This brief table rewrite needs the coordinated farm-write pause.
-- Do not narrow it again after fractional feeding has been recorded.
alter table public.farm_daily_feed alter column num_bags type numeric using num_bags::numeric;
alter table public.farm_daily_feed add constraint farm_daily_feed_original_range check(num_bags<=2147483647);
do $$ declare definition text;updated text;clause text;replacement text;matched integer:=0;begin
 definition:=pg_get_functiondef('public.farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 updated:=definition;
 for clause in select split_part(line,E'\n',1) from regexp_split_to_table(definition,E'\n') line where line like '%elsif p_kind=''daily_feed'' then%' loop
  replacement:=replace(clause,'::integer','::numeric');
  if replacement=clause then raise exception 'Daily feeding cast precondition changed; review the writer before migration';end if;
  updated:=replace(updated,clause,replacement);matched:=matched+1;
 end loop;
 if matched<>2 then raise exception 'Expected both daily feeding create/correction casts; found %',matched;end if;
 execute updated;
end $$;
create table public.farm_feed_activities(
 id uuid primary key default gen_random_uuid(),stock_id uuid not null references farm_feed_stock(id),
 period_id uuid references manager_periods(id),kind text not null check(kind in ('starting','received','opened','problem')),
 bags integer not null check(bags>=0),activity_date date not null,actor_id uuid not null references profiles(id),
 recorded_at timestamptz not null default now(),notes text,included_in_starting_count boolean,
 resulting_bags integer,stock_revision integer not null,review_request_id uuid unique references farm_operational_requests(id),
 review_status text not null default 'not_requested' check(review_status in ('not_requested','pending','approved','declined')),
 reviewed_by uuid references profiles(id),reviewed_at timestamptz,review_note text
);
alter table farm_feed_stock_movements add column feed_activity_id uuid unique references farm_feed_activities(id);
do $$ declare item record;matched integer:=0;begin
 for item in select conname from pg_constraint where conrelid='farm_feed_stock_movements'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%purchase_id%' and pg_get_constraintdef(oid) like '%daily_feed_id%' loop
  execute format('alter table farm_feed_stock_movements drop constraint %I',item.conname);matched:=matched+1;
 end loop;
 if matched<>1 then raise exception 'Feed movement link precondition changed; review before migration';end if;
end $$;
alter table farm_feed_stock_movements add constraint farm_feed_movement_physical_link_check check(
 (movement_type='receipt' and bags_delta>0 and (purchase_id is not null or feed_activity_id is not null))
 or (movement_type='use' and bags_delta<0 and (daily_feed_id is not null or feed_activity_id is not null))
 or (movement_type='opening' and bags_delta>=0 and resulting_bags=bags_delta)
 or (movement_type='adjust' and bags_delta<>0)
);
create table public.farm_feed_activity_receipts(
 actor_id uuid not null references profiles(id),request_id uuid not null,period_id uuid references manager_periods(id),
 fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create table public.farm_feed_start_inclusions(
 starting_activity_id uuid not null references farm_feed_activities(id),movement_id uuid not null unique references farm_feed_stock_movements(id),
 included boolean not null,decided_by uuid not null references profiles(id),decided_at timestamptz not null default now(),primary key(starting_activity_id,movement_id)
);
create table public.farm_feed_purchase_links(
 purchase_id uuid primary key references farm_feed_purchases(id),activity_id uuid unique references farm_feed_activities(id),
 delivery_confirmed boolean not null,recorded_by uuid not null references profiles(id),recorded_at timestamptz not null default now()
);
create table public.farm_daily_feed_activity_links(
 daily_feed_id uuid primary key references farm_daily_feed(id),activity_id uuid references farm_feed_activities(id),new_bags_opened integer not null check(new_bags_opened>=0),
 recorded_by uuid not null references profiles(id),recorded_at timestamptz not null default now()
);
create index farm_feed_activity_history on farm_feed_activities(stock_id,recorded_at desc);
do $$ declare t text;begin
 foreach t in array array['farm_feed_activities','farm_feed_activity_receipts','farm_feed_start_inclusions','farm_feed_purchase_links','farm_daily_feed_activity_links'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;

create function operations_private.feed_balance(p_stock uuid,p_date date)
returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select sum(m.bags_delta) from farm_feed_stock_movements m join farm_feed_stock s on s.id=m.stock_id
 where m.stock_id=p_stock and m.movement_date<=p_date and m.movement_date>=s.opening_date
 and ((m.created_at>=s.initialized_at and m.resulting_bags is not null) or exists(select 1 from farm_feed_start_inclusions i where i.movement_id=m.id and not i.included))
$$;
create function operations_private.feed_minimum(p_stock uuid,p_date date)
returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 with days as (
  select distinct movement_date d from farm_feed_stock_movements where stock_id=p_stock and movement_date>=p_date
  union select p_date
 ) select min(operations_private.feed_balance(p_stock,d)) from days
$$;

create function public.farm_feed_activity_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;s farm_feed_stock;a farm_feed_activities;m farm_feed_stock_movements;r farm_feed_activity_receipts;receipt record;choice jsonb;
 d date;bags integer;delta integer;carry integer:=0;v_result jsonb;fp text;request_row jsonb;period uuid;child uuid;included boolean;
 daily_row farm_daily_feed;
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);saved_start text:=current_setting('operations.feed_starting',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 c:=manager_context(p_actor,'farm',coalesce(nullif(p_payload->>'manager_period_id','')::uuid,nullif(current_setting('operations.period',true),'')::uuid));
 if not(select enabled from operations_release_state) then raise exception using errcode='55000',message='Feed recording is briefly paused for the update. Keep this entry and retry shortly';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 or p_request_id is null then raise exception using errcode='22023',message='A valid feed entry and retry identifier are required';end if;
 if c->>'status'<>'active' and not (c->>'status'='awaiting_handover' and p_operation='starting') and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 period:=(c->>'periodId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 fp:=encode(sha256(convert_to(jsonb_build_array(p_operation,p_payload,p_id,p_reason)::text,'UTF8')),'hex');
 select * into r from farm_feed_activity_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then
  if r.period_id is distinct from period or r.fingerprint<>fp then raise exception using errcode='23514',message='Retry identifier belongs to a different feed entry or period';end if;return r.result;
 end if;
 perform set_config('operations.actor',p_actor::text,true);perform set_config('operations.period',coalesce(period::text,''),true);
 if p_operation='review_problem' then
  if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can review a count correction';end if;
  select * into a from farm_feed_activities where id=p_id and kind='problem' for update;
  if a.id is null then raise exception using errcode='P0002',message='Count check not found';end if;
  if p_payload->>'decision' not in ('approve','decline') or nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='Choose a decision and provide a reason';end if;
  select * into s from farm_feed_stock where id=a.stock_id for update;
  if a.reviewed_at is not null then
   if a.review_status=(case p_payload->>'decision' when 'approve' then 'approved' else 'declined' end) then v_result:=jsonb_build_object('stock',to_jsonb(s),'activity',to_jsonb(a),'already_reviewed',true);
   else raise exception using errcode='23514',message='This count check has already been reviewed';end if;
  else
   perform set_config('operations.period',coalesce(a.period_id::text,''),true);
   d:=a.activity_date;
   perform farm_v2_lock_date(d,true,p_reason);
   if p_payload->>'decision'='approve' then
    if coalesce(p_payload->>'expected_revision','')!~'^[0-9]+$' or (p_payload->>'expected_revision')::integer<>a.stock_revision or s.revision<>a.stock_revision then raise exception using errcode='40001',message='Feed changed since this check. Ask the manager to confirm the current count';end if;
    delta:=a.bags-operations_private.feed_balance(s.id,d);
    if delta is null or operations_private.feed_minimum(s.id,d)+delta<0 then raise exception using errcode='23514',message='This count would conflict with recorded feed use. Review the dated history first';end if;
    if delta<>0 then
     child:=md5(a.id::text||':count-adjustment')::uuid;
     perform farm_feed_stock_write_before_manager_periods(p_actor,'adjust',jsonb_build_object('date',d,'bags_delta',delta,'expected_revision',s.revision),s.id,p_reason,child);
    end if;
   end if;
   select to_jsonb(t) into request_row from farm_operational_requests t where id=a.review_request_id;
   if request_row->>'status'='pending' then
    perform farm_operations_write(p_actor,'request',case p_payload->>'decision' when 'approve' then 'approve' else 'decline' end,jsonb_build_object('expected_revision',(request_row->>'revision')::integer,'ceo_response',p_reason),a.review_request_id,p_reason,md5(a.id::text||':decision')::uuid);
   end if;
   update farm_feed_activities set review_status=case p_payload->>'decision' when 'approve' then 'approved' else 'declined' end,reviewed_by=p_actor,reviewed_at=now(),review_note=p_reason where id=a.id returning * into a;
   select * into s from farm_feed_stock where id=s.id;
   insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason,record_date) values('feed_stock',s.id,'count_review',p_actor,jsonb_build_object('requested_count',a.bags),jsonb_build_object('activity',to_jsonb(a),'stock',to_jsonb(s)),p_reason,d);
   v_result:=jsonb_build_object('stock',to_jsonb(s),'activity',to_jsonb(a));
  end if;
 else
  if p_operation not in ('starting','received','opened','problem') then raise exception using errcode='22023',message='Choose a feed activity';end if;
  d:=(p_payload->>'date')::date;
  if d is null or d>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='22023',message='Use the actual activity date, no later than today';end if;
  if c->>'mode'='personal' and d<(c->>'startsOn')::date and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Feed activity cannot predate your work start';end if;
  if coalesce(p_payload->>'bags','')!~'^[0-9]{1,8}$' then raise exception using errcode='22023',message='Enter a whole bag count';end if;
  bags:=(p_payload->>'bags')::integer;
  if p_operation in ('received','opened') and bags<1 then raise exception using errcode='22023',message='Enter at least one bag';end if;
  if length(coalesce(p_payload->>'notes',''))>2000 then raise exception using errcode='22023',message='Keep the note within 2000 characters';end if;
  perform set_config('operations.feed_starting',case when p_operation='starting' then '1' else '' end,true);
  perform farm_v2_lock_date(d,exists(select 1 from profiles where id=p_actor and role='admin'),p_reason);
  insert into farm_feed_stock(feed_type,feed_source) values(p_payload->>'feed_type',coalesce(p_payload->>'feed_source','local')) on conflict(feed_type,feed_source) do nothing;
  select * into s from farm_feed_stock where feed_type=p_payload->>'feed_type' and feed_source=coalesce(p_payload->>'feed_source','local') for update;
  if p_operation<>'starting' or c->>'status'='active' then perform operations_private.require_record(p_actor,'farm_feed_stock',s.id,period);end if;
  if p_payload->>'daily_feed_id' is not null then
   perform operations_private.require_record(p_actor,'farm_daily_feed',(p_payload->>'daily_feed_id')::uuid,period);
   select * into daily_row from farm_daily_feed where id=(p_payload->>'daily_feed_id')::uuid;
   if p_operation<>'opened' or daily_row.date<>d or daily_row.feed_type<>s.feed_type or daily_row.feed_source<>s.feed_source then raise exception using errcode='23514',message='Opening must match the feeding date and feed type';end if;
  end if;
  if p_operation='starting' then
   if s.initialized_at is not null then raise exception using errcode='23514',message='The starting count is already recorded. Report a count problem for an audited correction';end if;
   delta:=bags;
  else
   if p_operation in ('opened','problem') and s.initialized_at is null then raise exception using errcode='23514',message='Record the actual starting bag count first';end if;
   if p_operation in ('opened','problem') and d<s.opening_date then raise exception using errcode='22023',message='This date is before the verified starting count';end if;
   delta:=case p_operation when 'received' then bags when 'opened' then -bags else 0 end;
   if p_operation='received' and s.initialized_at is not null and d<=s.opening_date then
    if not p_payload ? 'included_in_starting_count' then raise exception using errcode='22023',message='Was this delivery already included in the starting count?';end if;
    included:=(p_payload->>'included_in_starting_count')::boolean;
    if d<s.opening_date and not included then raise exception using errcode='23514',message='An earlier delivery requires a count review if it was left out of the starting count';end if;
    if included then delta:=0;end if;
   end if;
   if p_operation='opened' and (operations_private.feed_minimum(s.id,d) is null or operations_private.feed_minimum(s.id,d)<bags or s.current_bags<bags) then raise exception using errcode='23514',message='Not enough unopened bags were available on this date';end if;
   if p_operation='problem' and nullif(trim(p_payload->>'notes'),'') is null then raise exception using errcode='22023',message='Describe the count problem for Bimbo';end if;
  end if;
  insert into farm_feed_activities(stock_id,period_id,kind,bags,activity_date,actor_id,notes,included_in_starting_count,resulting_bags,stock_revision)
   values(s.id,period,p_operation,bags,d,p_actor,p_payload->>'notes',included,s.current_bags,s.revision) returning * into a;
  if p_operation='starting' then
   for receipt in select * from farm_feed_stock_movements where stock_id=s.id and movement_type='receipt' and resulting_bags is null order by movement_date,id loop
    if receipt.movement_date>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='23514',message='A future-dated delivery needs review before recording this starting count';end if;
    included:=receipt.movement_date<d;
    if receipt.movement_date=d then
     select value into choice from jsonb_array_elements(coalesce(p_payload->'receipt_inclusions','[]'::jsonb)) where value->>'movement_id'=receipt.id::text;
     if choice is null or not choice ? 'included' then raise exception using errcode='22023',message='Choose whether each delivery on the count date is already included';end if;
     included:=(choice->>'included')::boolean;
    end if;
    if not included then carry:=carry+receipt.bags_delta;end if;
    insert into farm_feed_start_inclusions(starting_activity_id,movement_id,included,decided_by) values(a.id,receipt.id,included,p_actor);
   end loop;
   update farm_feed_stock set current_bags=bags+carry,initialized_at=now(),initialized_by=p_actor,opening_date=d,revision=revision+1,updated_at=now() where id=s.id returning * into s;
   insert into manager_asset_assignments(period_id,resource,record_id,assigned_by) select period,'farm_feed_stock',s.id,p_actor where period is not null on conflict do nothing;
  elsif p_operation<>'problem' and delta<>0 then
   update farm_feed_stock set current_bags=case when initialized_at is null then null else current_bags+delta end,revision=revision+1,updated_at=now() where id=s.id returning * into s;
  end if;
  if p_operation<>'problem' and (delta<>0 or p_operation='starting') then
   insert into farm_feed_stock_movements(stock_id,movement_type,bags_delta,resulting_bags,movement_date,actor_id,reason,feed_activity_id,daily_feed_id)
    values(s.id,case p_operation when 'starting' then 'opening' when 'received' then 'receipt' else 'use' end,delta,case when p_operation='starting' then bags else s.current_bags end,d,p_actor,coalesce(p_payload->>'notes',p_reason),a.id,(p_payload->>'daily_feed_id')::uuid) returning * into m;
  end if;
  perform set_config('operations.feed_activity_creating',a.id::text,true);
  update farm_feed_activities set resulting_bags=s.current_bags where id=a.id returning * into a;
  if p_operation='problem' or coalesce((p_payload->>'request_review')::boolean,false) then
   child:=md5(a.id::text||':review-request')::uuid;
   request_row:=farm_operations_write_before_manager_periods(p_actor,'request','create',jsonb_build_object('request_date',d,'category','feed','description',case when p_operation='problem' then 'Feed count check: ' else 'Optional feed review: ' end||p_operation||' '||bags||' bags, '||s.feed_type||' ('||s.feed_source||'). '||coalesce(p_payload->>'notes','')),null,null,child);
   update farm_feed_activities set review_request_id=(request_row->>'id')::uuid,review_status='pending' where id=a.id returning * into a;
  end if;
  perform set_config('operations.feed_activity_creating','',true);
  v_result:=jsonb_build_object('stock',to_jsonb(s),'activity',to_jsonb(a),'movement',case when m.id is null then null else to_jsonb(m) end);
 end if;
 insert into farm_feed_activity_receipts(actor_id,request_id,period_id,fingerprint,result) values(p_actor,p_request_id,period,fp,v_result);
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);perform set_config('operations.feed_starting',coalesce(saved_start,''),true);
 return v_result;
end $$;
alter function farm_feed_stock_write(uuid,text,jsonb,uuid,text,uuid) rename to farm_feed_stock_write_before_feed_activity;
revoke all on function farm_feed_stock_write_before_feed_activity(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function operations_private.feed_daily_write(p_actor uuid,p_payload jsonb,p_reason text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;r farm_feed_activity_receipts;a farm_feed_activities;s farm_feed_stock;result jsonb;opened jsonb;fp text;count_opened integer;chosen uuid;
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 c:=manager_context(p_actor,'farm',coalesce(nullif(p_payload->>'manager_period_id','')::uuid,nullif(current_setting('operations.period',true),'')::uuid));
 if c->>'status'<>'active' then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 if p_request_id is null then raise exception using errcode='22023',message='A feeding retry identifier is required';end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 fp:=encode(sha256(convert_to(jsonb_build_array('daily_feed',p_payload,p_reason)::text,'UTF8')),'hex');
 select * into r from farm_feed_activity_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.period_id is distinct from (c->>'periodId')::uuid or r.fingerprint<>fp then raise exception using errcode='23514',message='Retry identifier belongs to a different feeding entry';end if;return r.result;end if;
 if coalesce(p_payload->>'bags_opened','')!~'^[0-9]{1,8}$' then raise exception using errcode='22023',message='Enter the whole number of new bags opened, including zero';end if;
 count_opened:=(p_payload->>'bags_opened')::integer;chosen:=(p_payload->>'opening_activity_id')::uuid;
 if chosen is not null then
  if count_opened<>0 then raise exception using errcode='22023',message='An opening already recorded must have zero new bags opened';end if;
  perform operations_private.require_record(p_actor,'farm_feed_activities',chosen,(c->>'periodId')::uuid);
  select * into a from farm_feed_activities where id=chosen and kind='opened';
  select * into s from farm_feed_stock where id=a.stock_id;
  if a.id is null or s.feed_type is distinct from p_payload->>'feed_type' or s.feed_source is distinct from coalesce(p_payload->>'feed_source','local') or a.activity_date>(p_payload->>'date')::date then raise exception using errcode='23514',message='Choose an earlier opening for the same feed type and source';end if;
 end if;
 perform set_config('operations.actor',p_actor::text,true);perform set_config('operations.period',coalesce(c->>'periodId',''),true);
 result:=farm_feed_stock_write_before_feed_activity(p_actor,'create_daily_feed',(p_payload-'opening_activity_id')||jsonb_build_object('bags_opened',0),null,p_reason,md5(p_request_id::text||':feeding')::uuid);
 if count_opened>0 then
  opened:=farm_feed_activity_write(p_actor,'opened',jsonb_build_object('date',p_payload->>'date','feed_type',p_payload->>'feed_type','feed_source',coalesce(p_payload->>'feed_source','local'),'bags',count_opened,'daily_feed_id',result->'daily_feed'->>'id','notes',p_payload->>'notes'),null,p_reason,md5(p_request_id::text||':new-opening')::uuid);
  chosen:=(opened->'activity'->>'id')::uuid;
  result:=result||jsonb_build_object('stock',opened->'stock','movement',opened->'movement');
 end if;
 insert into farm_daily_feed_activity_links(daily_feed_id,activity_id,new_bags_opened,recorded_by) values((result->'daily_feed'->>'id')::uuid,chosen,count_opened,p_actor);
 result:=result||jsonb_build_object('opening_activity_id',chosen,'new_bags_opened',count_opened);
 insert into farm_feed_activity_receipts(actor_id,request_id,period_id,fingerprint,result) values(p_actor,p_request_id,(c->>'periodId')::uuid,fp,result);
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);
 return result;
end $$;
create function public.farm_feed_stock_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_operation in ('starting','received','opened','problem','review_problem') then return farm_feed_activity_write(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id);end if;
 if p_operation='create_daily_feed' then return operations_private.feed_daily_write(p_actor,p_payload,p_reason,p_request_id);end if;
 return farm_feed_stock_write_before_feed_activity(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id);
end $$;
revoke all on function farm_feed_activity_write(uuid,text,jsonb,uuid,text,uuid),farm_feed_stock_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_feed_activity_write(uuid,text,jsonb,uuid,text,uuid),farm_feed_stock_write(uuid,text,jsonb,uuid,text,uuid) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;

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
 ('content_social_integrations','content',null,'created_by',true),('content_audit','content','happened_at','actor_id',false),
 ('farm_feed_activities','farm','activity_date','actor_id',false)
$$;

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
  if p.id is null or (p.status<>'active' and not ((current_setting('operations.feed_starting',true)='1' and tg_table_name in ('farm_feed_stock','farm_feed_stock_movements','farm_feed_activities','farm_operational_requests'))) and not (tg_table_name='farm_activity' and payload->>'record_type'='handover' and current_setting('operations.handover',true)='1')) then raise exception using errcode='42501',message='Active manager period required';end if;
 end if;
 insert into manager_record_links(resource,record_id,period_id,recorded_by) values(tg_table_name,new.id,p.id,actor);
 return new;
end $$;

create or replace function operations_private.guard_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid; c jsonb; r record; value jsonb:=to_jsonb(new); reference record; target text; actual_date date; selected uuid; check_date boolean:=true;
begin
 if (select activated_at is null from operations_release_state) then return new;end if;
 actor:=nullif(current_setting('operations.actor',true),'')::uuid;
 if actor is null then raise exception using errcode='42501',message='Use the guarded operations workflow';end if;
 select * into r from operations_private.resources() where resource=tg_table_name;
 selected:=nullif(current_setting('operations.period',true),'')::uuid;
 c:=manager_context(actor,r.business,selected);
 if exists(select 1 from profiles where id=actor and role='admin') then return new;end if;
 if c->>'status'<>'active' and (current_setting('operations.feed_starting',true)='1' and tg_table_name in ('farm_feed_stock','farm_feed_stock_movements','farm_feed_activities','farm_operational_requests')) then return new;end if;
 if c->>'status'<>'active' and tg_table_name='farm_activity' and value->>'record_type'='handover' and current_setting('operations.handover',true)='1' then return new;end if;
 if c->>'status'<>'active' then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 if tg_op='UPDATE' then
  perform operations_private.require_record(actor,tg_table_name,old.id,selected);
  if r.is_asset then check_date:=(value->>r.date_column) is distinct from (to_jsonb(old)->>r.date_column);end if;
 end if;
 if check_date and c->>'mode'='personal' and r.date_column is not null and r.date_column not in ('created_at','happened_at','requested_at') then
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


grant select on farm_feed_activities to authenticated;
create policy feed_activity_role_read on farm_feed_activities for select to authenticated using(true);
create policy feed_activity_period_read on farm_feed_activities as restrictive for select to authenticated using(manager_can_read_record('farm_feed_activities',to_jsonb(farm_feed_activities.*)));
create trigger manager_record_guard before insert or update on farm_feed_activities for each row execute function operations_private.guard_record();
create trigger manager_record_attribution after insert on farm_feed_activities for each row execute function operations_private.tag_record();
create function operations_private.feed_history_visible(p_actor uuid,p_stock uuid,p_recorded timestamptz,p_period uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;s jsonb;accepted timestamptz;
begin
 c:=manager_context(p_actor,'farm',p_period);
 if c->>'status'='awaiting_handover' then return false;end if;
 select to_jsonb(t) into s from farm_feed_stock t where id=p_stock;
 if s is null then return false;end if;
 if c->>'mode' in ('legacy','admin_all') then return true;end if;
 if not operations_private.record_visible(p_actor,'farm_feed_stock',s,p_period) then return false;end if;
 select min(known_at) into accepted from (
  select assigned_at known_at from manager_asset_assignments where period_id=(c->>'periodId')::uuid and resource='farm_feed_stock' and record_id=p_stock
  union all select linked_at from manager_record_links where period_id=(c->>'periodId')::uuid and resource='farm_feed_stock' and record_id=p_stock
 ) dates;
 return p_recorded>=accepted;
end $$;
create function public.farm_feed_inventory_read(p_actor uuid,p_period_id uuid default null,p_history boolean default false,p_stock_id uuid default null,p_date date default null,p_page integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;rows jsonb;problems jsonb;total bigint;
begin
 c:=manager_context(p_actor,'farm',p_period_id);
 if p_page<0 or p_limit not between 1 and 500 then raise exception using errcode='22023',message='Invalid feed history page';end if;
 if p_history then
  if c->>'status'='awaiting_handover' then raise exception using errcode='42501',message='Complete your handover before viewing historical activity';end if;
  with entries as (
   select to_jsonb(a)||jsonb_build_object('actor_name',p.name,'bags_delta',m.bags_delta,'resulting_bags',coalesce(m.resulting_bags,a.resulting_bags),'feed_type',s.feed_type,'feed_source',s.feed_source,'review_status',case when a.kind='problem' then a.review_status else coalesce(q.status,a.review_status) end) value,a.recorded_at,a.id
   from farm_feed_activities a join farm_feed_stock s on s.id=a.stock_id left join profiles p on p.id=a.actor_id left join farm_feed_stock_movements m on m.feed_activity_id=a.id left join farm_operational_requests q on q.id=a.review_request_id
   where (p_stock_id is null or a.stock_id=p_stock_id) and (p_date is null or a.activity_date=p_date) and operations_private.feed_history_visible(p_actor,a.stock_id,a.recorded_at,p_period_id)
   union all
   select to_jsonb(m)||jsonb_build_object('kind',case m.movement_type when 'opening' then 'starting' when 'receipt' then 'received' when 'use' then 'opened' else 'adjust' end,'bags',abs(m.bags_delta),'activity_date',m.movement_date,'recorded_at',m.created_at,'actor_name',p.name,'notes',m.reason,'feed_type',s.feed_type,'feed_source',s.feed_source),m.created_at,m.id
   from farm_feed_stock_movements m join farm_feed_stock s on s.id=m.stock_id left join profiles p on p.id=m.actor_id
   where m.feed_activity_id is null and (p_stock_id is null or m.stock_id=p_stock_id) and (p_date is null or m.movement_date=p_date) and operations_private.feed_history_visible(p_actor,m.stock_id,m.created_at,p_period_id)
  ),page as(select value from entries order by recorded_at desc,id desc limit p_limit offset p_page*p_limit)
  select coalesce((select jsonb_agg(value) from page),'[]'::jsonb),(select count(*) from entries) into rows,total;
  return jsonb_build_object('data',rows,'total',total);
 end if;
 with keys as (select feed_type,feed_source from farm_feed_stock union select feed_type,feed_source from farm_feed_purchases union select feed_type,feed_source from farm_daily_feed),
 stocks as (
  select k.feed_type,k.feed_source,s.id,coalesce(to_jsonb(s),'{}'::jsonb)||jsonb_build_object('id',s.id,'feed_type',k.feed_type,'feed_source',k.feed_source,'current_bags',s.current_bags,'revision',s.revision,
   'initialized_at',s.initialized_at,'opening_date',s.opening_date,'actor_name',p.name,
   'uncounted_receipts',case when s.initialized_at is null then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'date',m.movement_date,'bags',m.bags_delta,'actor_name',who.name) order by m.movement_date,m.id) from farm_feed_stock_movements m left join profiles who on who.id=m.actor_id where m.stock_id=s.id and m.movement_type='receipt' and m.resulting_bags is null and m.movement_date>=coalesce(p_date,(now() at time zone 'Africa/Lagos')::date)),'[]'::jsonb) else '[]'::jsonb end
  ) value from keys k left join farm_feed_stock s using(feed_type,feed_source) left join profiles p on p.id=s.initialized_by
  where c->>'status'='awaiting_handover' or c->>'mode' in ('admin_all','legacy') or (s.id is not null and operations_private.record_visible(p_actor,'farm_feed_stock',to_jsonb(s),p_period_id))
 )
 select coalesce(jsonb_agg(value order by feed_type,feed_source),'[]'::jsonb),count(*) into rows,total from stocks;
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('feed_type',s.feed_type,'feed_source',s.feed_source,'actor_name',p.name,'current_bags',s.current_bags,'current_revision',s.revision) order by a.recorded_at),'[]'::jsonb)
 into problems from farm_feed_activities a join farm_feed_stock s on s.id=a.stock_id left join profiles p on p.id=a.actor_id
 where a.kind='problem' and a.review_status='pending' and (
  c->>'mode'='admin_all' or (p_period_id is not null and a.period_id=p_period_id) or (a.actor_id=p_actor and a.period_id is not distinct from (c->>'periodId')::uuid)
 );
 return jsonb_build_object('data',rows,'total',total,'problems',problems);
end $$;
revoke all on function farm_feed_inventory_read(uuid,uuid,boolean,uuid,date,integer,integer) from public,anon,authenticated;
grant execute on function farm_feed_inventory_read(uuid,uuid,boolean,uuid,date,integer,integer) to service_role;
create function operations_private.feed_activity_immutable() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then raise exception using errcode='42501',message='Feed activity history cannot be deleted';end if;
 if (to_jsonb(new)-array['resulting_bags','review_request_id','review_status','reviewed_by','reviewed_at','review_note']) is distinct from (to_jsonb(old)-array['resulting_bags','review_request_id','review_status','reviewed_by','reviewed_at','review_note'])
 or ((new.resulting_bags is distinct from old.resulting_bags or new.review_request_id is distinct from old.review_request_id) and current_setting('operations.feed_activity_creating',true) is distinct from old.id::text) then
  raise exception using errcode='42501',message='Feed facts cannot be overwritten; request an audited count correction';
 end if;return new;
end $$;
create trigger feed_activity_facts before update or delete on farm_feed_activities for each row execute function operations_private.feed_activity_immutable();
create function operations_private.feed_review_sync() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status in ('approved','declined') and new.status is distinct from old.status then
  update farm_feed_activities set review_status=new.status,reviewed_by=new.decision_by,reviewed_at=new.decision_at,review_note=new.ceo_response where review_request_id=new.id and kind<>'problem';
 end if;return new;
end $$;
create trigger feed_review_decision after update on farm_operational_requests for each row execute function operations_private.feed_review_sync();

-- New payment intent is carried inside the guarded writer, never inferred from an old row.
alter function farm_feed_receipt() rename to farm_feed_receipt_before_physical_activity;
create function public.farm_feed_receipt() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare intent jsonb:=nullif(current_setting('operations.feed_purchase_intent',true),'')::jsonb;c jsonb;a farm_feed_activities;s farm_feed_stock;result jsonb;received boolean;
begin
 c:=manager_context(new.created_by,'farm',nullif(current_setting('operations.period',true),'')::uuid);
 if intent is null and c->>'mode'<>'personal' then
  -- Preserve the legacy client's purchase/receipt contract until it sends explicit intent.
  perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
  insert into farm_feed_stock(feed_type,feed_source) values(new.feed_type,new.feed_source) on conflict(feed_type,feed_source) do nothing;
  select * into s from farm_feed_stock where feed_type=new.feed_type and feed_source=new.feed_source for update;
  if s.initialized_at is not null and new.date<s.opening_date then raise exception using errcode='23514',message='Receipt date precedes verified opening count; request an audited count review';end if;
  update farm_feed_stock set current_bags=case when initialized_at is null then null else current_bags+new.num_bags end,revision=revision+1,updated_at=now() where id=s.id returning * into s;
  insert into farm_feed_stock_movements(stock_id,movement_type,bags_delta,resulting_bags,movement_date,actor_id,purchase_id,reason) values(s.id,'receipt',new.num_bags,s.current_bags,new.date,new.created_by,new.id,'Feed purchase received');
  return new;
 end if;
 received:=coalesce((intent->>'delivery_received')::boolean,false);
 if intent->>'feed_activity_id' is not null then
  if not received then raise exception using errcode='22023',message='A linked delivery must be confirmed received';end if;
  perform operations_private.require_record(new.created_by,'farm_feed_activities',(intent->>'feed_activity_id')::uuid,(c->>'periodId')::uuid);
  select * into a from farm_feed_activities where id=(intent->>'feed_activity_id')::uuid for update;
  select * into s from farm_feed_stock where id=a.stock_id;
  if a.kind is distinct from 'received' or a.bags<>new.num_bags or s.feed_type<>new.feed_type or s.feed_source<>new.feed_source or exists(select 1 from farm_feed_purchase_links where activity_id=a.id) then raise exception using errcode='23514',message='Choose an unlinked received delivery with the same feed, source and bag count';end if;
 elsif received then
  result:=farm_feed_activity_write(new.created_by,'received',jsonb_strip_nulls(jsonb_build_object('date',coalesce(intent->>'delivery_date',new.date::text),'feed_type',new.feed_type,'feed_source',new.feed_source,'bags',new.num_bags,'notes',new.notes,'included_in_starting_count',intent->'included_in_starting_count')),null,null,md5(new.id::text||':physical-delivery')::uuid);
  select * into a from farm_feed_activities where id=(result->'activity'->>'id')::uuid;
 end if;
 insert into farm_feed_purchase_links(purchase_id,activity_id,delivery_confirmed,recorded_by) values(new.id,a.id,received,new.created_by);
 return new;
end $$;
drop trigger farm_feed_purchase_stock_receipt on farm_feed_purchases;
create trigger farm_feed_purchase_stock_receipt after insert on farm_feed_purchases for each row execute function farm_feed_receipt();
alter function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_feed_intent;
revoke all on function farm_v2_write_before_feed_intent(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare saved text:=current_setting('operations.feed_purchase_intent',true);result jsonb;
begin
 if p_kind='feed' and p_operation='create' and jsonb_typeof(p_payload)='object' then
  perform set_config('operations.feed_purchase_intent',case when p_payload ? 'delivery_received' or p_payload ? 'feed_activity_id' then (p_payload-array['manager_period_id'])::text else '' end,true);
 end if;
 result:=farm_v2_write_before_feed_intent(p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);
 perform set_config('operations.feed_purchase_intent',coalesce(saved,''),true);return result;
end $$;
create function operations_private.feed_purchase_facts() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (new.feed_type,new.feed_source,new.num_bags) is distinct from (old.feed_type,old.feed_source,old.num_bags) and exists(select 1 from farm_feed_purchase_links where purchase_id=old.id and activity_id is not null) then
  raise exception using errcode='23514',message='The physical delivery is already recorded. Correct its count through feed review separately';
 end if;return new;
end $$;
create trigger feed_linked_purchase_facts before update on farm_feed_purchases for each row execute function operations_private.feed_purchase_facts();
revoke all on function farm_feed_receipt(),farm_feed_receipt_before_physical_activity(),farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
