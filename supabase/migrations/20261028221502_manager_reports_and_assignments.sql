-- Preconditions: guarded manager scopes, handover, physical feed and cash/pending routines.
-- Read-only complete snapshots; lifecycle adds metadata/audit only. No original value backfill.
-- Legacy NULL attribution remains unknown. Shared assets are not personal transactions.
-- Period closure shares the provisioning lock with dated writes; unresolved cash/requests block it.
-- Keep additive metadata and scope guards on rollback after any personal activity.
begin;
create or replace function operations_private.record_visible(p_actor uuid,p_resource text,p_row jsonb,p_period_id uuid default null,p_personal_report boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r record;c jsonb;link manager_record_links;activated timestamptz;target uuid;record_uuid uuid;
begin
 select * into r from operations_private.resources() where resource=p_resource;if r.resource is null or p_row is null then return false;end if;
 c:=manager_context(p_actor,r.business,p_period_id);if c->>'mode'='admin_all' then return true;end if;
 record_uuid:=(p_row->>'id')::uuid;target:=(c->>'periodId')::uuid;
 select * into link from manager_record_links where resource=p_resource and record_id=record_uuid;
 if link.record_id is not null and link.period_id=target then return true;end if;
 if not p_personal_report and r.is_asset and exists(select 1 from manager_asset_assignments where period_id=target and resource=p_resource and record_id=record_uuid) then return true;end if;
 if not p_personal_report and p_resource='farm_livestock_groups' and exists(select 1 from farm_inventory i where i.product=p_row->>'product' and operations_private.record_visible(p_actor,'farm_inventory',to_jsonb(i),p_period_id,false)) then return true;end if;
 if c->>'mode'='personal' then return false;end if;
 if link.record_id is not null then return r.is_asset and link.period_id is null and p_period_id is null and not p_personal_report;end if;
 if p_period_id is not null or p_personal_report then return nullif(p_row->>r.actor_column,'')::uuid=(c->>'managerId')::uuid;end if;
 select activated_at into activated from operations_release_state;
 return activated is null or coalesce((p_row->>'created_at')::timestamptz,(p_row->>'happened_at')::timestamptz,'-infinity')<=activated;
exception when insufficient_privilege then return false;
end $$;
-- Physical asset corrections belong to the explicitly selected/requesting period, not its old financial creator.
do $$ declare body text;begin
 body:=pg_get_functiondef('operations_private.correction_period(uuid,text,text,uuid)'::regprocedure);
 if position('if resource_name is null then return null;end if;' in body)=0 then raise exception 'Unexpected correction guard definition';end if;
 body:=replace(body,'if resource_name is null then return null;end if;','if resource_name is null or exists(select 1 from operations_private.resources() where resource=resource_name and business=''farm'' and is_asset) then return null;end if;');execute body;
end $$;
create function operations_private.publication_start_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=nullif(current_setting('operations.actor',true),'')::uuid;c jsonb;changed boolean:=true;
begin
 if tg_op='UPDATE' then changed:=new.published_at is distinct from old.published_at;end if;
 if changed and new.published_at is not null and not exists(select 1 from profiles where id=actor and role='admin') then
  c:=manager_context(actor,'content',nullif(current_setting('operations.period',true),'')::uuid);
  if c->>'mode'='personal' and (new.published_at at time zone 'Africa/Lagos')::date<(c->>'startsOn')::date then raise exception using errcode='42501',message='A new publication date cannot predate your work start';end if;
 end if;return new;
end $$;
create trigger manager_publication_start before insert or update on content_records for each row execute function operations_private.publication_start_guard();
create table public.manager_period_events(id uuid primary key default gen_random_uuid(),period_id uuid not null references manager_periods(id),actor_id uuid not null references profiles(id),action text not null,reason text,happened_at timestamptz not null default now(),before_value jsonb,after_value jsonb not null);
create trigger manager_period_events_immutable before update or delete on manager_period_events for each row execute function farm_activity_immutable();
alter table manager_period_events enable row level security;revoke all on manager_period_events from public,anon,authenticated,service_role;grant select on manager_period_events to service_role;
alter function manager_period_write(uuid,text,jsonb) rename to manager_period_write_before_reports;
revoke all on function manager_period_write_before_reports(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.manager_period_write(p_actor uuid,p_operation text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p manager_periods;result jsonb;before_value jsonb;reason text:=nullif(trim(p_payload->>'reason'),'');receipt manager_write_receipts;fp text;request_uuid uuid:=(p_payload->>'request_id')::uuid;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if p_operation in ('close','assign') then
  select * into p from manager_periods where id=(p_payload->>'period_id')::uuid for update;if p.id is null then raise exception using errcode='P0002',message='Manager period not found';end if;before_value:=to_jsonb(p);
  if p_operation='close' and reason is null then raise exception using errcode='22023',message='Explain the period decision';end if;
 end if;
 if request_uuid is not null then
  fp:=encode(sha256(convert_to(jsonb_build_array('period',p_operation,p_payload)::text,'UTF8')),'hex');select * into receipt from manager_write_receipts where actor_id=p_actor and request_id=request_uuid;
  if found then if receipt.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to another period decision';end if;return receipt.result;end if;
 end if;
 if p_operation='close' then
  if p.ended_at is not null then raise exception using errcode='40001',message='This period is already closed';end if;
  if p.mode='personal' and (p.status='awaiting_handover' or exists(select 1 from manager_handover_sessions where period_id=p.id and status='pending') or exists(select 1 from manager_pending_expenses where period_id=p.id and status='pending') or exists(select 1 from operations_cash_accounts a where a.period_id=p.id and (select coalesce(sum(amount),0) from operations_cash_postings where account_id=a.id)<>0)) then raise exception using errcode='23514',message='Resolve the handover, money still held, awaiting receipts and funding requests before closing this period';end if;
  update manager_periods set status='closed',ended_at=now() where id=p.id returning to_jsonb(manager_periods.*) into result;
 else result:=manager_period_write_before_reports(p_actor,p_operation,p_payload);end if;
 if p_operation in ('close','assign','provision') and result->>'id' is not null and (p_operation<>'provision' or not exists(select 1 from manager_period_events where period_id=(result->>'id')::uuid and action='provision')) then
  insert into manager_period_events(period_id,actor_id,action,reason,before_value,after_value) values((result->>'id')::uuid,p_actor,p_operation,reason,before_value,result);
 end if;
 if request_uuid is not null and result->>'id' is not null then insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,request_uuid,result->>'business',(result->>'id')::uuid,fp,result);end if;
 return result;
end $$;
-- Explicit verified returns resolve custody before closure; they are not income or funding.
do $migration$ declare body text;needle text:=$old$  else
   select * into responsible from manager_periods where id=(recipient->>'period_id')::uuid and business=business_name and ended_at is null;
   select * into person from profiles where id=responsible.manager_id and not suspended;
   if recipient->>'type'<>'manager'$old$;
begin
 body:=pg_get_functiondef('public.operations_cash_write(uuid,text,jsonb,uuid)'::regprocedure);
 if position(needle in body)=0 then raise exception 'Unexpected cash handoff definition';end if;
 body:=replace(body,needle,$new$  elsif recipient->>'type' in ('ceo','custodian') then
   if reason is null or (p_payload->>'confirmed_receipt') is distinct from 'true' then raise exception using errcode='22023',message='Confirm the actual return and explain who received it';end if;
   if recipient->>'type'='ceo' then target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'ceo',p_actor::text,coalesce(actor_row.name,'CEO'));
   else
    if length(trim(coalesce(recipient->>'name',''))) not between 1 and 150 then raise exception using errcode='22023',message='Name the actual custodian';end if;
    target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'custodian',lower(trim(recipient->>'name')),trim(recipient->>'name'));
   end if;period:=source.period_id;
  else
   select * into responsible from manager_periods where id=(recipient->>'period_id')::uuid and business=business_name and ended_at is null;
   select * into person from profiles where id=responsible.manager_id and not suspended;
   if recipient->>'type'<>'manager'$new$);
 body:=replace(body,$old$'notes',p_payload->>'notes'),null,null,md5(p_request_id::text||':owner-funding')$old$,$new$'notes',p_payload->>'notes'),null,reason,md5(p_request_id::text||':owner-funding')$new$);execute body;
