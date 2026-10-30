-- Preconditions: named batches, private evidence and the existing guarded cash/stock writers.
-- Nullable batch links preserve historical unknown membership; no backfill/repricing.
-- Shared stock/provisioning locks and deferred invariants preserve atomic corrections.
-- Retain batch links and ledger on rollback after use. Production release remains separate.
begin;
set local lock_timeout='5s';
alter table farm_sales add column batch_id uuid references farm_batches(id);
alter table farm_inventory_transactions add column batch_id uuid references farm_batches(id);
create function operations_private.batch_transaction() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare b farm_batches;
begin
 if tg_when='BEFORE' then
  if new.correction_role='reversal' then select batch_id into new.batch_id from farm_inventory_transactions where id=new.correction_of;
  else new.batch_id:=nullif(current_setting('farm.batch_id',true),'')::uuid;end if;
  if new.batch_id is not null then
   select * into b from farm_batches where id=new.batch_id;
   if b.id is null or b.product<>new.product or b.stock_group_id is distinct from new.stock_group_id then raise exception using errcode='23514',message='Batch must match the animal classification';end if;
  end if;
 elsif new.batch_id is not null then
  insert into farm_batch_movements(batch_id,quantity,date,actor_id,operation_id,kind,transaction_id,reason)
  values(new.batch_id,case when new.action='add' then new.quantity else -new.quantity end,new.date,new.created_by,new.id,'inventory',new.id,coalesce(nullif(new.reason,''),'Recorded batch stock movement'));
 end if;
 return new;
