-- Preconditions: manager periods, private evidence and structured purchasing are installed.
-- Additive dispatcher only: no legacy rows, NULL attribution or amounts are backfilled.
-- Existing advisory locks serialize decisions; transaction rollback retains original records.
-- Keep this function while clients can have request/photo submissions queued.
begin;
create function public.farm_operational_request_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;result jsonb;q farm_operational_requests;purchase farm_purchases;r farm_operation_receipts;fp text;
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);
begin
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='Request details and retry identifier required';end if;
 -- An old response may have committed before its client lost connectivity.
 if not (p_payload ? 'evidence_ids') and exists(select 1 from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id
   and fingerprint=md5(jsonb_build_array('request',p_operation,operations_private.business_payload(p_payload),p_id,p_reason)::text)) then
  return farm_operations_write(p_actor,'request',p_operation,p_payload,p_id,p_reason,p_request_id);
 end if;
 -- Preserve the exact retry contract for pre-update ordinary submissions and decisions.
 if not (p_payload ? 'evidence_ids') and not exists(select 1 from farm_purchases where request_id=p_id)
    and not exists(select 1 from farm_feed_activities where review_request_id=p_id and kind='problem') then
  return farm_operations_write(p_actor,'request',p_operation,p_payload,p_id,p_reason,p_request_id);
 end if;
 fp:=md5(jsonb_build_array('request-v2',p_operation,p_payload,p_id,p_reason)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request_id,fp,operations_private.correction_period(p_actor,'farm_operations_write','request',p_id));
 perform operations_private.prepare_target(p_actor,'farm_operations_write','request',p_id,p_payload,(c->>'periodId')::uuid);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select * into r from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then
  if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry identifier reused';end if;
  result:=r.result;
 else
  if p_operation='create' then
   result:=farm_operations_write(p_actor,'request','create',p_payload-'evidence_ids',null,null,md5(p_request_id::text||':request')::uuid);
   perform operations_private.attach_farm_evidence(p_actor,'farm_operational_requests',(result->>'id')::uuid,p_payload->'evidence_ids');
  else
   select * into q from farm_operational_requests where id=p_id for update;
   if q.id is null then raise exception using errcode='P0002',message='Request not found';end if;
   if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can decide requests';end if;
   if q.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='Request changed. Reload it before deciding';end if;
   if exists(select 1 from farm_feed_activities where review_request_id=p_id and kind='problem') then
    raise exception using errcode='23514',message='Review this physical count in Feed Inventory. Its decision can change recorded stock';
   end if;
   select * into purchase from farm_purchases where request_id=p_id for update;
   if purchase.id is not null and p_operation in ('approve','decline') then
    perform farm_purchase_write(p_actor,p_operation,jsonb_build_object('expected_revision',purchase.revision,'reason',p_reason,'manager_period_id',c->'periodId'),purchase.id,md5(p_request_id::text||':purchase')::uuid);
    select to_jsonb(t) into result from farm_operational_requests t where id=p_id;
   elsif purchase.id is not null and p_operation='resolve' then
    raise exception using errcode='23514',message='Record payments and deliveries in Purchases & deliveries; approval is not delivery';
   else
    result:=farm_operations_write(p_actor,'request',p_operation,p_payload,p_id,p_reason,md5(p_request_id::text||':decision')::uuid);
   end if;
  end if;
  insert into farm_operation_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,fp,result);
 end if;
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);
 return result;
end $$;
revoke all on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) to service_role;
commit;
