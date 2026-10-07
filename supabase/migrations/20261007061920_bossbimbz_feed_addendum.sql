-- Forward-only October 7 clarification. No production application without release approval.
-- Preconditions: V2 write boundary and October 5 operations migrations installed.
-- Legacy NULL: no rows seeded/backfilled. Opening physical count includes all prior receipts;
-- earlier movements remain audit history, never added again after that count.
-- Locks: same transaction advisory/date locks as V2, then stock row lock.
-- Rollback: retain movements/counts; do not drop data or replay V2.
begin; set local lock_timeout='5s'; set local statement_timeout='60s';
create table public.farm_feed_stock(
 id uuid primary key default gen_random_uuid(),feed_type text not null check(feed_type in ('fish','goat','chicken','pig','turkey','cattle','other')),
 feed_source text not null check(feed_source in ('local','foreign')),current_bags integer check(current_bags>=0),
 initialized_at timestamptz,initialized_by uuid references profiles(id),opening_date date,
 revision integer not null default 0,updated_at timestamptz not null default now(),unique(feed_type,feed_source),
 check((current_bags is null and initialized_at is null and initialized_by is null) or (current_bags is not null and initialized_at is not null and initialized_by is not null))
);
create table public.farm_feed_stock_movements(
 id uuid primary key default gen_random_uuid(),stock_id uuid not null references farm_feed_stock(id),
 movement_type text not null check(movement_type in ('opening','receipt','use','adjust')),bags_delta integer not null,resulting_bags integer check(resulting_bags>=0),
 movement_date date not null,actor_id uuid not null references profiles(id),reason text check(length(reason)<=2000),
 purchase_id uuid unique references farm_feed_purchases(id),daily_feed_id uuid unique references farm_daily_feed(id),
 created_at timestamptz not null default now(),
 check((movement_type='receipt' and purchase_id is not null and bags_delta>0) or (movement_type='use' and daily_feed_id is not null and bags_delta<0) or (movement_type='opening' and bags_delta>=0 and resulting_bags=bags_delta) or (movement_type='adjust' and bags_delta<>0))
);
create table public.farm_feed_stock_receipts(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id));
create index farm_feed_stock_history on farm_feed_stock_movements(stock_id,created_at desc,id);
create trigger farm_feed_stock_immutable before update or delete on farm_feed_stock_movements for each row execute function farm_activity_immutable();
create function public.farm_feed_receipt() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare s farm_feed_stock%rowtype; v_role text;
begin
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select role into v_role from profiles where id=new.created_by and not suspended;
 if v_role not in ('admin','manager') or v_role is null then raise exception using errcode='42501',message='Active farm actor required for feed receipt'; end if;
 -- Caller V2 already checks closed-day admin reason. Trigger does not override this permission.
 insert into farm_feed_stock(feed_type,feed_source) values(new.feed_type,new.feed_source) on conflict(feed_type,feed_source) do nothing;
 select * into s from farm_feed_stock where feed_type=new.feed_type and feed_source=new.feed_source for update;
 if s.initialized_at is not null and new.date<s.opening_date then raise exception using errcode='23514',message='Receipt date precedes verified opening count; record a reasoned stock adjustment separately'; end if;
 update farm_feed_stock set current_bags=case when initialized_at is null then null else current_bags+new.num_bags end,revision=revision+1,updated_at=now() where id=s.id returning * into s;
 insert into farm_feed_stock_movements(stock_id,movement_type,bags_delta,resulting_bags,movement_date,actor_id,purchase_id,reason) values(s.id,'receipt',new.num_bags,s.current_bags,new.date,new.created_by,new.id,'Feed purchase received');
 return new;
