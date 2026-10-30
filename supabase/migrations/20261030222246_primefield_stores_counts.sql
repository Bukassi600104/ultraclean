-- Preconditions: named batches/daily records, private proof, purchase delivery links.
-- No historical eggs, costs, bag weights or physical counts are reconstructed.
-- Original bag/supply balances keep their meaning. New counts are immutable proposals.
-- Brief DDL locks; shared dated-write locks and fingerprints guard count decisions.
-- Retain new ledgers/links on rollback after use; do not rebuild old stock.
begin;
set local lock_timeout='5s';
create table farm_egg_movements(
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references farm_batches(id),date date not null,
 quantity integer not null check(quantity<>0),kind text not null check(kind in ('collection','sale','loss','return','adjustment','reversal')),
 actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 source_record_id uuid references farm_batch_records(id),sale_id uuid references farm_sales(id),reversal_of uuid unique references farm_egg_movements(id),corrects_id uuid references farm_egg_movements(id),
 reason text,created_at timestamptz not null default now(),unique(source_record_id,kind)
);
create table farm_egg_record_links(record_id uuid primary key references farm_batch_records(id));
create index farm_egg_batch_date on farm_egg_movements(batch_id,date);
create unique index farm_egg_current_sale on farm_egg_movements(sale_id) where kind='sale' and sale_id is not null;
create table farm_stock_counts(
 id uuid primary key default gen_random_uuid(),date date not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 resource text not null check(resource in ('feed','supply','eggs')),asset_id uuid not null,quantity numeric not null check(quantity>=0 and quantity<=100000000),
 unit text not null,open_kg numeric check(open_kg>=0 and open_kg<=100000000),system_quantity numeric,system_revision integer,fingerprint text not null,
 notes text,created_at timestamptz not null default now()
);
create table farm_stock_count_decisions(
 id uuid primary key default gen_random_uuid(),count_id uuid not null unique references farm_stock_counts(id),decision text not null check(decision in ('approve','decline')),
 actor_id uuid not null references profiles(id),reason text not null check(length(trim(reason)) between 1 and 2000),
 adjustment_resource text,adjustment_id uuid,created_at timestamptz not null default now()
);
create table farm_store_settings(
 id uuid primary key default gen_random_uuid(),resource text not null check(resource in ('feed','eggs')),stock_id uuid not null,date date not null,
 kg_per_bag numeric check(kg_per_bag>0 and kg_per_bag<=1000),egg_pack_size integer check(egg_pack_size>0 and egg_pack_size<=10000),
 actor_id uuid not null references profiles(id),reason text not null,created_at timestamptz not null default now(),
 check((resource='feed' and kg_per_bag is not null and egg_pack_size is null) or (resource='eggs' and egg_pack_size is not null and kg_per_bag is null))
);
alter table farm_stock_counts add column bag_weight_setting_id uuid references farm_store_settings(id);
create table farm_store_receipts(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,primary key(actor_id,request_id));
alter function operations_private.resources() rename to resources_before_stores;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_stores() union all values('farm_egg_movements','farm','date','actor_id',false),('farm_stock_counts','farm','date','actor_id',false)
$$;
do $$ declare t text;begin
 foreach t in array array['farm_egg_movements','farm_stock_counts','farm_stock_count_decisions','farm_store_settings','farm_store_receipts','farm_egg_record_links'] loop
  execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated,service_role',t);execute format('grant select on %I to service_role',t);
  execute format('create trigger store_facts_immutable before update or delete on %I for each row execute function farm_activity_immutable()',t);
  if t in ('farm_egg_movements','farm_stock_counts') then
   execute format('create trigger manager_record_guard before insert on %I for each row execute function operations_private.guard_record()',t);
   execute format('create trigger manager_record_attribution after insert on %I for each row execute function operations_private.tag_record()',t);
  end if;
 end loop;
end $$;
alter table farm_evidence drop constraint farm_evidence_target_resource_check;
alter table farm_evidence add constraint farm_evidence_target_resource_check check(target_resource in ('farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks','farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions','farm_stock_counts','farm_egg_movements'));
create function operations_private.check_eggs() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from (select sum(sum(quantity)) over(order by date) balance from farm_egg_movements where batch_id=new.batch_id group by date) t where balance<0) then raise exception using errcode='23514',message='Egg movement exceeds recorded available eggs on its actual date';end if;
 return new;