end $$;
create trigger ly_batch_reference before insert on farm_inventory_transactions for each row execute function operations_private.batch_transaction();
create trigger zzz_batch_movement after insert on farm_inventory_transactions for each row execute function operations_private.batch_transaction();
-- Keep authorization at both payload and stored-row boundaries.
do $$ declare definition text;signature text;needle text;replacement text;begin
 foreach signature in array array['operations_private.prepare_target(uuid,text,text,uuid,jsonb,uuid)','operations_private.guard_record()'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if position('''stock_id'',''inventory_id'']' in definition)=0 then raise exception 'Scoped reference precondition changed';end if;
  definition:=replace(definition,'''stock_id'',''inventory_id'']','''stock_id'',''inventory_id'',''batch_id'',''site_id'']');
  definition:=replace(definition,'when ''inventory_id'' then ''farm_inventory'' end','when ''inventory_id'' then ''farm_inventory'' when ''batch_id'' then ''farm_batches'' when ''site_id'' then ''farm_sites'' end');
  if signature like '%prepare_target%' then
   needle:='perform operations_private.require_record(p_actor,resource_name,ref.val::uuid,p_period);';
   replacement:='if ref.key=''stock_group_id'' and row_value->>''batch_id'' is not null and exists(select 1 from farm_batches where id=(row_value->>''batch_id'')::uuid and stock_group_id=ref.val::uuid) then perform operations_private.require_record(p_actor,''farm_batches'',(row_value->>''batch_id'')::uuid,p_period);else '||needle||'end if;';
  else
   needle:='perform operations_private.require_record(actor,target,reference.val::uuid,selected);';
   replacement:='if reference.key=''stock_group_id'' and value->>''batch_id'' is not null and exists(select 1 from farm_batches where id=(value->>''batch_id'')::uuid and stock_group_id=reference.val::uuid) then perform operations_private.require_record(actor,''farm_batches'',(value->>''batch_id'')::uuid,selected);else '||needle||'end if;';
  end if;
  if position(needle in definition)=0 then raise exception 'Reference authorization precondition changed';end if;
  execute replace(definition,needle,replacement);
 end loop;
 definition:=pg_get_functiondef('farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 needle:='revision=v_sale.revision where id=p_id';
 if position(needle in definition)=0 then raise exception 'Sale persistence precondition changed';end if;
 execute replace(definition,needle,'revision=v_sale.revision,batch_id=v_sale.batch_id where id=p_id');
end $$;
-- This inner extension retains the outer cash and responsibility wrappers, including arrays.
alter function farm_v2_write_before_manager_periods(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_batch_stock;
revoke all on function farm_v2_write_before_batch_stock(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_v2_write_before_manager_periods(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb:=p_payload;prior jsonb;result jsonb;b farm_batches;bid uuid;saved text:=current_setting('farm.batch_id',true);movement farm_inventory_transactions;
begin
 if p_kind not in ('sale','inventory_transaction') or jsonb_typeof(v)<>'object' then return farm_v2_write_before_batch_stock(p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);end if;
 -- New-version receipts were fingerprinted by the unchanged outer responsibility guard.
 if p_request_id is not null then
  select r.result into result from farm_write_receipts r where actor_id=p_actor and request_id=p_request_id;
  if result ? 'batch_id' then return result;end if;
 end if;
 if p_id is not null then
  if p_kind='sale' then select to_jsonb(s) into prior from farm_sales s where id=p_id;else select to_jsonb(t) into prior from farm_inventory_transactions t where id=p_id;end if;
 end if;
 bid:=case when v?'batch_id' then (v->>'batch_id')::uuid else (prior->>'batch_id')::uuid end;
 if bid is not null then
  if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then perform operations_private.require_record(p_actor,'farm_batches',bid,nullif(current_setting('operations.period',true),'')::uuid);end if;
  select * into b from farm_batches where id=bid;
  if b.archived_at is not null and p_operation='create' then raise exception using errcode='23514',message='This batch is archived';end if;
  if b.product<>coalesce(v->>'product',prior->>'product') then raise exception using errcode='22023',message='Choose a batch for the selected animal';end if;
  if p_kind='sale' and prior is not null and prior->>'pricing_basis' is null then raise exception using errcode='23514',message='Historical sale batch membership cannot be inferred';end if;
  if v?'stock_group_id' and (v->>'stock_group_id')::uuid is distinct from b.stock_group_id then raise exception using errcode='22023',message='Classification differs from the selected batch';end if;
  v:=v||jsonb_build_object('batch_id',bid,'stock_group_id',b.stock_group_id);
 end if;
 perform set_config('farm.batch_id',coalesce(bid::text,''),true);
 result:=farm_v2_write_before_batch_stock(p_actor,p_kind,p_operation,v,p_id,p_reason,p_request_id);
 if p_kind='sale' and p_operation='update' and (prior->>'batch_id')::uuid is distinct from bid then
  for movement in select t.* from farm_inventory_transactions t where t.sale_id=p_id and t.action='sale' and t.correction_role is distinct from 'reversal' and t.batch_id is distinct from bid and not exists(select 1 from farm_inventory_transactions r where r.correction_of=t.id and r.correction_role='reversal') loop
   insert into farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,correction_of,correction_role,reason) values(movement.product,'add',movement.quantity,(result->>'date')::date,p_actor,p_id,movement.id,'reversal',p_reason);
   insert into farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,correction_of,correction_role,reason) values(result->>'product','sale',movement.quantity,(result->>'date')::date,p_actor,p_id,movement.id,'replacement',p_reason);
  end loop;
 end if;
 perform set_config('farm.batch_id',coalesce(saved,''),true);
 return result;
end $$;
revoke all on function farm_v2_write_before_manager_periods(uuid,text,text,jsonb,uuid,text,uuid),operations_private.batch_transaction() from public,anon,authenticated,service_role;
create function operations_private.attach_farm_evidence(p_actor uuid,p_resource text,p_record uuid,p_ids jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare source jsonb;r record;photo farm_evidence;photo_id text;responsible uuid;selected uuid:=nullif(current_setting('operations.period',true),'')::uuid;
begin
 if p_ids is null or p_ids='[]'::jsonb then return;end if;
 if jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids)>6 then raise exception using errcode='22023',message='Choose up to six uploaded photos';end if;
 select * into r from operations_private.resources() where resource=p_resource and business='farm';
 if r.resource is null then raise exception using errcode='42501',message='Unsupported photo target';end if;
 perform operations_private.require_record(p_actor,p_resource,p_record,selected);
 execute format('select to_jsonb(t) from %I t where id=$1',p_resource) into source using p_record;
 select period_id into responsible from manager_record_links where resource=p_resource and record_id=p_record;
 for photo_id in select jsonb_array_elements_text(p_ids) loop
  select * into photo from farm_evidence where id=photo_id::uuid for update;
  if photo.id is null or photo.status<>'uploaded' or photo.target_resource<>p_resource or photo.period_id is distinct from responsible or photo.batch_id is distinct from (source->>'batch_id')::uuid or photo.activity_date is distinct from (source->>r.date_column)::date or (photo.actor_id<>p_actor and not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended)) then
   raise exception using errcode='23514',message='Photo must be uploaded for this record, date, batch and responsibility period';
  end if;
  if photo.record_id is not null and photo.record_id<>p_record then raise exception using errcode='23514',message='This photo already supports another record';end if;
  update farm_evidence set record_id=p_record,linked_at=coalesce(linked_at,now()) where id=photo.id;
 end loop;
end $$;
alter function farm_v2_write_before_manager_periods(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_mortality_evidence;
revoke all on function farm_v2_write_before_mortality_evidence(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_v2_write_before_manager_periods(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if p_kind='inventory_transaction' and p_operation='create' and p_payload->>'action'='mortality' and (jsonb_typeof(p_payload->'evidence_ids') is distinct from 'array' or jsonb_array_length(p_payload->'evidence_ids')=0) then
  raise exception using errcode='23514',message='Add a photo before sending a new mortality record. Saved offline photos are retained until uploaded.';
 end if;
 result:=farm_v2_write_before_mortality_evidence(p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);
 if p_kind='inventory_transaction' and jsonb_typeof(p_payload)='object' and p_payload?'evidence_ids' and coalesce(current_setting('farm.batch_record_evidence',true),'')<>'deferred' then
  perform operations_private.attach_farm_evidence(p_actor,'farm_inventory_transactions',(result->>'id')::uuid,p_payload->'evidence_ids');
 end if;
 return result;
end $$;
revoke all on function farm_v2_write_before_manager_periods(uuid,text,text,jsonb,uuid,text,uuid),operations_private.attach_farm_evidence(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
create table public.farm_batch_records (
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references farm_batches(id),
 date date not null,period_id uuid references manager_periods(id),actor_id uuid not null references profiles(id),
 feed_kg numeric check(feed_kg between 0 and 1000000),deaths integer check(deaths between 0 and 2147483647),
 eggs integer check(eggs between 0 and 2147483647),sample_weight_kg numeric check(sample_weight_kg>0 and sample_weight_kg<=1000000),
 sample_count integer check(sample_count between 1 and 1000000),notes text check(length(notes)<=4000),
 daily_feed_id uuid references farm_daily_feed(id),feed_bags numeric check(feed_bags>0 and feed_bags<=1000000),mortality_id uuid references farm_inventory_transactions(id),
 supersedes_id uuid unique references farm_batch_records(id),reason text,created_at timestamptz not null default now(),
 check((sample_weight_kg is null)=(sample_count is null)),check((coalesce(deaths,0)>0)=(mortality_id is not null)),check((daily_feed_id is null)=(feed_bags is null)),
 check(feed_kg is not null or deaths is not null or eggs is not null or sample_weight_kg is not null or daily_feed_id is not null or coalesce(length(trim(notes)),0)>0)
);
create index batch_daily_lookup on farm_batch_records(batch_id,date,period_id);
alter function operations_private.resources() rename to resources_before_batch_records;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_batch_records() union all values('farm_batch_records','farm','date','actor_id',false)
$$;
alter table farm_batch_records enable row level security;
revoke all on farm_batch_records from public,anon,authenticated,service_role;
grant select on farm_batch_records to authenticated,service_role;
create policy batch_record_role_read on farm_batch_records for select to authenticated using(true);
create policy batch_record_scope_read on farm_batch_records as restrictive for select to authenticated using(manager_can_read_record('farm_batch_records',to_jsonb(farm_batch_records.*)));
create trigger manager_record_guard before insert on farm_batch_records for each row execute function operations_private.guard_record();
create trigger manager_record_attribution after insert on farm_batch_records for each row execute function operations_private.tag_record();
create trigger batch_record_immutable before update or delete on farm_batch_records for each row execute function farm_activity_immutable();
create function operations_private.check_batch_feed_allocation() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (select coalesce(sum(r.feed_bags),0) from farm_batch_records r where r.daily_feed_id=new.id and not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id))>new.num_bags
 or exists(select 1 from farm_batch_records r where r.daily_feed_id=new.id and r.date<>new.date and not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id)) then
  raise exception using errcode='23514',message='Correct the linked batch allocations before changing this feeding quantity or date';
 end if;return new;
end $$;
create constraint trigger batch_feed_allocation after update on farm_daily_feed deferrable initially deferred for each row execute function operations_private.check_batch_feed_allocation();
revoke all on function operations_private.check_batch_feed_allocation() from public,anon,authenticated,service_role;
create function operations_private.check_batch_mortality() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from farm_batch_records r join farm_inventory_transactions m on m.id=r.mortality_id
  where not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id)
  and (m.action<>'mortality' or m.quantity is distinct from r.deaths or m.date<>r.date or m.batch_id is distinct from r.batch_id
   or exists(select 1 from farm_inventory_transactions reversal where reversal.correction_of=m.id and reversal.correction_role='reversal'))) then
  raise exception using errcode='23514',message='Correct this mortality through its linked daily batch record so stock and the report stay together';
 end if;return new;
end $$;
create constraint trigger batch_mortality_consistency after insert on farm_inventory_transactions deferrable initially deferred for each row execute function operations_private.check_batch_mortality();
revoke all on function operations_private.check_batch_mortality() from public,anon,authenticated,service_role;
create function public.farm_batch_record_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;prior farm_batch_records;b farm_batches;result jsonb;fp text;admin boolean;target_period uuid;d date;death_count integer;movement farm_inventory_transactions;mid uuid;feed_id uuid;source_period uuid;reason text:=nullif(trim(p_payload->>'reason'),'');
begin
 select coalesce(role='admin' and not suspended,false) into admin from profiles where id=p_actor;
 if p_operation not in ('submit','correct') or p_request is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='Choose a valid record operation and retry identifier';end if;
 if p_operation='correct' then
  if not coalesce(admin,false) then raise exception using errcode='42501',message='Ask Bimbo to correct a sent record';end if;
  select * into prior from farm_batch_records where id=p_id;
  if prior.id is null or reason is null then raise exception using errcode='22023',message='Choose the original record and explain the correction';end if;
  target_period:=prior.period_id;
 end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('batch_record',p_operation,p_payload,p_id)::text,'UTF8')),'hex');
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp,target_period);
 select r.result into result from farm_batch_receipts r where actor_id=p_actor and request_id=p_request;if found then return result;end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if prior.id is not null and exists(select 1 from farm_batch_records where supersedes_id=prior.id) then raise exception using errcode='40001',message='This record already has a correction. Refresh its latest version';end if;
 select * into b from farm_batches where id=(p_payload->>'batch_id')::uuid;
 if b.id is null or (b.archived_at is not null and p_operation='submit') then raise exception using errcode='22023',message='Choose an active batch';end if;
 if not coalesce(admin,false) then perform operations_private.require_record(p_actor,'farm_batches',b.id,(c->>'periodId')::uuid);end if;
 d:=(p_payload->>'date')::date;if d is null then raise exception using errcode='22023',message='Choose the activity date';end if;
 if exists(select 1 from farm_batch_records r where r.batch_id=b.id and r.date=d and r.period_id is not distinct from (c->>'periodId')::uuid and r.id is distinct from prior.id and not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id)) then
  raise exception using errcode='40001',message='This batch already has a current record for that date and manager. Refresh before continuing';
 end if;
 if prior.id is not null then perform farm_v2_lock_date(prior.date,true,reason);end if;
 perform farm_v2_lock_date(d,coalesce(admin,false),reason);
 if p_payload->>'eggs' is not null and (b.product not in ('chicken','turkey') or exists(select 1 from farm_livestock_groups where id=b.stock_group_id and (sex='male' or chicken_type='broiler'))) then raise exception using errcode='22023',message='Egg counts are only available for laying poultry';end if;
 death_count:=(p_payload->>'deaths')::integer;mid:=(p_payload->>'mortality_id')::uuid;feed_id:=(p_payload->>'daily_feed_id')::uuid;
 if prior.mortality_id is not null and (prior.deaths is distinct from death_count or prior.date<>d or prior.batch_id<>b.id) then
  if coalesce(death_count,0)>0 then
   result:=farm_v2_write(p_actor,'inventory_transaction','update',jsonb_build_object('quantity',death_count,'date',d,'batch_id',b.id),prior.mortality_id,reason,md5(p_request::text||':mortality')::uuid);mid:=(result->>'id')::uuid;
  else
   select * into movement from farm_inventory_transactions where id=prior.mortality_id;
   if exists(select 1 from farm_inventory_transactions where correction_of=movement.id and correction_role='reversal') then raise exception using errcode='40001',message='Mortality was already corrected';end if;
   insert into farm_inventory_transactions(product,action,quantity,date,created_by,reason,correction_of,correction_role) values(movement.product,'add',movement.quantity,d,p_actor,reason,movement.id,'reversal');mid:=null;
  end if;
 elsif coalesce(death_count,0)>0 and mid is null then
  if prior.mortality_id is not null then mid:=prior.mortality_id;
  else
   -- The report owns its photos; attach them after both records exist in this transaction.
   perform set_config('farm.batch_record_evidence','deferred',true);
   result:=farm_v2_write(p_actor,'inventory_transaction','create',jsonb_build_object('product',b.product,'action','mortality','quantity',death_count,'date',d,'batch_id',b.id,'evidence_ids',p_payload->'evidence_ids'),null,reason,md5(p_request::text||':mortality')::uuid);mid:=(result->>'id')::uuid;
   perform set_config('farm.batch_record_evidence','',true);
  end if;
 end if;
 if mid is not null then
  select * into movement from farm_inventory_transactions where id=mid;
  select period_id into source_period from manager_record_links where resource='farm_inventory_transactions' and record_id=mid;
  if movement.id is null or movement.action<>'mortality' or movement.batch_id is distinct from b.id or movement.date<>d or movement.quantity is distinct from death_count or source_period is distinct from (c->>'periodId')::uuid or exists(select 1 from farm_inventory_transactions where correction_of=mid and correction_role='reversal') then raise exception using errcode='23514',message='Link the actual mortality record for this batch, date and manager';end if;
 end if;
 if feed_id is not null then
  perform operations_private.require_record(p_actor,'farm_daily_feed',feed_id,(c->>'periodId')::uuid);
  if not exists(select 1 from farm_daily_feed where id=feed_id and date=d) then raise exception using errcode='23514',message='Link feeding recorded on the same activity date';end if;
  select period_id into source_period from manager_record_links where resource='farm_daily_feed' and record_id=feed_id;
  if source_period is distinct from (c->>'periodId')::uuid then raise exception using errcode='42501',message='Use feeding recorded in this responsibility period';end if;
  if (p_payload->>'feed_bags')::numeric+(select coalesce(sum(r.feed_bags),0) from farm_batch_records r where r.daily_feed_id=feed_id and r.id is distinct from prior.id and not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id))>(select num_bags from farm_daily_feed where id=feed_id) then raise exception using errcode='23514',message='Batch allocations exceed the recorded feeding quantity';end if;
 end if;
 insert into farm_batch_records(batch_id,date,period_id,actor_id,feed_kg,deaths,eggs,sample_weight_kg,sample_count,notes,daily_feed_id,feed_bags,mortality_id,supersedes_id,reason)
 values(b.id,d,(c->>'periodId')::uuid,p_actor,(p_payload->>'feed_kg')::numeric,death_count,(p_payload->>'eggs')::integer,(p_payload->>'sample_weight_kg')::numeric,(p_payload->>'sample_count')::integer,p_payload->>'notes',feed_id,(p_payload->>'feed_bags')::numeric,mid,prior.id,reason) returning to_jsonb(farm_batch_records.*) into result;
 perform operations_private.attach_farm_evidence(p_actor,'farm_batch_records',(result->>'id')::uuid,p_payload->'evidence_ids');
 insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason,record_date) values('batch_record',(result->>'id')::uuid,p_operation,p_actor,case when prior.id is null then null else to_jsonb(prior) end,result,reason,d);
 insert into farm_batch_receipts(actor_id,request_id,result) values(p_actor,p_request,result);
 return result;