end $$;
revoke all on function farm_feed_receipt() from public,anon,authenticated,service_role;
create trigger farm_feed_purchase_stock_receipt after insert on farm_feed_purchases for each row execute function farm_feed_receipt();
create function public.farm_feed_stock_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;s farm_feed_stock%rowtype;d farm_daily_feed%rowtype;m farm_feed_stock_movements%rowtype;v_date date;v_delta integer;v_result jsonb;v_fp text;r record;
begin
 select role into v_role from profiles where id=p_actor and not suspended;
 if v_role is null or v_role not in ('admin','manager') then raise exception using errcode='42501',message='Active farm role required'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>10000 or length(coalesce(p_reason,''))>2000 then raise exception using errcode='22023',message='Invalid feed stock payload'; end if;
 if p_operation not in ('opening','adjust','use','create_daily_feed') then raise exception using errcode='22023',message='Invalid feed stock operation'; end if;
 if p_operation in ('opening','adjust') and v_role<>'admin' then raise exception using errcode='42501',message='CEO stock correction required'; end if;
 if p_operation in ('opening','adjust') and nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='Physical count/correction reason required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if p_request_id is not null then
 v_fp:=md5(jsonb_build_array(p_operation,p_payload,p_id,p_reason)::text);select * into r from farm_feed_stock_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.fingerprint<>v_fp then raise exception using errcode='23514',message='Retry identifier reused'; end if;return r.result;end if;
 end if;
 if p_operation='use' then
 select * into d from farm_daily_feed where id=(p_payload->>'daily_feed_id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='Daily feed entry not found'; end if;
 if v_role<>'admin' and d.created_by<>p_actor then raise exception using errcode='42501',message='Own daily feed entries only'; end if;
 v_date:=d.date;
 else v_date:=(p_payload->>'date')::date;end if;
 if v_date is null then raise exception using errcode='22023',message='Operational date required';end if;
 perform farm_v2_lock_date(v_date,v_role='admin',p_reason);
 if p_operation='adjust' then select * into s from farm_feed_stock where id=p_id for update;
 else
 insert into farm_feed_stock(feed_type,feed_source) values(coalesce(d.feed_type,p_payload->>'feed_type'),coalesce(d.feed_source,p_payload->>'feed_source','local')) on conflict(feed_type,feed_source) do nothing;
 select * into s from farm_feed_stock where feed_type=coalesce(d.feed_type,p_payload->>'feed_type') and feed_source=coalesce(d.feed_source,p_payload->>'feed_source','local') for update;
 end if;
 if s.id is null then raise exception using errcode='P0002',message='Feed stock not found';end if;
 if p_operation='opening' then
 if s.initialized_at is not null then raise exception using errcode='23514',message='Opening already recorded; use an audited adjustment';end if;
 if coalesce(p_payload->>'bags_available','')!~'^[0-9]{1,8}$' then raise exception using errcode='22023',message='Whole physical bag count required';end if;
 v_delta:=(p_payload->>'bags_available')::integer;
 update farm_feed_stock set current_bags=v_delta,initialized_at=now(),initialized_by=p_actor,opening_date=v_date,revision=revision+1,updated_at=now() where id=s.id returning * into s;
 else
 if s.initialized_at is null and not (p_operation='create_daily_feed' and p_payload->>'bags_opened'='0') then raise exception using errcode='23514',message='CEO must establish verified opening bags before stock use';end if;
 if v_date<s.opening_date then raise exception using errcode='23514',message='Feed activity precedes verified opening count';end if;
 if p_operation='adjust' then
 if coalesce(p_payload->>'expected_revision','')!~'^[0-9]+$' then raise exception using errcode='22023',message='Revision required';end if;
 if (p_payload->>'expected_revision')::integer<>s.revision then raise exception using errcode='40001',message='Stock changed; refresh';end if;
 if coalesce(p_payload->>'bags_delta','')!~'^-?[0-9]{1,8}$' then raise exception using errcode='22023',message='Whole signed bag adjustment required';end if;
 v_delta:=(p_payload->>'bags_delta')::integer;
 if v_delta=0 then raise exception using errcode='22023',message='Nonzero adjustment required';end if;
 else
 if coalesce(p_payload->>'bags_opened','')!~'^[0-9]{1,8}$' or ((p_payload->>'bags_opened')::integer<1 and p_operation='use') then raise exception using errcode='22023',message='Whole newly opened bags required';end if;
 v_delta:=-(p_payload->>'bags_opened')::integer;
 if p_operation='use' and d.created_at<s.initialized_at then raise exception using errcode='23514',message='Legacy daily feed cannot imply new bag consumption';end if;
 if p_operation='create_daily_feed' then
 perform set_config('primefield.feed_stock_write','active',true);
 v_result:=farm_v2_write(p_actor,'daily_feed','create',p_payload-'bags_opened',null,p_reason,null);
 perform set_config('primefield.feed_stock_write','',true);
 select * into d from farm_daily_feed where id=(v_result->>'id')::uuid;
 end if;
 end if;
 if p_operation='create_daily_feed' and v_delta=0 then
 v_result:=jsonb_build_object('daily_feed',to_jsonb(d),'stock',to_jsonb(s),'movement',null);
 if p_request_id is not null then insert into farm_feed_stock_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fp,v_result);end if;return v_result;end if;
 if s.current_bags+v_delta<0 then raise exception using errcode='23514',message='Not enough unopened feed bags available';end if;
 update farm_feed_stock set current_bags=current_bags+v_delta,revision=revision+1,updated_at=now() where id=s.id returning * into s;
 end if;
 insert into farm_feed_stock_movements(stock_id,movement_type,bags_delta,resulting_bags,movement_date,actor_id,reason,daily_feed_id) values(s.id,case p_operation when 'opening' then 'opening' when 'adjust' then 'adjust' else 'use' end,v_delta,s.current_bags,v_date,p_actor,p_reason,d.id) returning * into m;
 v_result:=case when p_operation in ('use','create_daily_feed') then jsonb_build_object('daily_feed',to_jsonb(d),'stock',to_jsonb(s),'movement',to_jsonb(m)) else to_jsonb(s) end;
 if p_request_id is not null then insert into farm_feed_stock_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fp,v_result);end if;
 return v_result;