end $$;
create constraint trigger egg_balance_consistency after insert on farm_egg_movements deferrable initially deferred for each row execute function operations_private.check_eggs();
create function operations_private.collect_batch_eggs() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare previous farm_egg_movements;
begin
 if new.supersedes_id is not null and not exists(select 1 from farm_egg_record_links where record_id=new.supersedes_id) then return new;end if;
 insert into farm_egg_record_links values(new.id);
 if new.supersedes_id is not null then
  select * into previous from farm_egg_movements where source_record_id=new.supersedes_id and kind='collection';
  -- A correction of an older, unlinked report must not invent an opening egg balance.
  if previous.id is not null then
  insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,reversal_of,reason)
  values(previous.batch_id,previous.date,-previous.quantity,'reversal',new.actor_id,new.period_id,previous.id,new.reason);
  end if;
 end if;
 if coalesce(new.eggs,0)>0 then
  insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,source_record_id,reason)
  values(new.batch_id,new.date,new.eggs,'collection',new.actor_id,new.period_id,new.id,'Recorded egg collection');
 end if;
 return new;
end $$;
create trigger collect_batch_eggs after insert on farm_batch_records for each row execute function operations_private.collect_batch_eggs();
alter table farm_sales add column egg_batch_id uuid references farm_batches(id);
-- Egg units use their own stock ledger; never deduct animals or unrelated custom stock.
do $$ declare d text;needle text;begin
 d:=pg_get_functiondef('farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 needle:='revision=v_sale.revision,batch_id=v_sale.batch_id where id=p_id';
 if position(needle in d)=0 then raise exception 'Sale persistence precondition changed';end if;
 d:=replace(d,needle,'revision=v_sale.revision,batch_id=v_sale.batch_id,egg_batch_id=v_sale.egg_batch_id where id=p_id');
 needle:='if v_sale.product in (''catfish'',''goat'',''chicken'',''pig'',''turkey'',''cattle'') or exists(select 1 from public.farm_inventory where product=v_sale.product) then';
 if position(needle in d)=0 then raise exception 'Custom sale stock precondition changed';end if;
 d:=replace(d,needle,'if v_sale.egg_batch_id is null and (v_sale.product in (''catfish'',''goat'',''chicken'',''pig'',''turkey'',''cattle'') or exists(select 1 from public.farm_inventory where product=v_sale.product)) then');
 execute d;
end $$;
-- Signed replacement movements preserve every original sale/stock effect.
create function operations_private.egg_sale_stock() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare previous farm_egg_movements;responsible uuid;actor uuid;effective_quantity integer;source_sale uuid;
begin
 if new.egg_batch_id is null and (tg_op='INSERT' or old.egg_batch_id is null) then return new;end if;
 actor:=nullif(current_setting('operations.actor',true),'')::uuid;responsible:=nullif(current_setting('operations.period',true),'')::uuid;
 if new.egg_batch_id is not null then
  if new.product<>'other' or new.pricing_basis<>'per_unit' or new.batch_id is not null or new.quantity<>trunc(new.quantity) or not exists(select 1 from farm_batches where id=new.egg_batch_id and product in ('chicken','turkey') and (archived_at is null or (tg_op='UPDATE' and new.egg_batch_id=old.egg_batch_id))) then raise exception using errcode='23514',message='Egg sales require whole eggs from a poultry batch, priced per egg';end if;
  perform operations_private.require_record(actor,'farm_batches',new.egg_batch_id,responsible);
 end if;
 if tg_op='UPDATE' and (new.egg_batch_id,new.quantity,new.date,new.voided_at) is not distinct from (old.egg_batch_id,old.quantity,old.date,old.voided_at) then return new;end if;
 if tg_op='UPDATE' then
  if old.egg_batch_id is not null and new.egg_batch_id is null then raise exception using errcode='23514',message='A saved egg sale must retain its egg stock link';end if;
  if exists(select 1 from farm_egg_movements where sale_id=new.id and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id)) and (new.egg_batch_id is distinct from old.egg_batch_id or new.quantity<(select sum(quantity) from farm_egg_movements where sale_id=new.id and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id)) or new.date>(select min(date) from farm_egg_movements where sale_id=new.id and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id))) then raise exception using errcode='23514',message='Retain the batch, quantity and dates needed by recorded egg returns';end if;
  if old.egg_batch_id is null and new.egg_batch_id is not null then raise exception using errcode='23514',message='Do not infer egg movements for an earlier unlinked sale';end if;
  for previous in select * from farm_egg_movements m where m.sale_id=new.id and (m.quantity<0 or (new.voided_at is not null and m.kind='return')) and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=m.id) loop
   insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,reversal_of,reason) values(previous.batch_id,previous.date,-previous.quantity,'reversal',actor,responsible,previous.id,'Audited egg sale correction');
  end loop;
 end if;
 if new.egg_batch_id is not null and new.voided_at is null then
  insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,sale_id,reason) values(new.egg_batch_id,new.date,-new.quantity,case when tg_op='INSERT' then 'sale' else 'adjustment' end,actor,responsible,new.id,'Recorded egg sale');
 end if;
 return new;
