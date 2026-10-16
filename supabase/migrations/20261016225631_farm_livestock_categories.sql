-- Preconditions: deployed V2 write boundary and aggregate inventory trigger. Forward only.
-- No historical rows, accounts, prices or stock quantities are updated/backfilled.
-- Nullable links mean unclassified. Existing aggregate minus classified balances is legacy stock.
-- DDL takes brief locks; rehearse and pause farm writes during coordinated release.
-- Rollback must retain group guards/ledger after classified activity; do not replay old migrations.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create table public.farm_livestock_groups (
 id uuid primary key default gen_random_uuid(), product text not null, chicken_type text not null default '',
 growth_stage text not null, sex text not null default 'unknown', created_at timestamptz not null default now(),
 unique(product,chicken_type,growth_stage,sex)
);
create function public.farm_livestock_valid(p text,c text,s text,g text) returns boolean language sql immutable as $$
 select coalesce(g in ('male','female','unknown') and (case p
 when 'catfish' then c='' and g='unknown' and s in ('fingerlings','juvenile')
 when 'goat' then c='' and s in ('weaner','adolescent','adult')
 when 'pig' then c='' and s in ('weaner','grower','adult')
 when 'turkey' then c='' and s in ('poult','grower','juvenile','finisher')
 when 'cattle' then c='' and s in ('calf','weaner','stocker_feeder','fattening','finished_adult')
 when 'chicken' then (c='broiler' and s in ('chick','two_weeks_old')) or (c='layer' and s in ('chick','point_of_lay','layers'))
 else false end),false)
$$;
alter table public.farm_livestock_groups add constraint livestock_classification_valid check(public.farm_livestock_valid(product,chicken_type,growth_stage,sex));
alter table public.farm_inventory_transactions add column stock_group_id uuid references public.farm_livestock_groups(id);
alter table public.farm_sales add column stock_group_id uuid references public.farm_livestock_groups(id);
create table public.farm_livestock_events (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.farm_livestock_groups(id),
 quantity_change numeric not null check(quantity_change<>0), transaction_id uuid unique references public.farm_inventory_transactions(id),
 actor_id uuid not null references public.profiles(id), event_date date not null, operation text not null,
 reason text, operation_id uuid not null default gen_random_uuid(), happened_at timestamptz not null default now()
);
create index livestock_events_group on public.farm_livestock_events(group_id);
alter table public.farm_livestock_groups enable row level security;
alter table public.farm_livestock_events enable row level security;
revoke all on public.farm_livestock_groups,public.farm_livestock_events from public,anon,authenticated,service_role;
grant select on public.farm_livestock_groups,public.farm_livestock_events to service_role;