end $$;
revoke all on function farm_batch_record_write(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function farm_batch_record_write(uuid,text,jsonb,uuid,uuid) to service_role;
revoke all on function operations_private.resources_before_batch_records(),operations_private.resources() from public,anon,authenticated,service_role;
create table public.farm_record_messages (
 id uuid primary key default gen_random_uuid(),resource text not null,record_id uuid not null,
 actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 kind text not null check(kind in ('question','reply','comment')),body text not null check(length(trim(body)) between 1 and 2000),
 reply_to uuid references farm_record_messages(id),created_at timestamptz not null default now(),
 check((kind='reply')=(reply_to is not null))
);
create index farm_record_thread on farm_record_messages(resource,record_id,created_at,id);
alter table farm_record_messages enable row level security;
revoke all on farm_record_messages from public,anon,authenticated,service_role;
grant select on farm_record_messages to service_role;
create trigger farm_message_immutable before update or delete on farm_record_messages for each row execute function farm_activity_immutable();
create function operations_private.farm_thread_source(p_actor uuid,p_resource text,p_record uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r record;source jsonb;owner_period uuid;c jsonb;
begin
 c:=manager_context(p_actor,'farm');
 if p_resource not in ('farm_sales','farm_expenses','farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_feed_purchases','farm_daily_feed','farm_batch_records','farm_purchase_requests','farm_health_tasks') then raise exception using errcode='42501',message='Unsupported discussion target';end if;
 select * into r from operations_private.resources() where resource=p_resource and business='farm';
 if r.resource is null then raise exception using errcode='42501',message='This record type is not available';end if;
 execute format('select to_jsonb(t) from %I t where id=$1',p_resource) into source using p_record;
 if source is null then raise exception using errcode='P0002',message='Record not found';end if;
 select period_id into owner_period from manager_record_links where resource=p_resource and record_id=p_record;
 if c->>'mode'<>'admin_all' and not coalesce((owner_period is not null and owner_period=(c->>'periodId')::uuid) or (owner_period is null and c->>'mode'='legacy' and (source->>r.actor_column)::uuid=p_actor),false) then
  raise exception using errcode='42501',message='Only the responsible manager and Bimbo can discuss this record';
 end if;
 return jsonb_build_object('period_id',owner_period,'record',source);
end $$;
create function public.farm_record_evidence_read(p_actor uuid,p_resource text,p_record uuid,p_period uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare source jsonb;
begin
 source:=operations_private.farm_thread_source(p_actor,p_resource,p_record);
 if p_period is not null and (source->>'period_id')::uuid is distinct from p_period then raise exception using errcode='42501',message='This record belongs to another responsibility period';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'created_at',created_at) order by created_at,id),'[]') from farm_evidence where target_resource=p_resource and record_id=p_record and status='uploaded');
