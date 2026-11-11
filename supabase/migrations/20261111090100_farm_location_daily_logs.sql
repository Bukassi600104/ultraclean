-- Keep one whole-farm report per manager/day and allow one additional log per named reporting area.
-- Existing rows, dates, assignments, submissions and evidence are preserved.
begin;
set local lock_timeout='5s';

create or replace function farm_validate_report(p_sections jsonb) returns void language plpgsql set search_path=public,pg_temp as $$
declare section text;field text;value jsonb;allowed text[];child text;cv jsonb;animal jsonb; area text; measurement numeric; observed boolean:=false;
begin
 if jsonb_typeof(p_sections) is distinct from 'object' or octet_length(p_sections::text)>30000 then raise exception using errcode='22023',message='Invalid report sections';end if;
 if p_sections->'template_version'='3'::jsonb then
  area:=p_sections->>'area';
  if area is null or area !~ '^(farm1_pond[1-4]|farm2_vat[1-3]|poultry_[a-d]|piggery_[1-4]|goats|ram|cattle|crops)$'
    or p_sections-array['template_version','area','observations']<>'{}'::jsonb or jsonb_typeof(p_sections->'observations') is distinct from 'object' then
   raise exception using errcode='22023',message='Choose a valid farm area and its observations';
  end if;
  for field,value in select * from jsonb_each(p_sections->'observations') loop
   if field not in ('feed_kg','deaths','eggs','sample_count','sample_weight_kg','water_quality','notes')
     or (area='crops' and field<>'notes') or (field='eggs' and area not like 'poultry_%') or (field='water_quality' and area not like 'farm%') then
    raise exception using errcode='22023',message='Measurement does not apply to this farm area';
   end if;
   if field in ('water_quality','notes') then
    if jsonb_typeof(value)<>'string' or length(value#>>'{}')>2000 then raise exception using errcode='22023',message='Invalid observation';end if;
    observed:=observed or length(trim(value#>>'{}'))>0;
   else
    if jsonb_typeof(value)<>'number' then raise exception using errcode='22023',message='Enter a numeric measurement';end if;
    measurement:=(value#>>'{}')::numeric;
    if measurement<0 or (field in ('sample_count','sample_weight_kg') and measurement=0)
      or (field in ('deaths','eggs','sample_count') and (measurement<>trunc(measurement) or measurement>2147483647))
      or (field in ('feed_kg','sample_weight_kg') and measurement>1000000) then raise exception using errcode='22023',message='Check the measurement';end if;
    observed:=true;
   end if;
  end loop;
  if not observed or ((p_sections->'observations'?'sample_count')<>(p_sections->'observations'?'sample_weight_kg')) then raise exception using errcode='22023',message='Enter an observation and complete any sample weight';end if;
  return;
 end if;
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

create unique index farm_report_day_manager_area
 on public.farm_daily_reports(report_date, manager_id, (coalesce(sections->>'area','')));
alter table public.farm_daily_reports drop constraint farm_daily_reports_report_date_manager_id_key;

create function operations_private.guard_farm_report_area() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and (old.sections->>'area') is distinct from (new.sections->>'area') then
  raise exception using errcode='23514',message='Keep the original report area';
 end if;
 if new.sections->'template_version'='3'::jsonb and new.decision_required then
  raise exception using errcode='22023',message='Submit requests through Operational Requests';
 end if;
 return new;
end $$;
revoke all on function operations_private.guard_farm_report_area() from public,anon,authenticated,service_role;
create trigger guard_farm_report_area before insert or update of sections,decision_required on public.farm_daily_reports
 for each row execute function operations_private.guard_farm_report_area();
commit;