end $$;
revoke all on function farm_feed_stock_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_feed_stock_write(uuid,text,jsonb,uuid,text,uuid) to service_role;
alter table farm_feed_stock enable row level security;alter table farm_feed_stock_movements enable row level security;alter table farm_feed_stock_receipts enable row level security;
revoke all on farm_feed_stock,farm_feed_stock_movements,farm_feed_stock_receipts from anon,authenticated,service_role;
grant select on farm_feed_stock,farm_feed_stock_movements to authenticated,service_role;
create policy farm_feed_stock_read on farm_feed_stock for select to authenticated using(operations_has_role('manager'));
create policy farm_feed_movements_read on farm_feed_stock_movements for select to authenticated using(operations_has_role('manager'));
-- Existing report values remain untouched. New submissions can use the confirmed structured template.
alter table farm_operational_requests drop constraint farm_operational_requests_category_check;
alter table farm_operational_requests add constraint farm_operational_requests_category_check check(category in ('purchase','feed','veterinary','repair','maintenance','equipment','staffing','water','pump','emergency','other'));
alter table farm_operational_requests add column action_taken text check(length(action_taken)<=3000);
create function farm_request_action_snapshot() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.report_id is not null then select sections#>>'{problems,action_taken}' into new.action_taken from farm_daily_reports where id=new.report_id;end if;
 return new;