end $migration$;
-- Bimbo may identify a real receiving manager on another person's behalf. Staff cannot impersonate them.
do $migration$ declare body text;needle text:=$old$  elsif party->>'type'='custodian' then$old$;
begin
 body:=pg_get_functiondef('operations_private.business_cash_effect(uuid,text,text,text,jsonb,jsonb,uuid,text)'::regprocedure);
 if position(needle in body)=0 then raise exception 'Unexpected cash receiver definition';end if;
 body:=replace(body,needle,$new$  elsif party->>'type'='manager' then
   if actor_row.role<>'admin' then raise exception using errcode='42501',message='Only Bimbo may identify another manager receiving a payment';end if;
   select * into responsible from manager_periods where id=(party->>'period_id')::uuid and business=business_name;
   select * into holder from profiles where id=responsible.manager_id;
   if responsible.id is null or holder.id is null or (responsible.starts_on is not null and d<responsible.starts_on) then raise exception using errcode='42501',message='Choose the real receiving manager period in this business on the actual payment date';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'manager',responsible.id::text,coalesce(holder.name,'Manager'),responsible.id);
  elsif party->>'type'='custodian' then$new$);
 body:=replace(body,$old$if p_operation<>'create' and old_event.id is null then return null;end if;$old$,$new$if p_operation<>'create' and old_event.id is null then
  if p_payload ?| array['cash_receiver','cash_payer_account_id','cash_payer_review','cash_bucket'] then raise exception using errcode='22023',message='This record predates verified cash custody. Keep its unknown historical payer or recipient; no cash history will be inferred';end if;
  return null;end if;$new$);execute body;
