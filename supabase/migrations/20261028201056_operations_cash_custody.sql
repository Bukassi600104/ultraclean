-- Preconditions: manager scopes, guarded farm writers and feed physical activity.
-- Prospective custody only: no historical funding/recipient/balance backfill.
-- Exact NUMERIC postings carry original activity dates, source lots and two balanced legs.
-- Manager/provisioning and sorted account locks serialize receipts with dated spending.
-- Rollback retains these append-only events; never restore over current business activity.
begin;
create table public.operations_cash_accounts(
 id uuid primary key default gen_random_uuid(),business text not null check(business in ('farm','property','content')),
 currency text not null check(currency~'^[A-Z]{3}$'),bucket text not null check(bucket in ('owner','sales')),
 holder_type text not null check(holder_type in ('manager','custodian','ceo','awaiting','outside')),
 holder_ref text not null,period_id uuid references manager_periods(id),name text not null check(length(name) between 1 and 200),
 created_by uuid not null references profiles(id),created_at timestamptz not null default now(),
 unique(business,currency,bucket,holder_type,holder_ref),
 check((holder_type in ('manager','awaiting'))=(period_id is not null))
);
create table public.operations_cash_events(
 id uuid primary key default gen_random_uuid(),business text not null,currency text not null,bucket text not null,
 operation text not null check(operation in ('fund','handoff','receive','correct','void','inflow','spend','legacy_assignment')),
 cash_kind text not null check(cash_kind in ('fund','handoff','receive','inflow','spend','legacy_assignment')),
 amount numeric not null check(amount>=0 and amount<=9999999999999999.99 and scale(amount)<=2),event_date date not null,
 source_account_id uuid not null references operations_cash_accounts(id),target_account_id uuid not null references operations_cash_accounts(id),
 period_id uuid references manager_periods(id),actor_id uuid not null references profiles(id),recorded_at timestamptz not null default now(),
 notes text,reason text,origin_event_id uuid references operations_cash_events(id),corrects_id uuid unique references operations_cash_events(id),
 fund_transfer_id uuid references farm_fund_transfers(id),resource text,record_id uuid,record_revision integer,
 check(source_account_id<>target_account_id)
);
create table public.operations_cash_postings(
 id uuid primary key default gen_random_uuid(),event_id uuid not null references operations_cash_events(id),account_id uuid not null references operations_cash_accounts(id),
 lot_id uuid not null references operations_cash_events(id),amount numeric not null check(amount<>0 and scale(amount)<=2),
 operational_date date not null,phase text not null check(phase in ('effect','reversal')),
 unique(event_id,account_id,lot_id,phase,operational_date)
);
create table public.manager_write_receipts(
 actor_id uuid not null references profiles(id),request_id uuid not null,business text not null,period_id uuid references manager_periods(id),
 fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create index operations_cash_history on operations_cash_events(business,event_date,recorded_at,id);
create index operations_cash_period on operations_cash_accounts(period_id,currency,bucket);
create index operations_cash_lot_balance on operations_cash_postings(account_id,lot_id,operational_date);
create index operations_cash_source_record on operations_cash_events(resource,record_id,record_revision);
create trigger cash_events_immutable before update or delete on operations_cash_events for each row execute function farm_activity_immutable();
create trigger cash_postings_immutable before update or delete on operations_cash_postings for each row execute function farm_activity_immutable();
create trigger cash_receipts_immutable before update or delete on manager_write_receipts for each row execute function farm_activity_immutable();
do $$ declare t text;begin
 foreach t in array array['operations_cash_accounts','operations_cash_events','operations_cash_postings','manager_write_receipts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;

create function operations_private.cash_balance(p_account uuid,p_date date,p_lot uuid default null)
returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(sum(amount),0) from operations_cash_postings where account_id=p_account and operational_date<=p_date and (p_lot is null or lot_id=p_lot)
$$;
create function operations_private.cash_available(p_account uuid,p_date date,p_lot uuid default null)
returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select min(operations_private.cash_balance(p_account,d,p_lot)) from (
  select p_date d union select operational_date from operations_cash_postings where account_id=p_account and operational_date>=p_date and (p_lot is null or lot_id=p_lot)
 ) dates
$$;
create function operations_private.cash_account(p_actor uuid,p_business text,p_currency text,p_bucket text,p_type text,p_ref text,p_name text,p_period uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare account uuid;
begin
 -- Legacy spending retains its original ledger flow and cannot debit new personal custody.
 if p_type in ('manager','awaiting') and not exists(select 1 from manager_periods where id=p_period and business=p_business and mode='personal') then raise exception using errcode='42501',message='Verified manager funds require a personal operating period. Ask Bimbo to start one; legacy records and balances stay unchanged';end if;
 insert into operations_cash_accounts(business,currency,bucket,holder_type,holder_ref,period_id,name,created_by)
 values(p_business,p_currency,p_bucket,p_type,p_ref,p_period,p_name,p_actor) on conflict do nothing;
 select id into account from operations_cash_accounts where business=p_business and currency=p_currency and bucket=p_bucket and holder_type=p_type and holder_ref=p_ref;
 return account;
end $$;
create function operations_private.cash_check_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare event_uuid uuid;bad boolean;
begin
 if tg_table_name='operations_cash_events' then event_uuid:=new.id;else event_uuid:=new.event_id;end if;
 if not exists(select 1 from operations_cash_postings where event_id=event_uuid) or (select sum(amount) from operations_cash_postings where event_id=event_uuid)<>0 then
  raise exception using errcode='23514',message='Cash effects must balance in one transaction';end if;
 select exists(select 1 from operations_cash_postings p join operations_cash_accounts a on a.id=p.account_id join operations_cash_events e on e.id=p.event_id join operations_cash_events lot on lot.id=p.lot_id
  where e.id=event_uuid and ((a.business,a.currency,a.bucket) is distinct from (e.business,e.currency,e.bucket) or (lot.business,lot.currency,lot.bucket) is distinct from (e.business,e.currency,e.bucket) or lot.cash_kind not in ('fund','inflow','legacy_assignment'))) into bad;
 if bad then raise exception using errcode='23514',message='Cash source, business, currency and funding bucket must match';end if;
 if exists(select 1 from operations_cash_postings p join operations_cash_accounts a on a.id=p.account_id where p.event_id=event_uuid and a.holder_type<>'outside' and (
  operations_private.cash_available(a.id,p.operational_date)<0 or operations_private.cash_available(a.id,p.operational_date,p.lot_id)<0)) then
  raise exception using errcode='23514',message='These funds are unavailable on the original date or are already committed. Review the funding and downstream entries first';end if;
 return new;
end $$;
create constraint trigger cash_event_balanced after insert on operations_cash_events deferrable initially deferred for each row execute function operations_private.cash_check_event();
create constraint trigger cash_posting_balanced after insert on operations_cash_postings deferrable initially deferred for each row execute function operations_private.cash_check_event();

create function operations_private.cash_move(p_event uuid,p_source uuid,p_target uuid,p_amount numeric,p_date date,p_root uuid default null,p_lots jsonb default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare lot record;remaining numeric:=p_amount;take numeric;available numeric;specified numeric:=0;seen uuid[]:='{}';
begin
 perform 1 from operations_cash_accounts where id in (p_source,p_target) order by id for update;
 if p_root is not null then
  insert into operations_cash_postings(event_id,account_id,lot_id,amount,operational_date,phase) values(p_event,p_source,p_root,-p_amount,p_date,'effect'),(p_event,p_target,p_root,p_amount,p_date,'effect');return;
 end if;
 if operations_private.cash_available(p_source,p_date)<p_amount then raise exception using errcode='23514',message='Not enough confirmed funds were available on this date';end if;
 if p_lots is not null and (jsonb_typeof(p_lots)<>'array' or jsonb_array_length(p_lots) not between 1 and 100) then raise exception using errcode='22023',message='Choose valid source allocations';end if;
 for lot in
  select p.lot_id,min(e.recorded_at) first_recorded from operations_cash_postings p join operations_cash_events e on e.id=p.lot_id
  where p.account_id=p_source and (p_lots is null or exists(select 1 from jsonb_array_elements(p_lots) v where (v->>'lot_id')::uuid=p.lot_id))
  group by p.lot_id order by min(e.event_date),min(e.recorded_at),p.lot_id
 loop
  available:=greatest(0,operations_private.cash_available(p_source,p_date,lot.lot_id));
  if p_lots is null then take:=least(remaining,available);
  else
   if (select count(*) from jsonb_array_elements(p_lots) v where v->>'lot_id'=lot.lot_id::text)<>1 then raise exception using errcode='22023',message='A source allocation must appear once';end if;
   select (v->>'amount')::numeric into take from jsonb_array_elements(p_lots) v where v->>'lot_id'=lot.lot_id::text;
   if take is null or take<=0 or scale(take)>2 or take>available or take>remaining then raise exception using errcode='23514',message='Source allocation exceeds confirmed available funds';end if;
   seen:=array_append(seen,lot.lot_id);specified:=specified+take;
  end if;
  if take>0 then insert into operations_cash_postings(event_id,account_id,lot_id,amount,operational_date,phase) values(p_event,p_source,lot.lot_id,-take,p_date,'effect'),(p_event,p_target,lot.lot_id,take,p_date,'effect');remaining:=remaining-take;end if;
 end loop;
 if remaining<>0 or (p_lots is not null and (cardinality(seen)<>jsonb_array_length(p_lots) or specified<>p_amount)) then raise exception using errcode='23514',message='The selected funding allocations do not cover this amount';end if;
end $$;

create function public.operations_cash_write(p_actor uuid,p_operation text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;actor_row profiles;person profiles;responsible manager_periods;source operations_cash_accounts;target operations_cash_accounts;old operations_cash_events;event operations_cash_events;r manager_write_receipts;
 business_name text:=p_payload->>'business';currency_name text:=coalesce(p_payload->>'currency','NGN');bucket_name text:=coalesce(p_payload->>'bucket','owner');d date;amount numeric;fp text;result jsonb;recipient jsonb:=p_payload->'recipient';
 new_event_id uuid:=gen_random_uuid();source_id uuid;target_id uuid;root uuid;parent uuid;period uuid;fund jsonb;kind text:=p_operation;reason text:=nullif(trim(p_payload->>'reason'),'');
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);saved_bridge text:=current_setting('operations.cash_transfer_bridge',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 c:=manager_context(p_actor,business_name,nullif(p_payload->>'manager_period_id','')::uuid);period:=(c->>'periodId')::uuid;
 select * into actor_row from profiles where id=p_actor and not suspended;
 if (select not enabled from operations_release_state) then raise exception using errcode='55000',message='Manager funds are not activated yet';end if;
 if c->>'status'<>'active' and actor_row.role<>'admin' then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 or p_request_id is null then raise exception using errcode='22023',message='Valid cash values and a retry identifier are required';end if;
 if p_operation not in ('fund','handoff','receive','correct','void') then raise exception using errcode='22023',message='Choose a cash operation';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array(p_operation,p_payload)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_request_id::text,0));
 select * into r from manager_write_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.business<>business_name or r.period_id is distinct from period or r.fingerprint<>fp then raise exception using errcode='23514',message='Retry identifier belongs to a different cash entry or period';end if;return r.result;end if;
 if currency_name!~'^[A-Z]{3}$' or bucket_name not in ('owner','sales') or length(coalesce(p_payload->>'notes',''))>2000 or length(coalesce(reason,''))>2000 then raise exception using errcode='22023',message='Check currency, funding source and notes';end if;
 perform pg_advisory_xact_lock(hashtextextended('operations-cash:'||business_name||':'||currency_name||':'||bucket_name,0));
 perform set_config('operations.actor',p_actor::text,true);perform set_config('operations.period',coalesce(period::text,''),true);
 if p_operation in ('correct','void') then
  if actor_row.role<>'admin' then raise exception using errcode='42501',message='Only Bimbo can correct cash history';end if;
  if p_payload->>'source_transfer_id' is not null then
   select e.* into old from operations_cash_events e where e.fund_transfer_id=(p_payload->>'source_transfer_id')::uuid and e.business=business_name and e.cash_kind='fund' and not exists(select 1 from operations_cash_events replacement where replacement.corrects_id=e.id) for update;
   select to_jsonb(t) into fund from farm_fund_transfers t where id=(p_payload->>'source_transfer_id')::uuid;
   if fund is null or fund->>'revision' is distinct from p_payload->>'expected_source_revision' then raise exception using errcode='40001',message='Transfer changed. Refresh before correcting';end if;
  else select * into old from operations_cash_events where id=(p_payload->>'id')::uuid and business=business_name for update;end if;
  if old.id is null then raise exception using errcode='P0002',message='Cash entry not found';end if;
  if old.operation='void' or exists(select 1 from operations_cash_events where corrects_id=old.id) or coalesce(p_payload->>'expected_revision','')<>'0' then raise exception using errcode='40001',message='Cash entry already changed. Refresh before correcting';end if;
  if reason is null then raise exception using errcode='22023',message='A correction reason is required';end if;
  currency_name:=old.currency;bucket_name:=old.bucket;kind:=old.cash_kind;source_id:=old.source_account_id;target_id:=old.target_account_id;period:=old.period_id;parent:=old.origin_event_id;
  d:=case when p_operation='void' then old.event_date else coalesce((p_payload->>'date')::date,old.event_date) end;
  amount:=case when p_operation='void' then 0 else coalesce((p_payload->>'amount')::numeric,old.amount) end;
  if kind not in ('fund','handoff','receive') then raise exception using errcode='22023',message='Correct the linked business record through its original workflow';end if;
 else
  d:=(p_payload->>'date')::date;amount:=(p_payload->>'amount')::numeric;
 end if;
 if d is null or d>(now() at time zone 'Africa/Lagos')::date or amount is null or amount<0 or (amount=0 and p_operation<>'void') or amount>9999999999999999.99 or scale(amount)>2 then raise exception using errcode='22023',message='Enter a positive exact amount and the actual date, no later than today';end if;
 if actor_row.role<>'admin' and c->>'mode'='personal' and d<(c->>'startsOn')::date then raise exception using errcode='42501',message='Receipt cannot predate your work start';end if;
 if business_name='farm' then perform farm_v2_lock_date(d,actor_row.role='admin',reason);end if;
 if p_operation='fund' then
  if actor_row.role<>'admin' then raise exception using errcode='42501',message='Only Bimbo can record owner funding';end if;
  if bucket_name<>'owner' or (business_name='farm' and currency_name<>'NGN') then raise exception using errcode='22023',message='Owner funding must use the business currency and owner-funds account';end if;
  source_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'outside','external','External owner funding');
  if recipient->>'type'='manager' then
   select * into responsible from manager_periods where id=(recipient->>'period_id')::uuid and business=business_name and ended_at is null;
   select * into person from profiles where id=responsible.manager_id and not suspended;
   if responsible.id is null or person.id is null or person.role<>(case business_name when 'farm' then 'manager' when 'property' then 'property_manager' else 'content_manager' end) then raise exception using errcode='42501',message='Choose an active manager in this business';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'awaiting',new_event_id::text,coalesce(person.name,'Manager')||' awaiting receipt',responsible.id);period:=responsible.id;
  elsif recipient->>'type'='custodian' then
   if length(trim(coalesce(recipient->>'name',''))) not between 1 and 150 or (p_payload->>'confirmed_receipt') is distinct from 'true' then raise exception using errcode='22023',message='Name the custodian and confirm their actual receipt';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'custodian',lower(trim(recipient->>'name')),trim(recipient->>'name'));
  elsif recipient->>'type'='ceo' then target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'ceo',p_actor::text,coalesce(actor_row.name,'CEO'));
  else raise exception using errcode='22023',message='Choose who received the money';end if;
  if business_name='farm' then
   perform set_config('operations.period','',true);
   perform set_config('operations.cash_transfer_bridge','1',true);
   fund:=farm_v2_write(p_actor,'fund','create',jsonb_build_object('date',d,'amount',amount,'notes',p_payload->>'notes'),null,null,md5(p_request_id::text||':owner-funding')::uuid);
   perform set_config('operations.cash_transfer_bridge',coalesce(saved_bridge,''),true);
   perform set_config('operations.period',coalesce(c->>'periodId',''),true);
  end if;root:=new_event_id;
 elsif p_operation='handoff' then
  select * into source from operations_cash_accounts where id=(p_payload->>'source_account_id')::uuid;
  if source.id is null or (source.business,source.currency,source.bucket) is distinct from (business_name,currency_name,bucket_name) or source.holder_type in ('awaiting','outside') then raise exception using errcode='42501',message='Choose a confirmed source in this business, currency and funding source';end if;
  source_id:=source.id;
  if actor_row.role<>'admin' then
   if source.holder_type<>'custodian' or (recipient is not null and (recipient->>'type'<>'manager' or (recipient->>'period_id')::uuid is distinct from (c->>'periodId')::uuid)) then raise exception using errcode='42501',message='A manager may acknowledge procurement money only into their own period';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'manager',c->>'periodId',coalesce(actor_row.name,'Manager'),(c->>'periodId')::uuid);
  else
   select * into responsible from manager_periods where id=(recipient->>'period_id')::uuid and business=business_name and ended_at is null;
   select * into person from profiles where id=responsible.manager_id and not suspended;
   if recipient->>'type'<>'manager' or responsible.id is null or person.id is null or person.role<>(case business_name when 'farm' then 'manager' when 'property' then 'property_manager' else 'content_manager' end) then raise exception using errcode='42501',message='Choose an active receiving manager';end if;
   target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'awaiting',new_event_id::text,coalesce(person.name,'Manager')||' awaiting receipt',responsible.id);period:=responsible.id;
  end if;
 elsif p_operation='receive' then
  select * into old from operations_cash_events where id=(p_payload->>'event_id')::uuid for update;
  select * into source from operations_cash_accounts where id=old.target_account_id;
  if source.id is null or source.holder_type<>'awaiting' or source.period_id is distinct from (c->>'periodId')::uuid or actor_row.role='admin' or (source.business,source.currency,source.bucket) is distinct from (business_name,currency_name,bucket_name) then raise exception using errcode='42501',message='Only the named manager can confirm their own receipt';end if;
  if d<old.event_date then raise exception using errcode='22023',message='Receipt cannot predate the recorded dispatch';end if;
  if exists(select 1 from operations_cash_events where corrects_id=old.id) then raise exception using errcode='40001',message='The dispatch changed. Refresh before confirming receipt';end if;
  source_id:=source.id;target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,'manager',c->>'periodId',coalesce(actor_row.name,'Manager'),(c->>'periodId')::uuid);parent:=old.id;
 end if;
 perform 1 from operations_cash_accounts where id in (source_id,target_id) order by id for update;
 insert into operations_cash_events(id,business,currency,bucket,operation,cash_kind,amount,event_date,source_account_id,target_account_id,period_id,actor_id,notes,reason,origin_event_id,corrects_id,fund_transfer_id)
 values(new_event_id,business_name,currency_name,bucket_name,p_operation,kind,amount,d,source_id,target_id,period,p_actor,p_payload->>'notes',reason,parent,case when p_operation in ('correct','void') then old.id end,coalesce((fund->>'id')::uuid,case when p_operation in ('correct','void') then old.fund_transfer_id end)) returning * into event;
 if p_operation in ('correct','void') then
  insert into operations_cash_postings(event_id,account_id,lot_id,amount,operational_date,phase) select new_event_id,account_id,lot_id,-p.amount,p.operational_date,'reversal' from operations_cash_postings p where p.event_id=old.id and p.phase='effect';
  if old.fund_transfer_id is not null then
   select to_jsonb(t) into fund from farm_fund_transfers t where id=old.fund_transfer_id;
   perform set_config('operations.cash_transfer_bridge','1',true);
   perform farm_v2_write(p_actor,'fund',case p_operation when 'void' then 'void' else 'update' end,jsonb_build_object('date',d,'amount',amount,'expected_revision',(fund->>'revision')::integer)||(case when p_payload ? 'notes' then jsonb_build_object('notes',p_payload->'notes') else '{}'::jsonb end),old.fund_transfer_id,reason,md5(p_request_id::text||':fund-correction')::uuid);
   perform set_config('operations.cash_transfer_bridge',coalesce(saved_bridge,''),true);
  end if;
  if kind='fund' then select lot_id into root from operations_cash_postings where event_id=old.id and phase='effect' limit 1;end if;
 end if;
 if amount>0 then perform operations_private.cash_move(event.id,source_id,target_id,amount,d,root,p_payload->'allocations');end if;
 -- Validate now as well as at commit, so API callers get a definite conflict.
 if exists(select 1 from operations_cash_postings p join operations_cash_accounts a on a.id=p.account_id where p.event_id=event.id and a.holder_type<>'outside' and (operations_private.cash_available(a.id,p.operational_date)<0 or operations_private.cash_available(a.id,p.operational_date,p.lot_id)<0)) then raise exception using errcode='23514',message='These funds are already spent or committed on a later date. Resolve the downstream records before correcting';end if;
 select * into target from operations_cash_accounts where id=target_id;
 result:=jsonb_build_object('status',case when target.holder_type='awaiting' and p_operation not in ('void') then 'awaiting_receipt' else 'posted' end,'id',event.id,'currency',currency_name,'amount',amount::text,'data',to_jsonb(event)||jsonb_build_object('amount',amount::text));
 if event.fund_transfer_id is not null then select to_jsonb(t) into fund from farm_fund_transfers t where id=event.fund_transfer_id;result:=result||jsonb_build_object('source_record',fund);end if;
 insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,p_request_id,business_name,(c->>'periodId')::uuid,fp,result);
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);
 return result;