end $$;
revoke all on function farm_request_action_snapshot() from public,anon,authenticated,service_role;
create trigger farm_request_action_snapshot before insert on farm_operational_requests for each row execute function farm_request_action_snapshot();
create or replace function farm_validate_report(p_sections jsonb) returns void language plpgsql set search_path=public,pg_temp as $$
declare section text;field text;value jsonb;allowed text[];child text;cv jsonb;animal jsonb;
begin
 if jsonb_typeof(p_sections) is distinct from 'object' or octet_length(p_sections::text)>30000 then raise exception using errcode='22023',message='Invalid report sections';end if;
 if not p_sections ?& array['farm1','farm2','livestock','crops','people','problems'] or exists(select 1 from jsonb_object_keys(p_sections) k where k not in ('template_version','farm1','farm2','livestock','crops','people','problems')) or (p_sections?'template_version' and p_sections->'template_version'<>'2'::jsonb) then raise exception using errcode='22023',message='All six report sections are required';end if;
 for section in select k from jsonb_object_keys(p_sections) k where k<>'template_version' loop
 if jsonb_typeof(p_sections->section) is distinct from 'object' then raise exception using errcode='22023',message='Report section must be an object';end if;
 allowed:=case section when 'farm1' then array['pond1','pond2','pond3','pond4','water_issue'] when 'farm2' then array['vat1','vat2','vat3','mortality','water_issue','pump_status'] when 'livestock' then array['goats','ram','cattle','piggery','poultry','mortality','sick_animals','feed','water'] when 'crops' then array['report'] when 'people' then array['workers_present','supervisor','tasks_completed'] else array['issues','action_taken','request_category'] end;
 for field,value in select * from jsonb_each(p_sections->section) loop
 if not field=any(allowed) then raise exception using errcode='22023',message='Unknown report field';end if;
 if section in ('farm1','farm2') and field ~ '^(pond|vat)[1-4]$' and jsonb_typeof(value)='object' then
 for child,cv in select * from jsonb_each(value) loop
 if child not in ('water_quality','mortality','feed','general_remarks') or jsonb_typeof(cv)<>'string' or length(cv#>>'{}')>3000 then raise exception using errcode='22023',message='Invalid pond/vat field';end if;
 end loop;
 elsif section='livestock' and field='sick_animals' and jsonb_typeof(value)='array' then
 if jsonb_array_length(value)>50 then raise exception using errcode='22023',message='Too many sick animal records';end if;
 for animal in select * from jsonb_array_elements(value) loop
 if jsonb_typeof(animal)<>'object' then raise exception using errcode='22023',message='Invalid sick animal record';end if;
 if nullif(trim(animal->>'animal_group'),'') is null then raise exception using errcode='22023',message='Sick animal group required';end if;
 for child,cv in select * from jsonb_each(animal) loop
 if child not in ('animal_group','quantity','symptoms','action_taken','remarks') or (child='quantity' and (jsonb_typeof(cv)<>'number' or (cv#>>'{}')!~'^[1-9][0-9]{0,3}$')) or (child<>'quantity' and (jsonb_typeof(cv)<>'string' or length(cv#>>'{}')>3000)) then raise exception using errcode='22023',message='Invalid sick animal field';end if;
 end loop;
 end loop;
 elsif field='workers_present' then
 if jsonb_typeof(value) not in ('string','number') or (value#>>'{}')!~'^[0-9]{1,4}$' then raise exception using errcode='22023',message='Invalid worker count';end if;
 elsif jsonb_typeof(value) is distinct from 'string' or length(value#>>'{}')>3000 then raise exception using errcode='22023',message='Invalid report field';end if;
 end loop;end loop;
end $$;
revoke all on function farm_validate_report(jsonb) from public,anon,authenticated,service_role;
-- Monetary corrections do not imply physical stock changes. Linked receipts are immutable.
create function farm_tracked_feed_correction_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (new.num_bags,new.feed_type,new.feed_source,new.date) is distinct from (old.num_bags,old.feed_type,old.feed_source,old.date) and exists(select 1 from farm_feed_stock_movements where purchase_id=old.id) then
 raise exception using errcode='23514',message='Tracked feed receipt quantity, type, source and date are fixed; use an audited physical stock adjustment. Cost and notes can be corrected.';
 end if;return new;
end $$;
revoke all on function farm_tracked_feed_correction_guard() from public,anon,authenticated,service_role;
create trigger farm_tracked_feed_correction_guard before update on farm_feed_purchases for each row execute function farm_tracked_feed_correction_guard();
create function content_linked_platform_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.platform is distinct from old.platform and (exists(select 1 from content_leads where content_id=old.id) or exists(select 1 from content_performance where content_id=old.id)) then raise exception using errcode='23514',message='Content platform cannot change while leads or performance records are linked. Create separate content for another platform.';end if;
 return new;
end $$;
revoke all on function content_linked_platform_guard() from public,anon,authenticated,service_role;
create trigger content_linked_platform_guard before update on content_records for each row execute function content_linked_platform_guard();
create function farm_daily_feed_stock_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from farm_feed_stock where feed_type=new.feed_type and feed_source=new.feed_source and initialized_at is not null) and coalesce(current_setting('primefield.feed_stock_write',true),'')<>'active' then raise exception using errcode='23514',message='Feed stock is active. Record newly opened bags through the feed stock workflow (zero when using an already open bag).';end if;return new;
end $$;
revoke all on function farm_daily_feed_stock_guard() from public,anon,authenticated,service_role;
create trigger farm_daily_feed_stock_guard before insert on farm_daily_feed for each row execute function farm_daily_feed_stock_guard();
create function farm_linked_daily_feed_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (new.feed_type,new.feed_source,new.date) is distinct from (old.feed_type,old.feed_source,old.date) and exists(select 1 from farm_feed_stock_movements where daily_feed_id=old.id) then raise exception using errcode='23514',message='Feed usage type, source and date are fixed after bag opening; apply an audited physical stock correction separately.';end if;return new;
end $$;
revoke all on function farm_linked_daily_feed_guard() from public,anon,authenticated,service_role;
create trigger farm_linked_daily_feed_guard before update on farm_daily_feed for each row execute function farm_linked_daily_feed_guard();
commit;
