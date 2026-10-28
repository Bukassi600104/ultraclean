-- Preconditions: scoped writers, physical feed activity, balanced cash custody.
-- New personal financial work only; original/unlinked legacy records retain their meaning.
-- Pending costs never enter posted ledgers or reduce cash. Actual deliveries are independent.
-- Source writes, postings and corrections share one transaction and original date locks.
-- Rollback retains pending requests, source links and cash history; no historical rebuild.
begin;
create or replace function operations_private.business_payload(p_payload jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select case when jsonb_typeof(p_payload)='array' then (select jsonb_agg(value-array['manager_period_id','cash_receiver','cash_payer_account_id','cash_payer_review','cash_bucket','cash_allocations']) from jsonb_array_elements(p_payload)) else p_payload-array['manager_period_id','cash_receiver','cash_payer_account_id','cash_payer_review','cash_bucket','cash_allocations'] end
$$;
create table public.manager_pending_expenses(
 id uuid primary key default gen_random_uuid(),business text not null,period_id uuid not null references manager_periods(id),
 requested_by uuid not null references profiles(id),requested_at timestamptz not null default now(),
 writer text not null,kind text not null,payload jsonb not null,validated_record jsonb not null,
 activity_date date not null,currency text not null,bucket text not null,amount numeric not null check(amount>0),
 observed_available numeric not null,shortfall numeric not null check(shortfall>=0),feed_activity_id uuid references farm_feed_activities(id),
 status text not null default 'pending' check(status in ('pending','posted','declined')),revision integer not null default 0,
 resolved_by uuid references profiles(id),resolved_at timestamptz,resolution_reason text,payer_account_id uuid references operations_cash_accounts(id),posted_record_id uuid,
 check((status='pending')=(resolved_at is null))
);
create table public.manager_pending_decisions(
 id uuid primary key default gen_random_uuid(),pending_id uuid not null references manager_pending_expenses(id),
 actor_id uuid not null references profiles(id),decided_at timestamptz not null default now(),action text not null,reason text not null,
 before_value jsonb not null,after_value jsonb not null
);
create trigger pending_decisions_immutable before update or delete on manager_pending_decisions for each row execute function farm_activity_immutable();
create index manager_pending_queue on manager_pending_expenses(period_id,status,requested_at);
do $$ declare t text;begin foreach t in array array['manager_pending_expenses','manager_pending_decisions'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);execute format('grant select on public.%I to service_role',t);
end loop;end $$;
create function operations_private.pending_expense_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['status','revision','resolved_by','resolved_at','resolution_reason','payer_account_id','posted_record_id']) is distinct from (to_jsonb(old)-array['status','revision','resolved_by','resolved_at','resolution_reason','payer_account_id','posted_record_id']) then
  raise exception using errcode='42501',message='Pending entry facts must be retained';end if;
 return new;
end $$;
create trigger pending_expense_facts before update or delete on manager_pending_expenses for each row execute function operations_private.pending_expense_guard();

