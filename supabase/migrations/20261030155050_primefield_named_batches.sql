-- Preconditions: deployed manager periods, guarded inventory and livestock classifications.
-- Additive only: no historical batch allocation, account or stock backfill.
-- NULL classification means unclassified, not a guessed classification.
-- Serialize allocations with existing stock writes. Retain ledgers on rollback after use.
-- Rehearse against a fresh restored backup before explicit production release approval.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.farm_sites (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 created_by uuid not null references profiles(id), created_at timestamptz not null default now()
);
create table public.farm_batches (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references farm_sites(id),
 name text not null check(length(trim(name)) between 1 and 120),
 kind text not null check(kind in ('flock','pond','pen','herd')),
 product text not null check(product in ('catfish','chicken','turkey','pig','goat','cattle')),
 stock_group_id uuid references farm_livestock_groups(id),
 created_by uuid not null references profiles(id), created_at timestamptz not null default now(),
 archived_at timestamptz, unique(site_id,name)
);
create table public.farm_batch_movements (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references farm_batches(id),
 quantity numeric not null check(quantity<>0 and quantity=trunc(quantity)),
 date date not null, actor_id uuid not null references profiles(id),
 operation_id uuid not null, kind text not null check(kind in ('allocate','transfer','inventory')),
 transaction_id uuid unique references farm_inventory_transactions(id),
 reason text not null check(length(trim(reason)) between 1 and 1000), created_at timestamptz not null default now()
);
create index farm_batch_movements_batch on farm_batch_movements(batch_id);
alter function public.farm_livestock_check(text) rename to farm_livestock_check_before_batches;
revoke all on function farm_livestock_check_before_batches(text) from public,anon,authenticated,service_role;
create function public.farm_livestock_check(p text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform farm_livestock_check_before_batches(p);
 if exists(select 1 from farm_batches b join farm_batch_movements m on m.batch_id=b.id where b.product=p group by b.id having sum(m.quantity)<0) then
  raise exception using errcode='23514',message='A batch cannot have negative stock';
 end if;
 if exists(
  select 1 from (select b.stock_group_id,sum(m.quantity) quantity from farm_batches b join farm_batch_movements m on m.batch_id=b.id where b.product=p group by b.stock_group_id) assigned
  left join jsonb_array_elements(farm_livestock_balances()) actual on actual->>'product'=p and (actual->>'id')::uuid is not distinct from assigned.stock_group_id
  where assigned.quantity>coalesce((actual->>'quantity')::numeric,0)
 ) then raise exception using errcode='23514',message='Choose the responsible batch; this change would consume stock allocated to another batch';end if;
end $$;
revoke all on function farm_livestock_check(text) from public,anon,authenticated,service_role;
create function operations_private.check_batch_movement() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform farm_livestock_check((select product from farm_batches where id=new.batch_id));return new;end $$;
revoke all on function operations_private.check_batch_movement() from public,anon,authenticated,service_role;
create constraint trigger batch_final_balance after insert on farm_batch_movements deferrable initially deferred for each row execute function operations_private.check_batch_movement();
create table public.farm_batch_receipts (
 actor_id uuid not null references profiles(id), request_id uuid not null,
 result jsonb not null, primary key(actor_id,request_id)
);
-- Existing periods retain their accepted handover semantics; only future periods opt in.
alter table manager_periods add column assigned_handover boolean;
alter table manager_periods alter column assigned_handover set default true;
alter table manager_asset_assignments add column revoked_at timestamptz;
alter table manager_asset_assignments add column revoked_by uuid references profiles(id);
alter table manager_asset_assignments add column revocation_reason text;
alter function operations_private.resources() rename to resources_before_batches;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_batches()
 union all values ('farm_sites','farm',null,'created_by',true),('farm_batches','farm',null,'created_by',true),('farm_batch_movements','farm','date','actor_id',false)
$$;
alter function operations_private.record_visible(uuid,text,jsonb,uuid,boolean) rename to record_visible_before_batches;
create function operations_private.record_visible(p_actor uuid,p_resource text,p_row jsonb,p_period_id uuid default null,p_personal_report boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;
begin
 if p_resource not in ('farm_sites','farm_batches','farm_batch_movements') then
  return operations_private.record_visible_before_batches(p_actor,p_resource,p_row,p_period_id,p_personal_report);
 end if;
 c:=manager_context(p_actor,'farm',p_period_id);
 if c->>'mode'='admin_all' then return true;end if;
 if p_resource='farm_batch_movements' then
  return exists(select 1 from manager_record_links where resource=p_resource and record_id=(p_row->>'id')::uuid and period_id=(c->>'periodId')::uuid);
 end if;
 return not p_personal_report and exists(select 1 from manager_asset_assignments where resource=p_resource and record_id=(p_row->>'id')::uuid and period_id=(c->>'periodId')::uuid and revoked_at is null);
exception when insufficient_privilege then return false;
end $$;
do $$ declare t text;begin
 foreach t in array array['farm_sites','farm_batches','farm_batch_movements','farm_batch_receipts'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public,anon,authenticated,service_role',t);
  execute format('grant select on %I to service_role',t);
  if t<>'farm_batch_receipts' then
   execute format('grant select on %I to authenticated',t);
   execute format('create policy batch_role_read on %I for select to authenticated using(true)',t);
   execute format('create policy batch_scoped_read on %I as restrictive for select to authenticated using(manager_can_read_record(%L,to_jsonb(%I.*)))',t,t,t);
   execute format('create trigger manager_record_guard before insert or update on %I for each row execute function operations_private.guard_record()',t);
   execute format('create trigger manager_record_attribution after insert on %I for each row execute function operations_private.tag_record()',t);
  end if;
 end loop;
end $$;
create trigger batch_movement_immutable before update or delete on farm_batch_movements for each row execute function farm_activity_immutable();
create function operations_private.handover_sources(p_period uuid)
returns table(item_key text,resource text,record_id uuid,step_key text,snapshot jsonb,version text)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.* from operations_private.handover_sources() s
 where not coalesce((select assigned_handover from manager_periods where id=p_period),false)
 or exists(select 1 from manager_asset_assignments a where a.period_id=p_period and a.resource=s.resource and a.record_id=s.record_id and a.revoked_at is null)
 union all
 select 'batch:'||b.id,'farm_batches',b.id,'stock',
 jsonb_build_object('label',b.name,'quantity',coalesce((select sum(quantity) from farm_batch_movements where batch_id=b.id),0)::text,'unit','animals','details','[]'::jsonb),
 md5(jsonb_build_array(to_jsonb(b),(select coalesce(sum(quantity),0) from farm_batch_movements where batch_id=b.id))::text)
 from farm_batches b where b.archived_at is null and exists(select 1 from manager_asset_assignments a where a.period_id=p_period and a.resource='farm_batches' and a.record_id=b.id and a.revoked_at is null)
$$;
do $$ declare definition text;needle text:='for source in select * from operations_private.handover_sources() loop';begin
 definition:=pg_get_functiondef('handover_write(uuid,text,uuid,jsonb,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Handover source precondition changed';end if;
 execute replace(definition,needle,'for source in select * from operations_private.handover_sources(s.period_id) loop');
end $$;
alter function public.manager_period_write(uuid,text,jsonb) rename to manager_period_write_before_batches;
revoke all on function manager_period_write_before_batches(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.manager_period_write(p_actor uuid,p_operation text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p manager_periods;item jsonb;before_value jsonb;result jsonb;fp text;receipt manager_write_receipts;request_uuid uuid:=(p_payload->>'request_id')::uuid;reason text:=nullif(trim(p_payload->>'reason'),'');
begin
 if p_operation not in ('assign','unassign') or (p_operation='assign' and not exists(select 1 from jsonb_array_elements(p_payload->'assets') a where a->>'resource' in ('farm_sites','farm_batches'))) then
  return manager_period_write_before_batches(p_actor,p_operation,p_payload);
 end if;
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 select * into p from manager_periods where id=(p_payload->>'period_id')::uuid and business='farm' and ended_at is null for update;
 if p.id is null then raise exception using errcode='22023',message='Choose an active farm period';end if;
 if jsonb_typeof(p_payload->'assets') is distinct from 'array' or jsonb_array_length(p_payload->'assets') not between 1 and 1000 then raise exception using errcode='22023',message='Choose the assigned assets';end if;
 if p_operation='unassign' and (reason is null or request_uuid is null) then raise exception using errcode='22023',message='Reason and retry identifier required';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('period',p_operation,p_payload)::text,'UTF8')),'hex');
 if request_uuid is not null then
  select * into receipt from manager_write_receipts where actor_id=p_actor and request_id=request_uuid;
  if found then if receipt.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to another period decision';end if;return receipt.result;end if;
 end if;
 perform operations_private.prepare_write(p_actor,'farm',jsonb_build_object('manager_period_id',p.id),request_uuid,fp);
 if p_operation='assign' then result:=manager_period_write_before_batches(p_actor,p_operation,p_payload-'request_id');else result:=to_jsonb(p);end if;
 for item in select value from jsonb_array_elements(p_payload->'assets') loop
  if item->>'resource' not in ('farm_sites','farm_batches') then
   if p_operation='unassign' then raise exception using errcode='22023',message='Use this action for named farm sites and batches';end if;
   continue;
  end if;
  select to_jsonb(a) into before_value from manager_asset_assignments a where period_id=p.id and resource=item->>'resource' and record_id=(item->>'record_id')::uuid for update;
  if before_value is null then raise exception using errcode='P0002',message='Assignment not found';end if;
  if p_operation='unassign' then
   update manager_asset_assignments set revoked_at=coalesce(revoked_at,now()),revoked_by=coalesce(revoked_by,p_actor),revocation_reason=coalesce(revocation_reason,reason) where period_id=p.id and resource=item->>'resource' and record_id=(item->>'record_id')::uuid;
  else
   update manager_asset_assignments set revoked_at=null,revoked_by=null,revocation_reason=null where period_id=p.id and resource=item->>'resource' and record_id=(item->>'record_id')::uuid;
  end if;
  insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('batch_assignment',(item->>'record_id')::uuid,p_operation,p_actor,before_value,jsonb_build_object('period_id',p.id,'asset',item),reason);
 end loop;
 if request_uuid is not null then insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,request_uuid,'farm',p.id,fp,result);end if;
 return result;
end $$;
revoke all on function manager_period_write(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function manager_period_write(uuid,text,jsonb) to service_role;
create function public.farm_batch_write(p_actor uuid,p_operation text,p_payload jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;b farm_batches;other farm_batches;qty numeric;available numeric;d date;reason text;fp text;new_id uuid;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can configure batches or allocate verified stock';end if;
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='A valid entry and retry identifier are required';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('farm_batch',p_operation,p_payload)::text,'UTF8')),'hex');
 perform operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 select r.result into result from farm_batch_receipts r where actor_id=p_actor and request_id=p_request;
 if found then return result;end if;
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 if p_operation='site' then
  insert into farm_sites(name,created_by) values(trim(p_payload->>'name'),p_actor) returning to_jsonb(farm_sites.*) into result;
 elsif p_operation='batch' then
  if p_payload->>'stock_group_id' is not null and not exists(select 1 from farm_livestock_groups where id=(p_payload->>'stock_group_id')::uuid and product=p_payload->>'product') then raise exception using errcode='22023',message='Classification must match the batch product';end if;
  insert into farm_batches(site_id,name,kind,product,stock_group_id,created_by)
  values((p_payload->>'site_id')::uuid,trim(p_payload->>'name'),p_payload->>'kind',p_payload->>'product',(p_payload->>'stock_group_id')::uuid,p_actor) returning to_jsonb(farm_batches.*) into result;
 elsif p_operation in ('allocate','transfer') then
  select * into b from farm_batches where id=(p_payload->>'batch_id')::uuid and archived_at is null for update;
  if b.id is null then raise exception using errcode='P0002',message='Active batch not found';end if;
  qty:=(p_payload->>'quantity')::numeric;d:=(p_payload->>'date')::date;reason:=trim(p_payload->>'reason');
  if qty is null or qty<=0 or qty<>trunc(qty) or qty='NaN'::numeric or qty='Infinity'::numeric or d is null or coalesce(length(reason),0) not between 1 and 1000 then raise exception using errcode='22023',message='Enter a positive whole count, date and verification reason';end if;
  perform farm_v2_lock_date(d,true,reason);
  if p_operation='allocate' then
   select (l->>'quantity')::numeric into available from jsonb_array_elements(farm_livestock_balances()) l where l->>'product'=b.product and (l->>'id')::uuid is not distinct from b.stock_group_id;
   available:=coalesce(available,0)-(select coalesce(sum(m.quantity),0) from farm_batch_movements m join farm_batches x on x.id=m.batch_id where x.product=b.product and x.stock_group_id is not distinct from b.stock_group_id);
   if qty>available then raise exception using errcode='23514',message='Allocation exceeds verified unallocated stock';end if;
   insert into farm_batch_movements(batch_id,quantity,date,actor_id,operation_id,kind,reason) values(b.id,qty,d,p_actor,p_request,'allocate',reason) returning id into new_id;
  else
   select * into other from farm_batches where id=(p_payload->>'to_batch_id')::uuid and archived_at is null for update;
   if other.id is null or other.id=b.id or other.product<>b.product or other.stock_group_id is distinct from b.stock_group_id then raise exception using errcode='22023',message='Choose a different batch with the same classification';end if;
   if qty>(select coalesce(sum(quantity),0) from farm_batch_movements where batch_id=b.id) then raise exception using errcode='23514',message='Transfer exceeds batch stock';end if;
   insert into farm_batch_movements(batch_id,quantity,date,actor_id,operation_id,kind,reason) values(b.id,-qty,d,p_actor,p_request,'transfer',reason),(other.id,qty,d,p_actor,p_request,'transfer',reason);
   new_id:=p_request;
  end if;
  result:=jsonb_build_object('id',new_id,'batch_id',b.id,'quantity',qty::text,'operation',p_operation);
 else raise exception using errcode='22023',message='Unknown batch operation';end if;
 insert into farm_activity(record_type,record_id,operation,actor_id,after_value,reason,record_date) values('batch',(result->>'id')::uuid,p_operation,p_actor,result,reason,d);
 insert into farm_batch_receipts(actor_id,request_id,result) values(p_actor,p_request,result);
 return result;
end $$;
revoke all on function farm_batch_write(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function farm_batch_write(uuid,text,jsonb,uuid) to service_role;
revoke all on function operations_private.handover_sources(uuid),operations_private.resources_before_batches(),operations_private.resources(),operations_private.record_visible_before_batches(uuid,text,jsonb,uuid,boolean),operations_private.record_visible(uuid,text,jsonb,uuid,boolean) from public,anon,authenticated,service_role;
commit;