end $migration$;
alter function public.operations_cash_summary(uuid,text,uuid,date,date,integer,integer) rename to operations_cash_summary_before_control;
revoke all on function operations_cash_summary_before_control(uuid,text,uuid,date,date,integer,integer) from public,anon,authenticated,service_role;
create function public.operations_cash_summary(p_actor uuid,p_business text,p_period_id uuid default null,p_from date default null,p_to date default null,p_page integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;receivers jsonb:='[]';begin
 result:=operations_cash_summary_before_control(p_actor,p_business,p_period_id,p_from,p_to,p_page,p_limit);
 if exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then select coalesce(jsonb_agg(jsonb_build_object('period_id',m.id,'name',p.name) order by p.name,m.id),'[]'::jsonb) into receivers from manager_periods m join profiles p on p.id=m.manager_id where m.business=p_business and m.ended_at is null and not p.suspended;end if;
 return result||jsonb_build_object('manager_receivers',receivers);
end $$;
revoke all on function operations_cash_summary(uuid,text,uuid,date,date,integer,integer) from public,anon,authenticated;
grant execute on function operations_cash_summary(uuid,text,uuid,date,date,integer,integer) to service_role;
-- Currency rounding is prospective and occurs before RETURNING/audit/cash use the persisted sale.
-- Legacy/unlinked writes and original stored totals retain their exact historical precision.
do $migration$ declare body text;needle text:=$old$else update public.farm_sales set date=v_sale.date,customer_name=v_sale.customer_name,product=v_sale.product,quantity=v_sale.quantity,unit_price=v_sale.unit_price,total_amount=v_sale.total_amount,payment_method=v_sale.payment_method,notes=v_sale.notes,weight_kg=v_sale.weight_kg,gender=v_sale.gender,other_product_name=v_sale.other_product_name,pricing_basis=v_sale.pricing_basis,is_edited=v_sale.is_edited,voided_at=v_sale.voided_at,voided_by=v_sale.voided_by,void_reason=v_sale.void_reason,revision=v_sale.revision where id=p_id;$old$;
begin
 body:=pg_get_functiondef('public.farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 if position(needle in body)=0 or position('insert into public.farm_sales select v_sale.*;' in body)=0 then raise exception 'Unexpected original sale constructor';end if;
 body:=replace(body,'insert into public.farm_sales select v_sale.*;','insert into public.farm_sales select v_sale.* returning * into v_sale;');
 body:=replace(body,needle,left(needle,length(needle)-1)||' returning * into v_sale;');execute body;
end $migration$;
create function operations_private.cash_sale_amount() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_setting('operations.cash_sale',true)='1' and new.pricing_basis is not null then
  new.total_amount:=round(new.total_amount,2);
  if new.total_amount<=0 then raise exception using errcode='22023',message='The saved sale amount must be at least 0.01 after currency rounding';end if;
 end if;return new;
end $$;
create trigger manager_sale_currency before insert or update of total_amount on farm_sales for each row execute function operations_private.cash_sale_amount();
create or replace function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare saved text:=current_setting('operations.cash_sale',true);c jsonb;result jsonb;intent boolean;
begin
 if p_kind='sale' then
  c:=manager_context(p_actor,'farm',coalesce(nullif(coalesce(p_payload->>'manager_period_id',p_payload->0->>'manager_period_id'),'')::uuid,nullif(current_setting('operations.period',true),'')::uuid));
  intent:=c->>'mode'='personal' or p_payload ? 'cash_receiver' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p_payload)='array' then p_payload else '[]'::jsonb end) t where t ? 'cash_receiver') or exists(select 1 from operations_cash_events where resource='farm_sales' and record_id=p_id);
  perform set_config('operations.cash_sale',case when intent then '1' else '' end,true);
 end if;
 result:=operations_private.business_cash_write('farm_v2_write',p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);
 perform set_config('operations.cash_sale',coalesce(saved,''),true);return result;