create function operations_private.business_cash_effect(p_actor uuid,p_writer text,p_kind text,p_operation text,p_row jsonb,p_payload jsonb,p_period uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare resource_name text:=operations_private.write_resource(p_writer,p_kind);business_name text:=case p_writer when 'property_write' then 'property' when 'content_write' then 'content' else 'farm' end;
 cash_kind text:=case when p_kind in ('expense','feed') then 'spend' else 'inflow' end;currency_name text;bucket_name text;d date;amount numeric;
 old_event operations_cash_events;new_event operations_cash_events;actor_row profiles;holder profiles;responsible manager_periods;account operations_cash_accounts;
 source_id uuid;target_id uuid;root uuid;event_uuid uuid:=gen_random_uuid();reversal_uuid uuid;split_correction boolean:=false;available numeric;party jsonb:=p_payload->'cash_receiver';
begin
 select * into actor_row from profiles where id=p_actor and not suspended;
 select * into responsible from manager_periods where id=p_period;
 select * into old_event from operations_cash_events e where e.resource=resource_name and e.record_id=(p_row->>'id')::uuid and e.operation<>'void' and not exists(select 1 from operations_cash_events replacement where replacement.corrects_id=e.id) for update;
 if p_operation<>'create' and old_event.id is null then return null;end if;
 currency_name:=case when business_name='farm' then 'NGN' else p_row->>'currency' end;
 bucket_name:=case when cash_kind='inflow' then 'sales' when business_name='farm' then case when p_row->>'expense_source'='sales_cash' and p_kind<>'feed' then 'sales' else 'owner' end else coalesce(p_payload->>'cash_bucket',old_event.bucket,'owner') end;
 d:=(p_row->>(case when business_name='farm' then 'date' when p_kind='rent_payment' then 'payment_date' when p_kind='expense' then 'expense_date' else 'sale_date' end))::date;
 if p_operation='create' and responsible.mode='personal' and d<responsible.starts_on then raise exception using errcode='42501',message='New responsibility records cannot predate the manager''s work start';end if;
 amount:=case when p_row->>'voided_at' is not null then 0 else (p_row->>(case when business_name='farm' and p_kind='sale' then 'total_amount' when p_kind='feed' then 'cost' else 'amount' end))::numeric end;
 if bucket_name not in ('owner','sales') or currency_name!~'^[A-Z]{3}$' or amount is null or amount<0 or scale(amount)>2 then raise exception using errcode='22023',message='Check the persisted amount, currency and funding source';end if;
 split_correction:=old_event.id is not null and (old_event.currency,old_event.bucket) is distinct from (currency_name,bucket_name);
 perform pg_advisory_xact_lock(hashtextextended('operations-cash:'||business_name||':'||currency_name||':'||bucket_name,0));
 if cash_kind='inflow' then
  if party is null and old_event.id is not null then
   if split_correction then select * into account from operations_cash_accounts where id=old_event.target_account_id;target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,account.holder_type,account.holder_ref,account.name,account.period_id);
   else target_id:=old_event.target_account_id;end if;
  elsif party->>'type'='self' then
   if responsible.id is not null and actor_row.role<>'admin' then
    select * into holder from profiles where id=responsible.manager_id;
    target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'manager',responsible.id::text,coalesce(holder.name,'Manager'),responsible.id);
   else target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'ceo',p_actor::text,coalesce(actor_row.name,'CEO'));end if;
  elsif party->>'type'='ceo' then
   select * into holder from profiles where id=(party->>'profile_id')::uuid and role='admin' and not suspended;
   if holder.id is null then raise exception using errcode='42501',message='Choose the actual active CEO receiving account';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'ceo',holder.id::text,coalesce(holder.name,'CEO'));
  elsif party->>'type'='custodian' then
   select * into account from operations_cash_accounts where id=(party->>'account_id')::uuid and business=business_name and holder_type='custodian';
   if account.id is null then raise exception using errcode='42501',message='Choose a registered custodian in this business';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'custodian',account.holder_ref,account.name);
  else raise exception using errcode='22023',message='Choose who actually received this payment';end if;
  source_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'outside','external','Outside business');
  root:=event_uuid;
  if old_event.id is not null and not split_correction then select lot_id into root from operations_cash_postings where event_id=old_event.id and phase='effect' limit 1;end if;
 else
  if p_payload->>'cash_payer_account_id' is not null then
   select * into account from operations_cash_accounts where id=(p_payload->>'cash_payer_account_id')::uuid;
   if account.id is null or (account.business,account.currency,account.bucket) is distinct from (business_name,currency_name,bucket_name) or account.holder_type in ('outside','awaiting') then raise exception using errcode='42501',message='Choose a confirmed payer in this business, currency and funding source';end if;
   source_id:=account.id;
  elsif old_event.id is not null then
   if split_correction then select * into account from operations_cash_accounts where id=old_event.source_account_id;source_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,account.holder_type,account.holder_ref,account.name,account.period_id);
   else source_id:=old_event.source_account_id;end if;
  elsif responsible.id is not null and actor_row.role<>'admin' then
   select * into holder from profiles where id=responsible.manager_id;
   source_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'manager',responsible.id::text,coalesce(holder.name,'Manager'),responsible.id);
  else raise exception using errcode='22023',message='Choose the person who actually paid this expense';end if;
  target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'outside','external','Outside business');
  select * into account from operations_cash_accounts where id=source_id;
  if actor_row.role<>'admin' and (coalesce((p_payload->>'cash_payer_review')::boolean,false) or account.holder_type<>'manager' or account.period_id is distinct from p_period) then raise exception using errcode='P0F01',message='Bimbo must confirm the actual payer';end if;
 end if;
 perform 1 from operations_cash_accounts where id in (source_id,target_id,old_event.source_account_id,old_event.target_account_id) order by id for update;
 if split_correction then
  -- A corrected currency/source is an undo and a new actual amount, never an FX conversion.
  reversal_uuid:=gen_random_uuid();
  insert into operations_cash_events(id,business,currency,bucket,operation,cash_kind,amount,event_date,source_account_id,target_account_id,period_id,actor_id,reason,corrects_id,resource,record_id,record_revision)
  values(reversal_uuid,business_name,old_event.currency,old_event.bucket,'void',old_event.cash_kind,0,old_event.event_date,old_event.source_account_id,old_event.target_account_id,p_period,p_actor,p_reason,old_event.id,resource_name,(p_row->>'id')::uuid,coalesce((p_row->>'revision')::integer,0));
  insert into operations_cash_postings(event_id,account_id,lot_id,amount,operational_date,phase) select reversal_uuid,p.account_id,p.lot_id,-p.amount,p.operational_date,'reversal' from operations_cash_postings p where p.event_id=old_event.id and p.phase='effect';
 end if;
 insert into operations_cash_events(id,business,currency,bucket,operation,cash_kind,amount,event_date,source_account_id,target_account_id,period_id,actor_id,notes,reason,corrects_id,origin_event_id,resource,record_id,record_revision)
 values(event_uuid,business_name,currency_name,bucket_name,case when old_event.id is null then cash_kind when amount=0 then 'void' else 'correct' end,cash_kind,amount,d,source_id,target_id,p_period,p_actor,p_row->>'notes',p_reason,case when not split_correction then old_event.id end,reversal_uuid,resource_name,(p_row->>'id')::uuid,coalesce((p_row->>'revision')::integer,0)) returning * into new_event;
 if old_event.id is not null and not split_correction then
  insert into operations_cash_postings(event_id,account_id,lot_id,amount,operational_date,phase)
   select event_uuid,p.account_id,p.lot_id,-p.amount,p.operational_date,'reversal' from operations_cash_postings p where p.event_id=old_event.id and p.phase='effect';
 end if;
 if cash_kind='spend' and amount>operations_private.cash_available(source_id,d) then
  if p_operation='create' then raise exception using errcode='P0F01',message='Confirmed available funds do not cover this cost';
  else raise exception using errcode='23514',message='The correction needs confirmed funding on the original date. Existing records have been preserved';end if;
 end if;
 if amount>0 then perform operations_private.cash_move(event_uuid,source_id,target_id,amount,d,root,p_payload->'cash_allocations');end if;
 if exists(select 1 from operations_cash_postings p join operations_cash_accounts a on a.id=p.account_id where p.event_id=event_uuid and a.holder_type<>'outside' and (operations_private.cash_available(a.id,p.operational_date)<0 or operations_private.cash_available(a.id,p.operational_date,p.lot_id)<0)) then
  raise exception using errcode='23514',message='The correction conflicts with funds already spent or committed. Review the funding and downstream entries first';end if;
 return to_jsonb(new_event)||jsonb_build_object('amount',amount::text);
