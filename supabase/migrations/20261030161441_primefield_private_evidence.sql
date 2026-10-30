-- Preconditions: manager guards and named batches; managed Storage buckets/objects.
-- New private bucket only. No historical photos, figures, attribution or objects are changed.
-- Pending files remain retryable; linking is separate from upload and never proves a physical event.
-- No historical backfill. Retain evidence metadata and bucket on rollback after uploads.
begin;
set local lock_timeout='5s';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('farm-evidence','farm-evidence',false,3145728,array['image/jpeg']);
-- Existing permissive storage policies cannot expose this bucket to direct clients.
create policy farm_evidence_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'farm-evidence') with check(bucket_id<>'farm-evidence');
create table public.farm_evidence (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references profiles(id),
 period_id uuid references manager_periods(id),batch_id uuid references farm_batches(id),
 request_id uuid not null,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes integer not null check(bytes between 1 and 3145728),mime text not null check(mime='image/jpeg'),
 object_path text not null unique,activity_date date not null,created_at timestamptz not null default now(),
 uploaded_at timestamptz,status text not null default 'pending' check(status in ('pending','uploaded')),
 target_resource text not null check(target_resource in ('farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks')),
 record_id uuid,linked_at timestamptz,
 check((status='uploaded')=(uploaded_at is not null)),check((record_id is null)=(linked_at is null)),
 unique(actor_id,request_id)
);
alter table farm_evidence enable row level security;
revoke all on farm_evidence from public,anon,authenticated,service_role;
grant select on farm_evidence to service_role;
create function public.farm_evidence_read(p_actor uuid,p_id uuid,p_period uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;e farm_evidence;
begin
 c:=manager_context(p_actor,'farm',p_period);
 select * into e from farm_evidence where id=p_id;
 if e.id is null or (c->>'mode'<>'admin_all' and (e.period_id is distinct from (c->>'periodId')::uuid or (e.actor_id<>p_actor and not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended)))) then raise exception using errcode='42501',message='This photo belongs to another account or responsibility period';end if;
 return to_jsonb(e);
end $$;
create function public.farm_evidence_write(p_actor uuid,p_operation text,p_payload jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;e farm_evidence;fp text;batch_uuid uuid;date_value date;new_id uuid;
begin
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='Photo retry identifier and metadata are required';end if;
 c:=manager_context(p_actor,'farm',nullif(p_payload->>'manager_period_id','')::uuid);
 if p_operation='reserve' then
  fp:=encode(sha256(convert_to(jsonb_build_array('farm_evidence',p_payload)::text,'UTF8')),'hex');
  perform operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
  select * into e from farm_evidence where actor_id=p_actor and request_id=p_request;
  if found then return to_jsonb(e);end if;
  batch_uuid:=(p_payload->>'batch_id')::uuid;
  if batch_uuid is not null then perform operations_private.require_record(p_actor,'farm_batches',batch_uuid,(c->>'periodId')::uuid);end if;
  date_value:=(p_payload->>'activity_date')::date;
  if date_value is null then raise exception using errcode='22023',message='Photo activity date required';end if;
  if c->>'mode'='personal' and date_value<(c->>'startsOn')::date then raise exception using errcode='42501',message='Photo activity cannot predate responsibility';end if;
  new_id:=gen_random_uuid();
  insert into farm_evidence(id,actor_id,period_id,batch_id,request_id,sha256,bytes,mime,object_path,activity_date,target_resource)
  values(new_id,p_actor,(c->>'periodId')::uuid,batch_uuid,p_request,p_payload->>'sha256',(p_payload->>'bytes')::integer,p_payload->>'mime',p_actor::text||'/'||coalesce(c->>'periodId','legacy')||'/'||new_id::text||'.jpg',date_value,p_payload->>'target_resource') returning * into e;
 elsif p_operation='uploaded' then
  perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
  perform farm_evidence_read(p_actor,(p_payload->>'id')::uuid,(c->>'periodId')::uuid);
  select * into e from farm_evidence where id=(p_payload->>'id')::uuid for update;
  if e.actor_id<>p_actor or e.request_id<>p_request then raise exception using errcode='42501',message='Only the original upload may complete';end if;
  update farm_evidence set status='uploaded',uploaded_at=coalesce(uploaded_at,now()) where id=e.id returning * into e;
 else raise exception using errcode='22023',message='Unknown photo operation';end if;
 return to_jsonb(e);
end $$;
revoke all on function farm_evidence_read(uuid,uuid,uuid),farm_evidence_write(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function farm_evidence_read(uuid,uuid,uuid),farm_evidence_write(uuid,text,jsonb,uuid) to service_role;
commit;