end $$;
create trigger egg_sale_stock after insert or update on farm_sales for each row execute function operations_private.egg_sale_stock();
create function operations_private.store_snapshot(p_actor uuid,p_resource text,p_id uuid,p_period uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare resource_name text;v jsonb;fp text;current_qty numeric;
begin
 resource_name:=case p_resource when 'feed' then 'farm_feed_stock' when 'supply' then 'farm_supply_inventory' when 'eggs' then 'farm_batches' end;
 if resource_name is null then raise exception using errcode='22023',message='Unknown store';end if;
 perform operations_private.require_record(p_actor,resource_name,p_id,p_period);
 execute format('select to_jsonb(t) from %I t where id=$1',resource_name) into v using p_id;
 if v is null or v->>'archived_at' is not null then raise exception using errcode='23514',message='Choose an active stock item';end if;
 if p_resource='eggs' then
  if v->>'product' not in ('chicken','turkey') then raise exception using errcode='22023',message='Egg stores belong to poultry batches';end if;
  select coalesce(sum(quantity),0),md5(coalesce(string_agg(id::text||':'||quantity::text,',' order by id),'')) into current_qty,fp from farm_egg_movements where batch_id=p_id;
  return jsonb_build_object('quantity',current_qty,'unit','eggs','fingerprint',fp,'label',v->>'name','latest_date',(select max(date) from farm_egg_movements where batch_id=p_id));
 elsif p_resource='feed' then
  select md5(v::text||coalesce(string_agg(to_jsonb(f)::text,',' order by f.id),'')) into fp from farm_daily_feed f where f.feed_type=v->>'feed_type' and f.feed_source=v->>'feed_source';
  select md5(fp||coalesce(string_agg(d.count_id::text,',' order by d.count_id),'')) into fp from farm_stock_count_decisions d join farm_stock_counts n on n.id=d.count_id where n.resource='feed' and n.asset_id=p_id and d.decision='approve';
  return jsonb_build_object('quantity',v->'current_bags','unit','bags','revision',v->'revision','fingerprint',fp,'latest_date',greatest((select max(movement_date) from farm_feed_stock_movements where stock_id=p_id),(select max(date) from farm_daily_feed where feed_type=v->>'feed_type' and feed_source=v->>'feed_source')),'label',(v->>'feed_type')||' ('||(v->>'feed_source')||')');
 else return jsonb_build_object('quantity',v->'current_quantity','unit',v->>'unit','revision',v->'revision','fingerprint',md5(v::text),'label',v->>'item_name','latest_date',(select max(date) from farm_supply_transactions where item_id=p_id));end if;
end $$;
alter table farm_feed_stock_movements add column count_id uuid unique references farm_stock_counts(id);
create function operations_private.link_feed_count() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.count_id:=nullif(current_setting('farm.count_id',true),'')::uuid;return new;end $$;
create trigger link_feed_count before insert on farm_feed_stock_movements for each row execute function operations_private.link_feed_count();
revoke all on function operations_private.link_feed_count() from public,anon,authenticated,service_role;
create function public.farm_store_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;r farm_store_receipts;result jsonb;snapshot jsonb;observed farm_stock_counts;decision farm_stock_count_decisions;
 is_admin boolean;d date;quantity_value numeric;delta numeric;movement jsonb;before_value jsonb;resource_name text;previous farm_egg_movements;
begin
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='Dated store details and retry identifier required';end if;
 fp:=md5(jsonb_build_array('store',p_operation,p_payload,p_id)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 is_admin:=exists(select 1 from profiles where id=p_actor and role='admin' and not suspended);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select * into r from farm_store_receipts where actor_id=p_actor and request_id=p_request;
 if found then if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another store entry';end if;return r.result;end if;
 if p_operation='count' then
  d:=(p_payload->>'date')::date;perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
  snapshot:=operations_private.store_snapshot(p_actor,p_payload->>'resource',(p_payload->>'stock_id')::uuid,(c->>'periodId')::uuid);
  if d>(now() at time zone 'Africa/Lagos')::date or d<(snapshot->>'latest_date')::date then raise exception using errcode='23514',message='Record a physical count on its actual date, after the latest stock activity';end if;
  if p_payload->>'resource'='feed' and snapshot->>'quantity' is null then raise exception using errcode='23514',message='Use Feed Inventory to record the first bag count and confirm earlier deliveries before requesting a count adjustment';end if;
  if p_payload->>'unit' is distinct from snapshot->>'unit' then raise exception using errcode='23514',message='Use the existing store unit';end if;
  quantity_value:=(p_payload->>'quantity')::numeric;
  if p_payload->>'resource' in ('feed','eggs') and quantity_value<>trunc(quantity_value) then raise exception using errcode='22023',message='Count whole bags or whole eggs';end if;
  if p_payload->>'resource'<>'feed' and p_payload->>'open_kg' is not null then raise exception using errcode='22023',message='Open feed kilograms apply only to feed';end if;
  insert into farm_stock_counts(date,actor_id,period_id,resource,asset_id,quantity,unit,open_kg,system_quantity,system_revision,fingerprint,notes,bag_weight_setting_id)
  values(d,p_actor,(c->>'periodId')::uuid,p_payload->>'resource',(p_payload->>'stock_id')::uuid,quantity_value,p_payload->>'unit',(p_payload->>'open_kg')::numeric,(snapshot->>'quantity')::numeric,(snapshot->>'revision')::integer,snapshot->>'fingerprint',p_payload->>'notes',(select id from farm_store_settings where resource='feed' and p_payload->>'resource'='feed' and stock_id=(p_payload->>'stock_id')::uuid and date<=d order by date desc,created_at desc,id desc limit 1)) returning * into observed;
  perform operations_private.attach_farm_evidence(p_actor,'farm_stock_counts',observed.id,p_payload->'evidence_ids');result:=to_jsonb(observed);
 elsif p_operation='decide_count' then
  if not is_admin then raise exception using errcode='42501',message='Only Bimbo approves stock discrepancies';end if;
  if p_payload->>'decision' is null or p_payload->>'decision' not in ('approve','decline') or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Choose a decision and explain it';end if;
  select * into observed from farm_stock_counts where id=p_id for update;
  if observed.id is null then raise exception using errcode='P0002',message='Count not found';end if;
  if exists(select 1 from farm_stock_count_decisions where count_id=p_id) then raise exception using errcode='40001',message='This count has already been reviewed';end if;
  if p_payload->>'decision'='approve' then
   snapshot:=operations_private.store_snapshot(p_actor,observed.resource,observed.asset_id,observed.period_id);
   if snapshot->>'fingerprint'<>observed.fingerprint then raise exception using errcode='40001',message='Stock changed after this count. Keep this observation and request a fresh physical count';end if;
   perform set_config('operations.period',coalesce(observed.period_id::text,''),true);
   perform farm_v2_lock_date(observed.date,true,p_payload->>'reason');
   perform set_config('farm.count_id',observed.id::text,true);
   delta:=observed.quantity-coalesce(observed.system_quantity,0);
   if delta<>0 then
    if observed.resource='eggs' then
     insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,reason) values(observed.asset_id,observed.date,delta::integer,'adjustment',p_actor,observed.period_id,p_payload->>'reason') returning to_jsonb(farm_egg_movements.*) into movement;resource_name:='farm_egg_movements';
    elsif observed.resource='supply' then
     movement:=farm_v2_write(p_actor,'supply_transaction','create',jsonb_build_object('date',observed.date,'item_id',observed.asset_id,'action','adjustment','quantity_change',delta),null,p_payload->>'reason',md5(p_request::text||':count')::uuid);resource_name:='farm_supply_transactions';
    else
     movement:=farm_feed_stock_write(p_actor,'adjust',jsonb_build_object('date',observed.date,'bags_delta',delta,'expected_revision',observed.system_revision),observed.asset_id,p_payload->>'reason',md5(p_request::text||':count')::uuid);resource_name:='farm_feed_stock_movements';
    end if;
   end if;
  end if;
  if resource_name='farm_feed_stock_movements' then select jsonb_build_object('id',id) into movement from farm_feed_stock_movements where count_id=observed.id;end if;
  perform set_config('farm.count_id','',true);
  insert into farm_stock_count_decisions(count_id,decision,actor_id,reason,adjustment_resource,adjustment_id) values(observed.id,p_payload->>'decision',p_actor,p_payload->>'reason',resource_name,coalesce((movement->'movement'->>'id')::uuid,(movement->>'id')::uuid)) returning * into decision;
  result:=to_jsonb(decision);
 elsif p_operation='correct_egg' then
  if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can correct a saved egg movement with a reason';end if;
  select * into previous from farm_egg_movements where id=p_id for update;
  if previous.id is null or previous.kind not in ('loss','return') then raise exception using errcode='23514',message='Correct collections through their batch record and sales through their sale';end if;
  if exists(select 1 from farm_egg_movements where reversal_of=previous.id) then raise exception using errcode='40001',message='This egg movement was already corrected';end if;
  before_value:=to_jsonb(previous);perform set_config('operations.period',coalesce(previous.period_id::text,''),true);
  d:=coalesce((p_payload->>'date')::date,previous.date);quantity_value:=(p_payload->>'quantity')::numeric;
  if quantity_value is null or quantity_value<0 or quantity_value>100000000 or quantity_value<>trunc(quantity_value) then raise exception using errcode='22023',message='Enter the corrected whole egg count, or zero to reverse the entry';end if;
  perform farm_v2_lock_date(previous.date,true,p_payload->>'reason');perform farm_v2_lock_date(d,true,p_payload->>'reason');
  insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,reversal_of,reason) values(previous.batch_id,previous.date,-previous.quantity,'reversal',p_actor,previous.period_id,previous.id,p_payload->>'reason') returning to_jsonb(farm_egg_movements.*) into result;
  if quantity_value>0 then
   if previous.kind='return' and not exists(select 1 from farm_sales where id=previous.sale_id and voided_at is null and date<=d and quantity>=quantity_value+coalesce((select sum(quantity) from farm_egg_movements where sale_id=previous.sale_id and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id)),0)) then raise exception using errcode='23514',message='Corrected return must fit the active sale and its date';end if;
   insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,sale_id,corrects_id,reason) values(previous.batch_id,d,case previous.kind when 'loss' then -quantity_value else quantity_value end,previous.kind,p_actor,previous.period_id,previous.sale_id,previous.id,p_payload->>'reason') returning to_jsonb(farm_egg_movements.*) into result;
  end if;
 elsif p_operation in ('egg_loss','egg_return') then
  d:=(p_payload->>'date')::date;perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
  snapshot:=operations_private.store_snapshot(p_actor,'eggs',(p_payload->>'batch_id')::uuid,(c->>'periodId')::uuid);
  quantity_value:=(p_payload->>'quantity')::numeric;
  if quantity_value is null or quantity_value<=0 or quantity_value>100000000 or quantity_value<>trunc(quantity_value) or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Enter a whole egg count and explain this movement';end if;
  if p_operation='egg_loss' and p_payload->>'sale_id' is not null then raise exception using errcode='22023',message='A loss is not a customer return';end if;
  if p_operation='egg_return' then
   perform operations_private.require_record(p_actor,'farm_sales',(p_payload->>'sale_id')::uuid,(c->>'periodId')::uuid);
   if not exists(select 1 from farm_sales where id=(p_payload->>'sale_id')::uuid and egg_batch_id=(p_payload->>'batch_id')::uuid and voided_at is null and date<=d and quantity>=quantity_value+coalesce((select sum(quantity) from farm_egg_movements where sale_id=(p_payload->>'sale_id')::uuid and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id)),0)) then raise exception using errcode='23514',message='Returned eggs cannot exceed the linked sale';end if;
  end if;
  insert into farm_egg_movements(batch_id,date,quantity,kind,actor_id,period_id,sale_id,reason) values((p_payload->>'batch_id')::uuid,d,(case when p_operation='egg_loss' then -quantity_value else quantity_value end)::integer,case p_operation when 'egg_loss' then 'loss' else 'return' end,p_actor,(c->>'periodId')::uuid,(p_payload->>'sale_id')::uuid,p_payload->>'reason') returning to_jsonb(farm_egg_movements.*) into result;
  perform operations_private.attach_farm_evidence(p_actor,'farm_egg_movements',(result->>'id')::uuid,p_payload->'evidence_ids');
 elsif p_operation='settings' then
  if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can record genuine unit configuration with a reason';end if;
  perform operations_private.store_snapshot(p_actor,p_payload->>'resource',(p_payload->>'stock_id')::uuid,null);
  insert into farm_store_settings(resource,stock_id,date,kg_per_bag,egg_pack_size,actor_id,reason) values(p_payload->>'resource',(p_payload->>'stock_id')::uuid,(p_payload->>'date')::date,(p_payload->>'kg_per_bag')::numeric,(p_payload->>'egg_pack_size')::integer,p_actor,p_payload->>'reason') returning to_jsonb(farm_store_settings.*) into result;
 else raise exception using errcode='22023',message='Unknown store operation';end if;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('store',(result->>'id')::uuid,p_operation,p_actor,before_value,result,p_payload->>'reason');
 insert into farm_store_receipts values(p_actor,p_request,fp,result);
 return result;