end $$;
revoke all on function farm_record_evidence_read(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function farm_record_evidence_read(uuid,text,uuid,uuid) to service_role;
create function public.farm_record_messages_read(p_actor uuid,p_resource text,p_record uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform operations_private.farm_thread_source(p_actor,p_resource,p_record);
 return (select coalesce(jsonb_agg(to_jsonb(m) order by created_at,id),'[]') from farm_record_messages m where resource=p_resource and record_id=p_record);
end $$;
create function public.farm_record_message_write(p_actor uuid,p_payload jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare source jsonb;c jsonb;result jsonb;fp text;receipt manager_write_receipts;resource_name text:=p_payload->>'resource';target uuid:=(p_payload->>'record_id')::uuid;parent uuid:=(p_payload->>'reply_to')::uuid;
begin
 if p_request is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='A message retry identifier is required';end if;
 source:=operations_private.farm_thread_source(p_actor,resource_name,target);
 fp:=encode(sha256(convert_to(jsonb_build_array('record_message',p_payload)::text,'UTF8')),'hex');
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp,(source->>'period_id')::uuid);
 select * into receipt from manager_write_receipts where actor_id=p_actor and request_id=p_request;
 if found then if receipt.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to a different message';end if;return receipt.result;end if;
 if parent is not null and not exists(select 1 from farm_record_messages where id=parent and resource=resource_name and record_id=target) then raise exception using errcode='22023',message='Reply to a message in this record';end if;
 insert into farm_record_messages(resource,record_id,actor_id,period_id,kind,body,reply_to)
 values(resource_name,target,p_actor,(c->>'periodId')::uuid,p_payload->>'kind',trim(p_payload->>'body'),parent) returning to_jsonb(farm_record_messages.*) into result;
 insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,p_request,'farm',(c->>'periodId')::uuid,fp,result);
 return result;
end $$;
revoke all on function operations_private.farm_thread_source(uuid,text,uuid),farm_record_messages_read(uuid,text,uuid),farm_record_message_write(uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function farm_record_messages_read(uuid,text,uuid),farm_record_message_write(uuid,jsonb,uuid) to service_role;
create function public.farm_today_read(p_actor uuid,p_period uuid default null,p_date date default (now() at time zone 'Africa/Lagos')::date)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;batches jsonb;records jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);
 if p_date is null then raise exception using errcode='22023',message='Choose an activity date';end if;
 if c->>'status'='awaiting_handover' and not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception using errcode='42501',message='Complete your inventory handover first';end if;
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('site_name',s.name,'quantity_exact',coalesce((select sum(quantity) from farm_batch_movements where batch_id=b.id),0)::text,'chicken_type',g.chicken_type,'sex',g.sex) order by s.name,b.name,b.id),'[]') into batches
 from farm_batches b join farm_sites s on s.id=b.site_id left join farm_livestock_groups g on g.id=b.stock_group_id
 where b.archived_at is null and operations_private.record_visible(p_actor,'farm_batches',to_jsonb(b),p_period);
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('batch_name',b.name) order by r.created_at,r.id),'[]') into records
 from farm_batch_records r join farm_batches b on b.id=r.batch_id where r.date=p_date
 and not exists(select 1 from farm_batch_records newer where newer.supersedes_id=r.id)
 and operations_private.record_visible(p_actor,'farm_batch_records',to_jsonb(r),p_period);
 return jsonb_build_object('batches',batches,'records',records,'as_of',now());
end $$;
revoke all on function farm_today_read(uuid,uuid,date) from public,anon,authenticated;
grant execute on function farm_today_read(uuid,uuid,date) to service_role;
commit;