end $$;
-- Keep the existing transfer correction API atomic with its linked custody history.
alter function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_cash_transfer_guard;
revoke all on function farm_v2_write_before_cash_transfer_guard(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare outcome jsonb;
begin
 if p_kind='fund' and p_operation in ('update','void') and current_setting('operations.cash_transfer_bridge',true) is distinct from '1'
 and exists(select 1 from operations_cash_events where fund_transfer_id=p_id) then
  outcome:=operations_cash_write(p_actor,case p_operation when 'update' then 'correct' else 'void' end,
   jsonb_build_object('business','farm','currency','NGN','source_transfer_id',p_id,'expected_source_revision',p_payload->'expected_revision','expected_revision',0,'date',p_payload->'date','amount',p_payload->'amount','reason',p_reason)
   ||(case when p_payload ? 'notes' then jsonb_build_object('notes',p_payload->'notes') else '{}'::jsonb end)
   ||(case when p_payload ? 'manager_period_id' then jsonb_build_object('manager_period_id',p_payload->'manager_period_id') else '{}'::jsonb end),p_request_id);
  return outcome->'source_record';
 end if;
 return farm_v2_write_before_cash_transfer_guard(p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);
end $$;
revoke all on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
create function public.operations_cash_summary(p_actor uuid,p_business text,p_period_id uuid default null,p_from date default null,p_to date default null,p_page integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;first_date date:=coalesce(p_from,(now() at time zone 'Africa/Lagos')::date);last_date date:=coalesce(p_to,(now() at time zone 'Africa/Lagos')::date);accounts jsonb;sources jsonb;receipts jsonb;history jsonb;total bigint;
begin
 c:=manager_context(p_actor,p_business,p_period_id);
 if c->>'status'<>'active' and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 if first_date>last_date or p_page<0 or p_limit not between 1 and 500 then raise exception using errcode='22023',message='Choose valid dates and a history page';end if;
 with visible as(select * from operations_cash_accounts a where business=p_business and holder_type<>'outside' and (c->>'mode'='admin_all' or (a.period_id=(c->>'periodId')::uuid and holder_type in ('manager','awaiting'))))
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object(
  'opening',operations_private.cash_balance(a.id,first_date-1)::text,'closing',operations_private.cash_balance(a.id,last_date)::text,
  'receipts',coalesce((select sum(greatest(p.amount,0)) from operations_cash_postings p where p.account_id=a.id and p.operational_date between first_date and last_date),0)::text,
  'outgoing',coalesce((select sum(greatest(-p.amount,0)) from operations_cash_postings p where p.account_id=a.id and p.operational_date between first_date and last_date),0)::text,
  'paid_spending',coalesce((select sum(-p.amount) from operations_cash_postings p join operations_cash_events e on e.id=p.event_id where p.account_id=a.id and e.cash_kind='spend' and p.operational_date between first_date and last_date),0)::text
  ,'paid_spending_total',coalesce((select sum(-p.amount) from operations_cash_postings p join operations_cash_events e on e.id=p.event_id where p.account_id=a.id and e.cash_kind='spend' and p.operational_date<=last_date),0)::text
  ,'funds_received',coalesce((select sum(p.amount) from operations_cash_postings p join operations_cash_events e on e.id=p.event_id where p.account_id=a.id and e.target_account_id=a.id and e.cash_kind in ('fund','handoff','receive') and p.operational_date between first_date and last_date),0)::text
  ,'funds_received_total',coalesce((select sum(p.amount) from operations_cash_postings p join operations_cash_events e on e.id=p.event_id where p.account_id=a.id and e.target_account_id=a.id and e.cash_kind in ('fund','handoff','receive') and p.operational_date<=last_date),0)::text
 ) order by a.currency,a.bucket,a.holder_type,a.name,a.id),'[]'::jsonb) into accounts from visible a;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'currency',a.currency,'bucket',a.bucket,'holder_type',a.holder_type,
  'available',operations_private.cash_available(a.id,last_date)::text) order by a.currency,a.bucket,a.name,a.id),'[]'::jsonb) into sources
 from operations_cash_accounts a where a.business=p_business and (a.holder_type='custodian' or (exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) and a.holder_type in ('ceo','manager')));
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('amount',e.amount::text,'remaining',operations_private.cash_balance(a.id,(now() at time zone 'Africa/Lagos')::date)::text,'recipient_name',a.name,'source_name',s.name) order by e.event_date,e.recorded_at,e.id),'[]'::jsonb) into receipts
 from operations_cash_events e join operations_cash_accounts a on a.id=e.target_account_id join operations_cash_accounts s on s.id=e.source_account_id
 where e.business=p_business and a.holder_type='awaiting' and (c->>'mode'='admin_all' or a.period_id=(c->>'periodId')::uuid)
 and e.operation<>'void' and not exists(select 1 from operations_cash_events replacement where replacement.corrects_id=e.id)
 and operations_private.cash_balance(a.id,(now() at time zone 'Africa/Lagos')::date)>0;
 with visible as(select e.*,source.name source_name,target.name target_name from operations_cash_events e join operations_cash_accounts source on source.id=e.source_account_id join operations_cash_accounts target on target.id=e.target_account_id
 where e.business=p_business and e.event_date between first_date and last_date and (c->>'mode'='admin_all' or e.period_id=(c->>'periodId')::uuid or source.period_id=(c->>'periodId')::uuid or target.period_id=(c->>'periodId')::uuid)),
 page as(select * from visible order by recorded_at desc,id desc limit p_limit offset p_page*p_limit)
 select coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('amount',t.amount::text)) from page t),'[]'::jsonb),(select count(*) from visible) into history,total;
 return jsonb_build_object('business',p_business,'periodId',c->'periodId','from',first_date,'to',last_date,'accounts',accounts,'sources',sources,'receipts',receipts,'history',history,'total',total,'has_more',total>(p_page+1)*p_limit);
end $$;
revoke all on function operations_cash_write(uuid,text,jsonb,uuid),operations_cash_summary(uuid,text,uuid,date,date,integer,integer) from public,anon,authenticated;
grant execute on function operations_cash_write(uuid,text,jsonb,uuid),operations_cash_summary(uuid,text,uuid,date,date,integer,integer) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