end $$;
create function operations_private.feed_coverage(p_stock uuid,p_date date) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s farm_feed_stock;n farm_stock_counts;settings farm_store_settings;decision_time timestamptz;usable numeric;consumed numeric;days integer;reason text;
begin
 select * into s from farm_feed_stock where id=p_stock;
 select c.* into n from farm_stock_counts c join farm_stock_count_decisions d on d.count_id=c.id where c.resource='feed' and c.asset_id=p_stock and d.decision='approve' and c.date<=p_date order by c.date desc,d.created_at desc limit 1;
 -- The count row and decision timestamp are distinct facts.
 if n.id is not null then select created_at into decision_time from farm_stock_count_decisions where count_id=n.id;end if;
 if n.bag_weight_setting_id is not null then select * into settings from farm_store_settings where id=n.bag_weight_setting_id;
 else select * into settings from farm_store_settings where resource='feed' and stock_id=p_stock and date<=coalesce(n.date,p_date) order by created_at,id limit 1;end if;
 if s.current_bags is null then reason:='Record the physical starting bag count';
 elsif n.id is null or n.open_kg is null then reason:='Count unopened bags and weigh the feed remaining in open bags';
 elsif settings.kg_per_bag is null then reason:='Record the genuine kilograms per bag';
 elsif exists(select 1 from farm_store_settings where resource='feed' and stock_id=p_stock and created_at>=settings.created_at and id<>settings.id and date<=p_date and kg_per_bag<>settings.kg_per_bag) then reason:='Bag weight changed; record a new physical count';
 elsif exists(select 1 from farm_feed_stock_movements where stock_id=p_stock and movement_type<>'use' and created_at>decision_time and movement_date<=n.date) or exists(select 1 from farm_daily_feed where feed_type=s.feed_type and feed_source=s.feed_source and created_at>decision_time and date<=n.date) or exists(select 1 from farm_activity a join farm_daily_feed f on f.id=a.record_id where a.record_type='daily_feed' and a.operation='update' and a.happened_at>decision_time and f.feed_type=s.feed_type and f.feed_source=s.feed_source) then reason:='Backdated feed activity changed the count basis; record a fresh physical count';
 else
  select n.quantity*settings.kg_per_bag+n.open_kg+coalesce(sum(bags_delta) filter(where movement_type in ('receipt','adjust')),0)*settings.kg_per_bag into usable from farm_feed_stock_movements where stock_id=p_stock and movement_date>n.date and movement_date<=p_date;
  select usable-coalesce(sum(num_bags),0)*settings.kg_per_bag into usable from farm_daily_feed where feed_type=s.feed_type and feed_source=s.feed_source and date>n.date and date<=p_date;
  select coalesce(sum(num_bags),0)*settings.kg_per_bag,count(distinct date) into consumed,days from farm_daily_feed where feed_type=s.feed_type and feed_source=s.feed_source and date between p_date-7 and p_date-1;
  if usable<0 then reason:='Recorded consumption exceeds the last verified usable stock; recount';usable:=null;
  elsif usable<s.current_bags*settings.kg_per_bag then reason:='Recorded feeding and unopened bags do not reconcile; check bag openings or recount';usable:=null;
  elsif days<7 then reason:='Seven complete days of recorded consumption are needed';
  elsif consumed<=0 then reason:='No positive comparable consumption is recorded';end if;
 end if;
 return jsonb_build_object('days_left',case when reason is null then round(usable/(consumed/7),1)::text end,'usable_kg',usable::text,'window_from',p_date-7,'window_to',p_date-1,'recorded_days',days,'kg_per_bag',settings.kg_per_bag::text,'reason',reason,'basis','Verified usable feed and seven completed days of actual feeding; opening bags is not consumption');