end $$;

-- Retain every original writer/validation/audit as a revoked delegate.
alter function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_business_cash;
alter function property_write(uuid,text,text,jsonb,uuid,text,uuid) rename to property_write_before_business_cash;
alter function content_write(uuid,text,text,jsonb,uuid,text,uuid) rename to content_write_before_business_cash;
revoke all on function farm_v2_write_before_business_cash(uuid,text,text,jsonb,uuid,text,uuid),property_write_before_business_cash(uuid,text,text,jsonb,uuid,text,uuid),content_write_before_business_cash(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function operations_private.business_cash_write(p_writer text,p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid,p_reason text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare business_name text:=case p_writer when 'property_write' then 'property' when 'content_write' then 'content' else 'farm' end;
 resource_name text:=operations_private.write_resource(p_writer,p_kind);c jsonb;result jsonb;item jsonb;rows jsonb:='[]';effect jsonb;physical jsonb;entry manager_pending_expenses;r manager_write_receipts;
 fp text;financial boolean;cash_metadata boolean;position integer:=0;first_pending jsonb;amount numeric;available numeric;d date;currency_name text;bucket_name text;stock_activity uuid;
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);
begin
 if p_writer not in ('farm_v2_write','property_write','content_write') then raise exception using errcode='42501',message='Unsupported business writer';end if;
 financial:=(p_writer='farm_v2_write' and p_kind in ('sale','expense','feed')) or (p_writer='property_write' and p_kind in ('rent_payment','expense')) or (p_writer='content_write' and p_kind='sale');
 if not financial then execute format('select public.%I($1,$2,$3,$4,$5,$6,$7)',p_writer||'_before_business_cash') into result using p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id;return result;end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 c:=manager_context(p_actor,business_name,coalesce(nullif(coalesce(p_payload->>'manager_period_id',p_payload->0->>'manager_period_id'),'')::uuid,nullif(current_setting('operations.period',true),'')::uuid));
 cash_metadata:=(p_payload ?| array['cash_receiver','cash_payer_account_id','cash_payer_review','cash_bucket']) or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p_payload)='array' then p_payload else '[]'::jsonb end) value where value ?| array['cash_receiver','cash_payer_account_id','cash_payer_review','cash_bucket']);
 if c->>'mode'<>'personal' and not cash_metadata and not exists(select 1 from operations_cash_events where resource=resource_name and record_id=p_id) then
  execute format('select public.%I($1,$2,$3,$4,$5,$6,$7)',p_writer||'_before_business_cash') into result using p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id;return result;
 end if;
 c:=operations_private.prepare_write(p_actor,business_name,p_payload,p_request_id,md5(jsonb_build_array(p_writer,p_kind,p_operation,p_payload,p_id,p_reason)::text),operations_private.correction_period(p_actor,p_writer,p_kind,p_id));
 fp:=encode(sha256(convert_to(jsonb_build_array(p_writer,p_kind,p_operation,p_payload,p_id,p_reason)::text,'UTF8')),'hex');
 if p_request_id is not null then
  select * into r from manager_write_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then if r.business<>business_name or r.period_id is distinct from (c->>'periodId')::uuid or r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another entry or responsibility period';end if;
   perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);return r.result;
  end if;
 end if;
 if jsonb_typeof(p_payload)='array' then
  if p_operation<>'create' or p_writer<>'farm_v2_write' or jsonb_array_length(p_payload) not between 1 and 50 or p_request_id is null then raise exception using errcode='22023',message='A valid batch and retry identifier are required';end if;
  perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
  for d in select distinct (value->>'date')::date from jsonb_array_elements(p_payload) order by 1 loop perform farm_v2_lock_date(d,exists(select 1 from profiles where id=p_actor and role='admin'),p_reason);end loop;
  for item in select value from jsonb_array_elements(p_payload) loop
   effect:=operations_private.business_cash_write(p_writer,p_actor,p_kind,p_operation,item,null,p_reason,md5(p_request_id::text||':cash-row:'||position::text)::uuid);position:=position+1;rows:=rows||jsonb_build_array(effect);
   if effect->>'status'='pending_funding' and first_pending is null then first_pending:=effect;end if;
  end loop;
  result:=case when first_pending is null then rows else first_pending||jsonb_build_object('results',rows) end;
 else
  begin
   execute format('select public.%I($1,$2,$3,$4,$5,$6,$7)',p_writer||'_before_business_cash') into result using p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id;
   if p_operation='create' and p_request_id is null then raise exception using errcode='22023',message='A stable retry identifier is required for a personal financial entry';end if;
   effect:=operations_private.business_cash_effect(p_actor,p_writer,p_kind,p_operation,result,p_payload,(c->>'periodId')::uuid,p_reason);
  exception when sqlstate 'P0F01' then
   if nullif(current_setting('operations.resolving_pending',true),'') is not null then raise;end if;
   if p_operation<>'create' or p_kind not in ('expense','feed') or c->>'periodId' is null then raise exception using errcode='23514',message='Identify confirmed funding and the actual payer before posting this cost';end if;
   -- PL/pgSQL retains validated variables, while this subtransaction rolls back
   -- the business row, its movements, cash effects and all original writer receipts.
   amount:=(result->>(case p_kind when 'feed' then 'cost' else 'amount' end))::numeric;
   d:=(result->>(case when business_name='farm' then 'date' else 'expense_date' end))::date;
   currency_name:=case when business_name='farm' then 'NGN' else result->>'currency' end;
   bucket_name:=case when business_name='farm' then case when p_kind<>'feed' and result->>'expense_source'='sales_cash' then 'sales' else 'owner' end else coalesce(p_payload->>'cash_bucket','owner') end;
   select coalesce(operations_private.cash_available(a.id,d),0) into available from operations_cash_accounts a where a.period_id=(c->>'periodId')::uuid and a.holder_type='manager' and a.currency=currency_name and a.bucket=bucket_name;available:=coalesce(available,0);
   stock_activity:=(p_payload->>'feed_activity_id')::uuid;
   if p_kind='feed' and coalesce((p_payload->>'delivery_received')::boolean,false) and stock_activity is null then
    physical:=farm_feed_activity_write(p_actor,'received',jsonb_strip_nulls(jsonb_build_object('date',coalesce(p_payload->>'delivery_date',d::text),'feed_type',result->>'feed_type','feed_source',result->>'feed_source','bags',(result->>'num_bags')::integer,'notes',result->>'notes','included_in_starting_count',p_payload->'included_in_starting_count')),null,p_reason,md5(p_request_id::text||':pending-delivery')::uuid);
    stock_activity:=(physical->'activity'->>'id')::uuid;
   end if;
   insert into manager_pending_expenses(business,period_id,requested_by,writer,kind,payload,validated_record,activity_date,currency,bucket,amount,observed_available,shortfall,feed_activity_id)
   values(business_name,(c->>'periodId')::uuid,p_actor,p_writer,p_kind,p_payload,result,d,currency_name,bucket_name,amount,available,greatest(0,amount-available),stock_activity) returning * into entry;
   result:=jsonb_build_object('status','pending_funding','id',entry.id,'currency',currency_name,'shortfall',entry.shortfall::text,'amount',amount::text,'message','Saved for Bimbo''s funding review; not yet posted');
  end;
 end if;
 if p_request_id is not null then insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,p_request_id,business_name,(c->>'periodId')::uuid,fp,result);end if;
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);return result;
end $$;
create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$ select operations_private.business_cash_write('farm_v2_write',p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id) $$;
create function public.property_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$ select operations_private.business_cash_write('property_write',p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id) $$;
create function public.content_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$ select operations_private.business_cash_write('content_write',p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id) $$;
revoke all on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid),property_write(uuid,text,text,jsonb,uuid,text,uuid),content_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid),property_write(uuid,text,text,jsonb,uuid,text,uuid),content_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
create function public.operations_pending_expense_write(p_actor uuid,p_id uuid,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare entry manager_pending_expenses;before_value jsonb;c jsonb;account operations_cash_accounts;available numeric;result jsonb;posted jsonb;values_to_post jsonb;r manager_write_receipts;fp text;
 saved_pending text:=current_setting('operations.resolving_pending',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can resolve a funding gap';end if;
 select * into entry from manager_pending_expenses where id=p_id for update;
 if entry.id is null then raise exception using errcode='P0002',message='Pending expense not found';end if;
 if (p_payload ? 'business' and p_payload->>'business'<>entry.business) or (p_payload->>'manager_period_id' is not null and (p_payload->>'manager_period_id')::uuid<>entry.period_id) then raise exception using errcode='42501',message='This funding request belongs to a different business or manager period';end if;
 c:=manager_context(p_actor,entry.business,entry.period_id);
 if p_request_id is null or p_payload->>'action' not in ('post','decline') or nullif(trim(p_payload->>'reason'),'') is null or length(p_payload->>'reason')>2000 then raise exception using errcode='22023',message='Choose an action, explain the real funding/payer and provide a retry identifier';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('resolve_pending',p_id,p_payload)::text,'UTF8')),'hex');
 select * into r from manager_write_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.fingerprint<>fp or r.period_id is distinct from entry.period_id or r.business<>entry.business then raise exception using errcode='23514',message='Retry belongs to a different decision';end if;return r.result;end if;
 if entry.status<>'pending' or entry.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='This pending entry was already reviewed. Refresh before deciding';end if;
 before_value:=to_jsonb(entry);
 if p_payload->>'action'='post' then
  select * into account from operations_cash_accounts where id=(p_payload->>'payer_account_id')::uuid for update;
  if account.id is null or (account.business,account.currency,account.bucket) is distinct from (entry.business,entry.currency,entry.bucket) or account.holder_type in ('outside','awaiting') then raise exception using errcode='42501',message='Select the actual confirmed payer in the original business, currency and funding source';end if;
  available:=operations_private.cash_available(account.id,entry.activity_date);
  if available<entry.amount then
   result:=jsonb_build_object('status','pending_funding','id',entry.id,'currency',entry.currency,'shortfall',(entry.amount-available)::text,'message','Still pending. Confirmed funds must be available on the original expense date');
  else
   values_to_post:=entry.payload||jsonb_build_object('manager_period_id',entry.period_id,'cash_payer_account_id',account.id);
   if entry.feed_activity_id is not null then values_to_post:=values_to_post||jsonb_build_object('delivery_received',true,'feed_activity_id',entry.feed_activity_id);end if;
   perform set_config('operations.resolving_pending',entry.id::text,true);
   execute format('select public.%I($1,$2,''create'',$3,null,$4,$5)',entry.writer) into posted using p_actor,entry.kind,values_to_post,p_payload->>'reason',md5(p_request_id::text||':pending-post')::uuid;
   perform set_config('operations.resolving_pending',coalesce(saved_pending,''),true);
   update manager_pending_expenses set status='posted',revision=revision+1,resolved_by=p_actor,resolved_at=now(),resolution_reason=p_payload->>'reason',payer_account_id=account.id,posted_record_id=(posted->>'id')::uuid where id=entry.id returning * into entry;
   insert into manager_pending_decisions(pending_id,actor_id,action,reason,before_value,after_value) values(entry.id,p_actor,'post',p_payload->>'reason',before_value,to_jsonb(entry));
   result:=jsonb_build_object('status','posted','data',posted,'pending_id',entry.id);
  end if;
 else
  update manager_pending_expenses set status='declined',revision=revision+1,resolved_by=p_actor,resolved_at=now(),resolution_reason=p_payload->>'reason' where id=entry.id returning * into entry;
  insert into manager_pending_decisions(pending_id,actor_id,action,reason,before_value,after_value) values(entry.id,p_actor,'decline',p_payload->>'reason',before_value,to_jsonb(entry));
  result:=jsonb_build_object('status','posted','decision','declined','data',to_jsonb(entry));
 end if;
 insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,p_request_id,entry.business,entry.period_id,fp,result);
 return result;