end $$;
-- Audit rows follow the proven original target as well as direct new-period attribution.
create function operations_private.report_audit_visible(p_actor uuid,p_business text,p_row jsonb,p_period uuid) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare target text;value jsonb;
begin
 target:=operations_private.write_resource(case p_business when 'property' then 'property_write' when 'content' then 'content_write' else 'farm_v2_write' end,p_row->>'record_type');
 if target is null or not exists(select 1 from operations_private.resources() where resource=target and business=p_business) then return false;end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',target) into value using (p_row->>'record_id')::uuid;
 return operations_private.record_visible(p_actor,target,value,p_period,true);
end $$;
create function public.manager_report_snapshot(p_actor uuid,p_business text,p_period_id uuid default null,p_from date default null,p_to date default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;r record;rows jsonb;assets jsonb:='{}';records jsonb:='{}';asset_rows jsonb;cash jsonb;period_rows jsonb;clauses text;until_date date:=coalesce(p_to,(now() at time zone 'Africa/Lagos')::date);from_date date;bridge jsonb;owner_total numeric;sales_total numeric;tracked_owner numeric;tracked_sales numeric;manager jsonb;decisions jsonb;
begin
 c:=manager_context(p_actor,p_business,p_period_id);from_date:=coalesce(p_from,(c->>'startsOn')::date,'0001-01-01');
 if from_date>until_date then raise exception using errcode='22023',message='Choose a valid reporting period';end if;
 if c->>'status'='awaiting_handover' and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 for r in select * from operations_private.resources() where business=p_business loop
  clauses:='operations_private.record_visible($1,$2,to_jsonb(t),$3,true)';
  if r.resource in ('farm_activity','property_events','content_audit') then clauses:='('||clauses||' or operations_private.report_audit_visible($1,$4,to_jsonb(t),$3))';end if;
  if r.date_column is not null and r.resource not in ('farm_activity','property_events','content_audit','farm_operation_events') then clauses:=clauses||format(' and (t.%I is null or t.%I::date<=$5)',r.date_column,r.date_column);end if;
  execute format('select coalesce(jsonb_agg(operations_private.row_payload($1,$2,to_jsonb(t),$3)||jsonb_build_object(''_source_json'',to_jsonb(t)::text) order by t.id),''[]''::jsonb) from public.%I t where %s',r.resource,clauses) into rows using p_actor,r.resource,p_period_id,p_business,until_date;
  records:=records||jsonb_build_object(r.resource,rows);
  if r.is_asset then
   execute format('select coalesce(jsonb_agg(operations_private.row_payload($1,$2,to_jsonb(t),$3) order by t.id),''[]''::jsonb) from public.%I t where operations_private.record_visible($1,$2,to_jsonb(t),$3,false)',r.resource) into asset_rows using p_actor,r.resource,p_period_id;
   assets:=assets||jsonb_build_object(r.resource,asset_rows);
  end if;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('amount_exact',e.amount::text,'source_name',s.name,'target_name',t.name,'created_by_name',(select name from profiles where id=e.actor_id),'_source_json',to_jsonb(e)::text) order by e.event_date,e.recorded_at,e.id),'[]'::jsonb) into rows from operations_cash_events e join operations_cash_accounts s on s.id=e.source_account_id join operations_cash_accounts t on t.id=e.target_account_id where e.business=p_business and e.event_date<=until_date and (c->>'mode'='admin_all' or e.period_id=(c->>'periodId')::uuid or s.period_id=(c->>'periodId')::uuid or t.period_id=(c->>'periodId')::uuid);
 records:=records||jsonb_build_object('operations_cash_events',rows);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('amount_exact',t.amount::text,'_source_json',to_jsonb(t)::text) order by t.operational_date,t.id),'[]'::jsonb) into rows from operations_cash_postings t where t.event_id in (select (value->>'id')::uuid from jsonb_array_elements(records->'operations_cash_events'));
 records:=records||jsonb_build_object('operations_cash_postings',rows);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('amount_exact',t.amount::text,'created_by_name',(select name from profiles where id=t.requested_by),'_source_json',to_jsonb(t)::text) order by t.requested_at,t.id),'[]'::jsonb) into rows from manager_pending_expenses t where t.business=p_business and (c->>'mode'='admin_all' or t.period_id=(c->>'periodId')::uuid);
 records:=records||jsonb_build_object('manager_pending_expenses',rows);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('created_by_name',(select name from profiles where id=t.actor_id),'_source_json',to_jsonb(t)::text) order by t.decided_at,t.id),'[]'::jsonb) into rows from manager_pending_decisions t where t.pending_id in (select (value->>'id')::uuid from jsonb_array_elements(records->'manager_pending_expenses'));
 records:=records||jsonb_build_object('manager_pending_decisions',rows);
 cash:=operations_cash_summary(p_actor,p_business,p_period_id,from_date,until_date,0,100);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('manager_name',p.name) order by t.created_at desc,t.id),'[]'::jsonb) into period_rows from manager_periods t join profiles p on p.id=t.manager_id where t.business=p_business and (c->>'mode'='admin_all' or t.manager_id=(c->>'managerId')::uuid);
 select jsonb_build_object('id',id,'name',name,'suspended',suspended) into manager from profiles where id=(c->>'managerId')::uuid;
 if c->>'mode'='admin_all' and p_business='farm' then
  select coalesce(sum(amount),0) into owner_total from farm_fund_transfers where voided_at is null and date<=until_date;
  select owner_total-coalesce(sum(amount) filter(where expense_source is distinct from 'sales_cash'),0) into owner_total from farm_expenses where voided_at is null and date<=until_date;
  select owner_total-coalesce(sum(cost),0) into owner_total from farm_feed_purchases where date<=until_date;
  select coalesce(sum(total_amount),0) into sales_total from farm_sales where voided_at is null and date<=until_date;
  select sales_total-coalesce(sum(amount),0) into sales_total from farm_expenses where voided_at is null and expense_source='sales_cash' and date<=until_date;
  select coalesce(sum(p.amount) filter(where a.bucket='owner'),0),coalesce(sum(p.amount) filter(where a.bucket='sales'),0) into tracked_owner,tracked_sales from operations_cash_postings p join operations_cash_accounts a on a.id=p.account_id where a.business='farm' and a.holder_type<>'outside' and p.operational_date<=until_date;
  bridge:=jsonb_build_object('currency','NGN','owner_ledger',owner_total::text,'tracked_owner',tracked_owner::text,'unallocated_owner',(owner_total-tracked_owner)::text,'sales_ledger',sales_total::text,'tracked_sales',tracked_sales::text,'unallocated_sales',(sales_total-tracked_sales)::text);
 end if;
 -- Current issues are deliberately independent of the historical financial filter.
 select jsonb_build_object('handovers',coalesce((select jsonb_agg(jsonb_build_object('periodId',s.period_id,'manager',p.name,'item',i.snapshot,'status',i.status,'date',i.decided_at)) from manager_handover_sessions s join manager_periods m on m.id=s.period_id join profiles p on p.id=m.manager_id join manager_handover_items i on i.session_id=s.id where m.business=p_business and s.status='pending' and i.present and i.status='cannot_confirm' and (c->>'mode'='admin_all' or s.period_id=(c->>'periodId')::uuid)),'[]'::jsonb)) into decisions;
 if p_business='farm' then
  select coalesce(jsonb_agg(operations_private.row_payload(p_actor,'farm_operational_requests',to_jsonb(t),p_period_id) order by t.created_at,t.id),'[]'::jsonb) into rows from farm_operational_requests t where t.status in ('pending','approved') and operations_private.record_visible(p_actor,'farm_operational_requests',to_jsonb(t),p_period_id,true);
  decisions:=decisions||jsonb_build_object('operational_requests',rows);
  select coalesce(jsonb_agg(operations_private.row_payload(p_actor,'farm_correction_requests',to_jsonb(t),p_period_id) order by t.requested_at,t.id),'[]'::jsonb) into rows from farm_correction_requests t where t.status='pending' and operations_private.record_visible(p_actor,'farm_correction_requests',to_jsonb(t),p_period_id,true);
  decisions:=decisions||jsonb_build_object('corrections',rows);
 end if;
 return jsonb_build_object('scope',c,'manager',manager,'periods',period_rows,'from',from_date,'to',until_date,'asOf',now(),'records',records,'assets',assets,'cash',cash,'cash_daily',operations_cash_summary(p_actor,p_business,p_period_id,until_date,until_date,0,100),'bridge',bridge,'decisions',decisions);
end $$;
revoke all on function manager_report_snapshot(uuid,text,uuid,date,date),manager_period_write(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function manager_report_snapshot(uuid,text,uuid,date,date),manager_period_write(uuid,text,jsonb) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