create function public.farm_livestock_resolve(p text,v jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 if jsonb_typeof(v)<>'object' or not public.farm_livestock_valid(p,coalesce(v->>'chicken_type',''),v->>'growth_stage',coalesce(v->>'sex','unknown')) then raise exception using errcode='22023',message='Select a valid animal type, growth stage and sex'; end if;
 insert into farm_livestock_groups(product,chicken_type,growth_stage,sex) values(p,coalesce(v->>'chicken_type',''),v->>'growth_stage',coalesce(v->>'sex','unknown')) on conflict(product,chicken_type,growth_stage,sex) do update set product=excluded.product returning id into result;
 return result;
end $$;

create function public.farm_livestock_check(p text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare total numeric; classified numeric;
begin
 select current_stock into total from farm_inventory where product=p for update;
 select coalesce(sum(e.quantity_change),0) into classified from farm_livestock_events e join farm_livestock_groups g on g.id=e.group_id where g.product=p;
 if exists(select 1 from farm_livestock_events e join farm_livestock_groups g on g.id=e.group_id where g.product=p group by e.group_id having sum(e.quantity_change)<0) then raise exception using errcode='23514',message='Selected category has insufficient stock. Choose the correct category or request a correction.'; end if;
 if classified>coalesce(total,0) then raise exception using errcode='23514',message='Unclassified stock is insufficient. Select the correct stock category.'; end if;
end $$;

create function public.farm_livestock_movement() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare group_id uuid; context text; delta numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if tg_when='BEFORE' then
  context:=coalesce(current_setting('farm.livestock_group',true),'');
  if new.correction_role='reversal' then select t.stock_group_id into group_id from farm_inventory_transactions t where t.id=new.correction_of;
  elsif context<>'' then group_id:=case when context='unclassified' then null else context::uuid end;
  elsif new.correction_of is not null then select t.stock_group_id into group_id from farm_inventory_transactions t where t.id=new.correction_of and t.product=new.product;
  elsif new.sale_id is not null then select s.stock_group_id into group_id from farm_sales s where s.id=new.sale_id and s.product=new.product;
  end if;
  if group_id is not null and not exists(select 1 from farm_livestock_groups g where g.id=group_id and g.product=new.product) then raise exception using errcode='22023',message='Stock category does not match this animal'; end if;
  if group_id is not null and new.quantity<>trunc(new.quantity) then raise exception using errcode='22023',message='Animal quantities must be whole numbers'; end if;
  new.stock_group_id:=group_id;return new;
 end if;
 if new.stock_group_id is not null then
  delta:=case when new.action='add' then new.quantity else -new.quantity end;
  insert into farm_livestock_events(group_id,quantity_change,transaction_id,actor_id,event_date,operation,reason) values(new.stock_group_id,delta,new.id,new.created_by,new.date,new.action,new.reason);
 end if;
 return new;
end $$;
create trigger livestock_classify before insert on public.farm_inventory_transactions for each row execute function public.farm_livestock_movement();
-- Sort after existing on_inventory_transaction so its unchanged aggregate trigger runs first.
create trigger zz_livestock_balance after insert on public.farm_inventory_transactions for each row execute function public.farm_livestock_movement();
-- Validate the final transaction, not an intermediate reversal before its replacement.
create function public.farm_livestock_validate_movement() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.farm_livestock_check(new.product);return new;end $$;
create constraint trigger livestock_final_balance after insert on public.farm_inventory_transactions deferrable initially deferred for each row execute function public.farm_livestock_validate_movement();

-- Preserve the audited core source; the public signature remains compatible, including batches/requests.
alter function public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_pre_livestock;
revoke all on function public.farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_variable
declare v jsonb:=coalesce(p_payload,'{}'); old jsonb; result jsonb; product text; gid uuid; old_gid uuid; previous text; replay boolean; explicit_group boolean; movement record; linked boolean:=false; prior_receipt record; normalized jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if not exists(select 1 from profiles where id=p_actor and role in ('admin','manager') and not coalesce(suspended,false)) then raise exception using errcode='42501',message='Active farm role required'; end if;
 -- Replay is based on the accepted request/result, never the target's later state.
 if p_request_id is not null then
  select * into prior_receipt from farm_write_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then
   normalized:=v;
   if p_kind in ('sale','inventory_transaction','inventory') and jsonb_typeof(v)='object' and v?'classification' then
    select g.id into gid from farm_livestock_groups g where g.product=coalesce(v->>'product',prior_receipt.result->>'product') and g.chicken_type=coalesce(v->'classification'->>'chicken_type','') and g.growth_stage=v->'classification'->>'growth_stage' and g.sex=coalesce(v->'classification'->>'sex','unknown');
    normalized:=v||jsonb_build_object('stock_group_id',gid);
   end if;
   if prior_receipt.fingerprint<>md5(jsonb_build_array(p_kind,p_operation,normalized,p_id,p_reason)::text) then raise exception using errcode='23514',message='Retry identifier was reused with different values';end if;
   return prior_receipt.result;
  end if;
 end if;
 previous:=coalesce(current_setting('farm.livestock_group',true),'');perform set_config('farm.livestock_group','',true);
 if p_kind in ('sale','inventory_transaction','inventory') and jsonb_typeof(v)='object' then
  if p_id is not null then
   if p_kind='sale' then select to_jsonb(s) into old from farm_sales s where id=p_id;elsif p_kind='inventory' then select to_jsonb(i) into old from farm_inventory i where id=p_id;else select to_jsonb(t) into old from farm_inventory_transactions t where id=p_id;end if;
  end if;
  product:=coalesce(v->>'product',old->>'product');old_gid:=(old->>'stock_group_id')::uuid;
  explicit_group:=v?'classification' or v?'stock_group_id';
  if v?'classification' then gid:=public.farm_livestock_resolve(product,v->'classification');
  elsif v?'stock_group_id' then gid:=(v->>'stock_group_id')::uuid;
  else gid:=old_gid;end if;
  if gid is not null and not exists(select 1 from farm_livestock_groups where id=gid and farm_livestock_groups.product=product) then raise exception using errcode='22023',message='Choose a category for the selected animal';end if;
  if p_kind='sale' and old is not null and old->>'pricing_basis' is null and explicit_group then raise exception using errcode='23514',message='Legacy sale stock meaning cannot be reclassified';end if;
  if gid is not null then
   if (coalesce(v->>'quantity',old->>'quantity'))::numeric<>trunc((coalesce(v->>'quantity',old->>'quantity'))::numeric) then raise exception using errcode='22023',message='Animal quantities must be whole numbers';end if;
   if p_kind='sale' and v?'gender' and v->>'gender' is not null and exists(select 1 from farm_livestock_groups where id=gid and sex<>'unknown' and sex<>v->>'gender') then raise exception using errcode='22023',message='Sale sex does not match the selected stock category';end if;
  end if;
  if explicit_group or old_gid is not null then perform set_config('farm.livestock_group',coalesce(gid::text,'unclassified'),true);end if;
  -- Only add the persisted key when classification was actually supplied, keeping old receipt fingerprints compatible.
  if explicit_group then v:=v||jsonb_build_object('stock_group_id',gid);end if;
 end if;
 replay:=p_request_id is not null and exists(select 1 from farm_write_receipts where actor_id=p_actor and request_id=p_request_id);
 result:=public.farm_v2_write_pre_livestock(p_actor,p_kind,p_operation,v,p_id,p_reason,p_request_id);
 if p_kind='sale' and jsonb_typeof(v)='object' and not replay and explicit_group then
  if p_operation='update' and old->>'voided_at' is null and old->>'pricing_basis' is not null and old_gid is distinct from gid and old->>'product'=result->>'product' and (old->>'quantity')::numeric=(result->>'quantity')::numeric then
   -- Reclassify the authoritative linked movement, so a later void/quantity correction
   -- reverses the effective category rather than resurrecting the original one.
   for movement in select t.* from farm_inventory_transactions t where t.sale_id=p_id and t.action='sale' and t.correction_role is distinct from 'reversal' and not exists(select 1 from farm_inventory_transactions r where r.correction_of=t.id and r.correction_role='reversal') loop
    linked:=true;
    insert into farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,correction_of,correction_role,reason) values(movement.product,'add',movement.quantity,(result->>'date')::date,p_actor,p_id,movement.id,'reversal',p_reason);
    insert into farm_inventory_transactions(product,action,quantity,date,created_by,sale_id,correction_of,correction_role,reason) values(product,'sale',movement.quantity,(result->>'date')::date,p_actor,p_id,movement.id,'replacement',p_reason);
   end loop;
   if not linked then raise exception using errcode='23514',message='No authoritative linked sale movement exists to reclassify';end if;
   perform public.farm_livestock_check(product);
  end if;
  update farm_sales set stock_group_id=gid where id=(result->>'id')::uuid;
 end if;
 if p_kind in ('sale','inventory_transaction','inventory') and jsonb_typeof(v)='object' then
  perform public.farm_livestock_check(product);
  if old->>'product' is distinct from product and old->>'product' is not null then perform public.farm_livestock_check(old->>'product');end if;
 end if;
 perform set_config('farm.livestock_group',previous,true);return result;
end $$;
revoke all on function public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;

create function public.farm_livestock_balances() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(rows) order by product,growth_stage,sex),'[]'::jsonb) from (
 select g.id,g.product,g.chicken_type,g.growth_stage,g.sex,coalesce(sum(e.quantity_change),0) as quantity from farm_livestock_groups g left join farm_livestock_events e on e.group_id=g.id group by g.id
 union all
 select null::uuid,i.product,''::text,''::text,'unknown'::text,i.current_stock-coalesce((select sum(e.quantity_change) from farm_livestock_events e join farm_livestock_groups g on g.id=e.group_id where g.product=i.product),0) from farm_inventory i
 ) rows
