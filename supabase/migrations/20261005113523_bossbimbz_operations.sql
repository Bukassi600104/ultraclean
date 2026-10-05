-- Prepared/rehearsed only. Apply once after coordinated release authorization.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$ begin
 if to_regprocedure('public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid)') is null then raise exception 'Primefield V2 prerequisite missing'; end if;
end $$;
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('admin','manager','property_manager','content_manager'));

create function public.operations_has_role(p_role text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles where id=auth.uid() and not suspended and role in ('admin',p_role))
$$;
revoke all on function public.operations_has_role(text) from public,anon;
grant execute on function public.operations_has_role(text) to authenticated,service_role;

create table public.farm_daily_reports(
 id uuid primary key default gen_random_uuid(),report_date date not null,manager_id uuid not null references public.profiles(id),
 status text not null default 'draft' check(status in ('draft','submitted')),
 sections jsonb not null check(jsonb_typeof(sections)='object' and octet_length(sections::text)<=30000),
 decision_required boolean not null default false,submitted_at timestamptz,
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,review_note text check(length(review_note)<=2000),
 revision integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(report_date,manager_id)
);
create table public.farm_operational_requests(
 id uuid primary key default gen_random_uuid(),report_id uuid unique references public.farm_daily_reports(id),
 request_date date not null,requested_by uuid not null references public.profiles(id),
 category text not null check(category in ('purchase','feed','veterinary','repair','maintenance','equipment','staffing','emergency','other')),
 description text not null check(length(trim(description)) between 1 and 5000),
 status text not null default 'pending' check(status in ('pending','approved','declined','resolved')),
 ceo_response text check(length(ceo_response)<=5000),decision_by uuid references public.profiles(id),decision_at timestamptz,
 resolution text check(length(resolution)<=5000),resolved_at timestamptz,
 revision integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.farm_operation_events(
 id uuid primary key default gen_random_uuid(),record_type text not null,record_id uuid not null,operation text not null,
 actor_id uuid not null references public.profiles(id),before_value jsonb,after_value jsonb,reason text,happened_at timestamptz not null default now()
);
create table public.farm_operation_receipts(
 actor_id uuid not null references public.profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create index farm_reports_history on public.farm_daily_reports(report_date desc,status);
create index farm_requests_queue on public.farm_operational_requests(status,created_at desc);
create index farm_operations_history on public.farm_operation_events(record_type,record_id,happened_at desc);
create trigger farm_operation_events_immutable before update or delete on public.farm_operation_events for each row execute function public.farm_activity_immutable();

create function public.farm_validate_report(p_sections jsonb) returns void language plpgsql set search_path=public,pg_temp as $$
declare section text; field text; value jsonb; allowed text[];
begin
 if jsonb_typeof(p_sections) is distinct from 'object' or octet_length(p_sections::text)>30000 then raise exception using errcode='22023',message='Invalid report sections'; end if;
 if not p_sections ?& array['farm1','farm2','livestock','crops','people','problems'] or (select count(*) from jsonb_object_keys(p_sections))<>6 then raise exception using errcode='22023',message='All six report sections are required'; end if;
 for section in select jsonb_object_keys(p_sections) loop
  if jsonb_typeof(p_sections->section) is distinct from 'object' then raise exception using errcode='22023',message='Report section must be an object'; end if;
  allowed:=case section when 'farm1' then array['pond1','pond2','pond3','pond4','water_issue'] when 'farm2' then array['vat1','vat2','vat3','mortality','water_issue','pump_status'] when 'livestock' then array['goats','ram','cattle','piggery','poultry','mortality','sick_animals','feed','water'] when 'crops' then array['report'] when 'people' then array['workers_present','supervisor','tasks_completed'] else array['issues','action_taken','request_category'] end;
  for field,value in select * from jsonb_each(p_sections->section) loop
   if not field=any(allowed) or (field='workers_present' and (jsonb_typeof(value) not in ('string','number') or (value#>>'{}')!~'^[0-9]{1,4}$')) or (field<>'workers_present' and (jsonb_typeof(value) is distinct from 'string' or length(value#>>'{}')>3000)) then raise exception using errcode='22023',message='Invalid report field'; end if;
  end loop;
 end loop;
end $$;
revoke all on function public.farm_validate_report(jsonb) from public,anon,authenticated,service_role;

create function public.farm_operations_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_before jsonb; v_result jsonb; v_date date; v_fp text; v_receipt record; v_id uuid; v_link jsonb; v_sections jsonb;
begin
 select role into v_role from profiles where id=p_actor and not suspended;
 if v_role is null or v_role not in ('admin','manager') then raise exception using errcode='42501',message='Active farm role required'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>40000 or length(coalesce(p_reason,''))>2000 then raise exception using errcode='22023',message='Invalid operation payload'; end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if p_request_id is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_request_id::text,0));
  v_fp:=md5(jsonb_build_array(p_kind,p_operation,p_payload,p_id,p_reason)::text);
  select * into v_receipt from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then if v_receipt.fingerprint<>v_fp then raise exception using errcode='23514',message='Retry identifier reused'; end if; return v_receipt.result; end if;
 end if;
 if p_kind not in ('report','request') then raise exception using errcode='22023',message='Unsupported farm operation'; end if;
 if p_operation<>'create' then
  if p_kind='report' then select to_jsonb(t) into v_before from farm_daily_reports t where id=p_id for update;
  else select to_jsonb(t) into v_before from farm_operational_requests t where id=p_id for update; end if;
  if v_before is null then raise exception using errcode='P0002',message='Record not found'; end if;
  if v_role<>'admin' and coalesce(v_before->>'manager_id',v_before->>'requested_by')<>p_actor::text then raise exception using errcode='42501',message='Own records only'; end if;
  if p_payload->>'expected_revision' is null or (p_payload->>'expected_revision')!~'^[0-9]+$' then raise exception using errcode='22023',message='Revision required'; end if;
  if (p_payload->>'expected_revision')::integer<>(v_before->>'revision')::integer then raise exception using errcode='40001',message='Record changed; refresh'; end if;
 end if;
 v_date:=coalesce((v_before->>'report_date')::date,(v_before->>'request_date')::date,(p_payload->>'report_date')::date,(p_payload->>'request_date')::date);
 -- CEO decisions/reviews may happen after closure; report edits/new operational entries retain the V2 date guard.
 if p_operation in ('create','update','submit') then perform farm_v2_lock_date(v_date,v_role='admin',p_reason); end if;
 if p_kind='report' then
  if p_operation in ('create','update','submit') then
   if v_before->>'status'='submitted' then raise exception using errcode='23514',message='Submitted reports are immutable'; end if;
   v_sections:=coalesce(p_payload->'sections',v_before->'sections'); perform farm_validate_report(v_sections);
   if p_payload ? 'decision_required' and jsonb_typeof(p_payload->'decision_required')<>'boolean' then raise exception using errcode='22023',message='Decision flag must be boolean'; end if;
   if p_operation='create' then
    insert into farm_daily_reports(report_date,manager_id,sections,decision_required) values(v_date,p_actor,v_sections,coalesce((p_payload->>'decision_required')::boolean,false)) returning to_jsonb(farm_daily_reports.*) into v_result;
   else
    update farm_daily_reports set sections=v_sections,decision_required=coalesce((p_payload->>'decision_required')::boolean,decision_required),status=case when p_operation='submit' then 'submitted' else status end,submitted_at=case when p_operation='submit' then now() else submitted_at end,revision=revision+1,updated_at=now() where id=p_id returning to_jsonb(farm_daily_reports.*) into v_result;
   end if;
   if p_operation='submit' and (v_result->>'decision_required')::boolean then
    insert into farm_operational_requests(report_id,request_date,requested_by,category,description) values(p_id,v_date,(v_result->>'manager_id')::uuid,coalesce(nullif(v_sections#>>'{problems,request_category}',''),'other'),v_sections#>>'{problems,issues}') returning to_jsonb(farm_operational_requests.*) into v_link;
    insert into farm_operation_events(record_type,record_id,operation,actor_id,after_value) values('request',(v_link->>'id')::uuid,'create',p_actor,v_link);
   end if;
  elsif p_operation='review' and v_role='admin' then
   if v_before->>'status'<>'submitted' then raise exception using errcode='23514',message='Submit report before review'; end if;
   update farm_daily_reports set reviewed_by=p_actor,reviewed_at=now(),review_note=p_payload->>'review_note',revision=revision+1,updated_at=now() where id=p_id returning to_jsonb(farm_daily_reports.*) into v_result;
  else raise exception using errcode='42501',message='Unsupported report operation'; end if;
 else
  if p_operation='create' then
   if p_payload ? 'report_id' then raise exception using errcode='22023',message='Report requests are created during submission'; end if;
   insert into farm_operational_requests(request_date,requested_by,category,description) values(v_date,p_actor,p_payload->>'category',p_payload->>'description') returning to_jsonb(farm_operational_requests.*) into v_result;
  elsif p_operation in ('respond','approve','decline','resolve') and v_role='admin' then
   if v_before->>'status' in ('declined','resolved') or (p_operation in ('approve','decline') and v_before->>'status'<>'pending') or (p_operation='resolve' and v_before->>'status'<>'approved') then raise exception using errcode='23514',message='Request status does not permit this decision'; end if;
   if nullif(trim(p_payload->>'ceo_response'),'') is null then raise exception using errcode='22023',message='CEO response required'; end if;
   if p_operation='resolve' and nullif(trim(p_payload->>'resolution'),'') is null then raise exception using errcode='22023',message='Resolution required'; end if;
   update farm_operational_requests set status=case p_operation when 'approve' then 'approved' when 'decline' then 'declined' when 'resolve' then 'resolved' else status end,ceo_response=p_payload->>'ceo_response',decision_by=case when p_operation in ('approve','decline') then p_actor else decision_by end,decision_at=case when p_operation in ('approve','decline') then now() else decision_at end,resolution=case when p_operation='resolve' then p_payload->>'resolution' else resolution end,resolved_at=case when p_operation='resolve' then now() else resolved_at end,revision=revision+1,updated_at=now() where id=p_id returning to_jsonb(farm_operational_requests.*) into v_result;
  else raise exception using errcode='42501',message='CEO decision required'; end if;
 end if;
 v_id:=(v_result->>'id')::uuid;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values(p_kind,v_id,p_operation,p_actor,v_before,v_result,p_reason);
 if p_request_id is not null then insert into farm_operation_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fp,v_result); end if;
 return v_result;
end $$;
revoke all on function public.farm_operations_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_operations_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
do $$ declare t text; begin
 foreach t in array array['farm_daily_reports','farm_operational_requests','farm_operation_events','farm_operation_receipts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.farm_daily_reports,public.farm_operational_requests,public.farm_operation_events to authenticated;
create policy farm_report_read on public.farm_daily_reports for select to authenticated using(operations_has_role('manager') and (is_admin() or manager_id=auth.uid()));
create policy farm_operation_request_read on public.farm_operational_requests for select to authenticated using(operations_has_role('manager') and (is_admin() or requested_by=auth.uid()));
create policy farm_operation_event_read on public.farm_operation_events for select to authenticated using(operations_has_role('manager') and (is_admin() or (record_type='report' and exists(select 1 from farm_daily_reports r where r.id=record_id and r.manager_id=auth.uid())) or (record_type='request' and exists(select 1 from farm_operational_requests r where r.id=record_id and r.requested_by=auth.uid()))));
commit;