end $$;
create function operations_private.store_unit_cost(p_resource text,p_stock uuid,p_date date) returns numeric
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare movement record;units numeric:=0;value numeric:=0;price numeric;known boolean:=true;
begin
 for movement in
  select m.id,m.bags_delta::numeric qty,m.movement_date date,m.created_at,'farm_feed_activities' link_resource,m.feed_activity_id link_id from farm_feed_stock_movements m where p_resource='feed' and m.stock_id=p_stock and m.movement_date<=p_date
  union all select m.id,m.quantity_change,m.date,m.created_at,'farm_supply_transactions',m.id from farm_supply_transactions m where p_resource='supply' and m.item_id=p_stock and m.date<=p_date
  order by date,created_at,id
 loop
  if movement.qty>0 then
   select l.unit_price into price from farm_purchase_deliveries d join farm_purchase_lines l on l.id=d.line_id join farm_purchases o on o.id=d.purchase_id
    where d.movement_resource=movement.link_resource and d.movement_id=movement.link_id and (select coalesce(sum(amount),0) from farm_purchase_payments where purchase_id=o.id and voided_at is null and date<=p_date)>=o.total;
   if price is null then known:=false;else value:=value+price*movement.qty;end if;
  elsif units>0 and known then value:=value+movement.qty*(value/units);end if;
  units:=units+movement.qty;
  if units=0 then value:=0;known:=true;elsif units<0 then return null;end if;
 end loop;
 if units<=0 or not known then return null;end if;
 -- Unlinked legacy opening quantities are deliberately not assigned a price.
 if p_resource='supply' and units is distinct from (select current_quantity from farm_supply_inventory where id=p_stock) then return null;end if;
 return value/units;