end $$;
alter function operations_cash_summary(uuid,text,uuid,date,date,integer,integer) rename to operations_cash_summary_before_pending;
revoke all on function operations_cash_summary_before_pending(uuid,text,uuid,date,date,integer,integer) from public,anon,authenticated,service_role;
create function public.operations_cash_summary(p_actor uuid,p_business text,p_period_id uuid default null,p_from date default null,p_to date default null,p_page integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;c jsonb;pending jsonb;recipients jsonb;
begin
 result:=operations_cash_summary_before_pending(p_actor,p_business,p_period_id,p_from,p_to,p_page,p_limit);c:=manager_context(p_actor,p_business,p_period_id);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('amount',t.amount::text,'shortfall',t.shortfall::text,'observed_available',t.observed_available::text,'requester_name',p.name) order by t.requested_at,t.id),'[]'::jsonb) into pending
 from manager_pending_expenses t left join profiles p on p.id=t.requested_by where t.business=p_business and (c->>'mode'='admin_all' or t.period_id=(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]'::jsonb) into recipients from profiles where role='admin' and not suspended;
 return result||jsonb_build_object('pending_expenses',pending,'ceo_receivers',recipients);
end $$;
revoke all on function operations_pending_expense_write(uuid,uuid,jsonb,uuid),operations_cash_summary(uuid,text,uuid,date,date,integer,integer) from public,anon,authenticated;
grant execute on function operations_pending_expense_write(uuid,uuid,jsonb,uuid),operations_cash_summary(uuid,text,uuid,date,date,integer,integer) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