$$;

create function public.farm_livestock_group_write(p_actor uuid,p_operation text,p_payload jsonb,p_reason text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare gid uuid; source uuid; qty numeric; d date; p text; fingerprint text; receipt record; result jsonb; before_balances jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not coalesce(suspended,false)) then raise exception using errcode='42501',message='Only an active admin may allocate or transfer categories';end if;
 if p_request_id is null or nullif(trim(p_reason),'') is null or length(p_reason)>1000 then raise exception using errcode='22023',message='A retry ID and correction reason are required';end if;
 fingerprint:=md5(jsonb_build_array('livestock_group',p_operation,p_payload,p_reason)::text);
 select * into receipt from farm_write_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if receipt.fingerprint<>fingerprint then raise exception using errcode='23514',message='Retry identifier was reused';end if;return receipt.result;end if;
 if p_operation not in ('allocate','transfer') then raise exception using errcode='22023',message='Unsupported category operation';end if;
 p:=p_payload->>'product';qty:=(p_payload->>'quantity')::numeric;d:=(p_payload->>'date')::date;
 if qty is null or qty<=0 or qty<>trunc(qty) then raise exception using errcode='22023',message='Positive whole-animal quantity required';end if;
 perform public.farm_v2_lock_date(d,true,p_reason);
 before_balances:=public.farm_livestock_balances();
 gid:=public.farm_livestock_resolve(p,p_payload->'classification');
 if p_operation='transfer' then
  source:=(p_payload->>'from_group_id')::uuid;
  if source is null or source=gid or not exists(select 1 from farm_livestock_groups a join farm_livestock_groups b on b.id=gid where a.id=source and a.product=p and a.chicken_type=b.chicken_type) then raise exception using errcode='22023',message='Choose a different stage in the same animal type';end if;
  insert into farm_livestock_events(group_id,quantity_change,actor_id,event_date,operation,reason,operation_id) values(source,-qty,p_actor,d,'transfer_out',p_reason,p_request_id);
 end if;
 insert into farm_livestock_events(group_id,quantity_change,actor_id,event_date,operation,reason,operation_id) values(gid,qty,p_actor,d,p_operation,p_reason,p_request_id);
 perform public.farm_livestock_check(p);
 result:=jsonb_build_object('group_id',gid,'quantity',qty,'operation',p_operation);
 insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason,record_date) values('livestock_group',gid,p_operation,p_actor,jsonb_build_object('balances',before_balances),jsonb_build_object('request',p_payload,'balances',public.farm_livestock_balances()),p_reason,d);
 insert into farm_write_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,fingerprint,result);
 return result;
end $$;

revoke all on function public.farm_livestock_valid(text,text,text,text),public.farm_livestock_resolve(text,jsonb),public.farm_livestock_check(text),public.farm_livestock_movement(),public.farm_livestock_validate_movement(),public.farm_livestock_balances(),public.farm_livestock_group_write(uuid,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.farm_livestock_balances(),public.farm_livestock_group_write(uuid,text,jsonb,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