end $$;
create function public.farm_store_read(p_actor uuid,p_period uuid default null,p_date date default current_date) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;assets jsonb;counts jsonb;movements jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);
 select coalesce(jsonb_agg(value order by value->>'resource',value->>'label'),'[]') into assets from (
  select operations_private.store_snapshot(p_actor,'feed',s.id,(c->>'periodId')::uuid)||jsonb_build_object('id',s.id,'resource','feed','coverage',operations_private.feed_coverage(s.id,p_date),'unit_cost_estimate',case when exists(select 1 from profiles where id=p_actor and role='admin') then round(operations_private.store_unit_cost('feed',s.id,p_date),2)::text end) value from farm_feed_stock s where operations_private.record_visible(p_actor,'farm_feed_stock',to_jsonb(s),(c->>'periodId')::uuid)
  union all select operations_private.store_snapshot(p_actor,'supply',s.id,(c->>'periodId')::uuid)||jsonb_build_object('id',s.id,'resource','supply','unit_cost_estimate',case when exists(select 1 from profiles where id=p_actor and role='admin') then round(operations_private.store_unit_cost('supply',s.id,p_date),2)::text end) from farm_supply_inventory s where s.archived_at is null and operations_private.record_visible(p_actor,'farm_supply_inventory',to_jsonb(s),(c->>'periodId')::uuid)
  union all select operations_private.store_snapshot(p_actor,'eggs',b.id,(c->>'periodId')::uuid)||jsonb_build_object('id',b.id,'resource','eggs','opening_verified',exists(select 1 from farm_stock_counts n join farm_stock_count_decisions d on d.count_id=n.id where n.resource='eggs' and n.asset_id=b.id and d.decision='approve'),'pack_size',(select egg_pack_size from farm_store_settings where resource='eggs' and stock_id=b.id and date<=p_date order by date desc,created_at desc limit 1)) from farm_batches b where b.product in ('chicken','turkey') and b.archived_at is null and operations_private.record_visible(p_actor,'farm_batches',to_jsonb(b),(c->>'periodId')::uuid)
 ) t;
 select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('decision',(select to_jsonb(d) from farm_stock_count_decisions d where d.count_id=n.id),'actor_name',(select name from profiles where id=n.actor_id),'label',case n.resource when 'eggs' then (select name from farm_batches where id=n.asset_id) when 'supply' then (select item_name from farm_supply_inventory where id=n.asset_id) else (select feed_type||' ('||feed_source||')' from farm_feed_stock where id=n.asset_id) end,'estimated_loss_cost',case when exists(select 1 from profiles where id=p_actor and role='admin') and n.resource in ('feed','supply') and n.quantity<n.system_quantity then round((n.system_quantity-n.quantity)*operations_private.store_unit_cost(n.resource,n.asset_id,n.date),2)::text end) order by n.created_at desc),'[]') into counts
 from farm_stock_counts n where operations_private.record_visible(p_actor,'farm_stock_counts',to_jsonb(n),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('reversed',exists(select 1 from farm_egg_movements undo where undo.reversal_of=m.id),'actor_name',(select name from profiles where id=m.actor_id)) order by m.date desc,m.created_at desc),'[]') into movements from farm_egg_movements m where operations_private.record_visible(p_actor,'farm_egg_movements',to_jsonb(m),(c->>'periodId')::uuid);
 return jsonb_build_object('assets',assets,'counts',counts,'egg_movements',movements,'egg_sales',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'batch_id',s.egg_batch_id,'date',s.date,'customer',s.customer_name,'quantity',s.quantity,'returned',coalesce((select sum(quantity) from farm_egg_movements where sale_id=s.id and kind='return' and not exists(select 1 from farm_egg_movements undo where undo.reversal_of=farm_egg_movements.id)),0))),'[]') from farm_sales s where s.egg_batch_id is not null and s.voided_at is null and operations_private.record_visible(p_actor,'farm_sales',to_jsonb(s),(c->>'periodId')::uuid)),'cost_basis','Estimated moving weighted-average cost of confirmed, fully paid receipts. Unknown opening costs remain unavailable; these estimates do not create expenditure.');
end $$;
do $$ declare d text;begin
 d:=pg_get_functiondef('operations_private.farm_thread_source(uuid,text,uuid)'::regprocedure);
 if position('''farm_batch_records''' in d)=0 then raise exception 'Discussion precondition changed';end if;
 execute replace(d,'''farm_batch_records''','''farm_batch_records'',''farm_stock_counts'',''farm_egg_movements''');
end $$;
revoke all on function operations_private.resources(),operations_private.resources_before_stores(),operations_private.check_eggs(),operations_private.collect_batch_eggs(),operations_private.egg_sale_stock(),operations_private.store_snapshot(uuid,text,uuid,uuid),operations_private.feed_coverage(uuid,date),operations_private.store_unit_cost(text,uuid,date) from public,anon,authenticated,service_role;
revoke all on function farm_store_write(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function farm_store_write(uuid,text,jsonb,uuid,uuid) to service_role;
revoke all on function farm_store_read(uuid,uuid,date) from public,anon,authenticated;
grant execute on function farm_store_read(uuid,uuid,date) to service_role;
commit;
