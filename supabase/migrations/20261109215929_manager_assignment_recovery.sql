-- Preconditions: named-batch assignments, immutable period receipts and scoped reports.
-- Add guarded assignment revocation/reactivation; no quantity, money or account backfill.
-- Legacy NULL revocation fields mean active. Existing retry receipts stay authoritative.
-- Uses the existing provisioning lock. Rollback must preserve assignment/audit history.
begin;
set local lock_timeout = '5s';
alter function public.manager_period_write(uuid,text,jsonb) rename to manager_period_write_before_recovery;
revoke all on function public.manager_period_write_before_recovery(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.manager_period_write(p_actor uuid,p_operation text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p manager_periods; item jsonb; old_row jsonb; new_row jsonb; result jsonb; prior manager_write_receipts;
 request_uuid uuid:=(p_payload->>'request_id')::uuid; reason text:=nullif(trim(p_payload->>'reason'),''); fp text; asset_exists boolean;
begin
 if p_operation not in ('assign','unassign') then return manager_period_write_before_recovery(p_actor,p_operation,p_payload);end if;
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if not (select enabled from operations_release_state) then raise exception using errcode='55000',message='Workspace controls are briefly paused for the update';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('period',p_operation,p_payload)::text,'UTF8')),'hex');
 select * into prior from manager_write_receipts where actor_id=p_actor and request_id=request_uuid;
 if found then
  if prior.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to another assignment decision';end if;
  return prior.result;
 end if;
 if reason is null or request_uuid is null then raise exception using errcode='22023',message='Select the items and explain the assignment change';end if;

 select * into p from manager_periods where id=(p_payload->>'period_id')::uuid and ended_at is null for update;
 if p.id is null then raise exception using errcode='22023',message='Choose an active manager period';end if;
 if p_payload ? 'manager_id' and (p_payload->>'manager_id')::uuid<>p.manager_id or p_payload ? 'business' and p_payload->>'business'<>p.business then raise exception using errcode='42501',message='Choose this manager''s own business period';end if;
 if jsonb_typeof(p_payload->'assets') is distinct from 'array' or jsonb_array_length(p_payload->'assets') not between 1 and 1000 then raise exception using errcode='22023',message='Choose the items to change';end if;
 perform operations_private.prepare_write(p_actor,p.business,jsonb_build_object('manager_period_id',p.id),request_uuid,fp);
 for item in select distinct value from jsonb_array_elements(p_payload->'assets') loop
  if not exists(select 1 from operations_private.resources() r where r.resource=item->>'resource' and r.business=p.business and r.is_asset) then raise exception using errcode='22023',message='Choose an item from this business';end if;
  execute format('select exists(select 1 from public.%I where id=$1)',item->>'resource') into asset_exists using (item->>'record_id')::uuid;
  if not asset_exists then raise exception using errcode='P0002',message='This item is no longer available';end if;
  select to_jsonb(a) into old_row from manager_asset_assignments a where period_id=p.id and resource=item->>'resource' and record_id=(item->>'record_id')::uuid for update;
  if p_operation='unassign' then
   if old_row is null then raise exception using errcode='P0002',message='This item is not assigned to the selected manager';end if;
   update manager_asset_assignments set revoked_at=coalesce(revoked_at,now()),revoked_by=coalesce(revoked_by,p_actor),revocation_reason=coalesce(revocation_reason,reason)
    where period_id=p.id and resource=item->>'resource' and record_id=(item->>'record_id')::uuid returning to_jsonb(manager_asset_assignments.*) into new_row;
  else
   insert into manager_asset_assignments(period_id,resource,record_id,assigned_by) values(p.id,item->>'resource',(item->>'record_id')::uuid,p_actor)
   on conflict(period_id,resource,record_id) do update set revoked_at=null,revoked_by=null,revocation_reason=null returning to_jsonb(manager_asset_assignments.*) into new_row;
  end if;
  if old_row is distinct from new_row then
   insert into manager_period_events(period_id,actor_id,action,reason,before_value,after_value) values(p.id,p_actor,p_operation,reason,old_row,new_row);
  end if;
 end loop;
 result:=to_jsonb(p);
 insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,request_uuid,p.business,p.id,fp,result);
 return result;
end $$;
revoke all on function public.manager_period_write(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.manager_period_write(uuid,text,jsonb) to service_role;
-- Older asset visibility must honour revocation just as named groups already do.
do $$ declare body text;needle text:='where period_id=target and resource=p_resource and record_id=record_uuid)';begin
 body:=pg_get_functiondef('operations_private.record_visible_before_batches(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 if position(needle in body)=0 then raise exception 'Unexpected asset visibility definition; review before applying';end if;
 body:=replace(body,needle,'where period_id=target and resource=p_resource and record_id=record_uuid and revoked_at is null)');
 needle:=' if link.record_id is not null and link.period_id=target then return true;end if;';
 if position(needle in body)=0 then raise exception 'Unexpected owned asset visibility definition; review before applying';end if;
 execute replace(body,needle,' if not p_personal_report and r.is_asset and exists(select 1 from manager_asset_assignments where period_id=target and resource=p_resource and record_id=record_uuid and revoked_at is not null) then return false;end if;'||chr(10)||needle);
end $$;
-- Carry item identity for the CEO discrepancy link without exposing raw codes as labels.
do $$ declare body text;needle text:='''item'',i.snapshot,''status'',i.status';begin
 body:=pg_get_functiondef('public.manager_report_snapshot(uuid,text,uuid,date,date)'::regprocedure);
 if position(needle in body)=0 then raise exception 'Unexpected handover report definition; review before applying';end if;
 execute replace(body,needle,'''item'',i.snapshot,''resource'',i.resource,''record_id'',i.record_id,''status'',i.status');
end $$;
commit;
