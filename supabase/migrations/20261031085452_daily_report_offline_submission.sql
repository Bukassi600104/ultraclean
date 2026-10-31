-- Preconditions: manager-scoped farm_operations_write and private farm evidence are installed.
-- Additive function only; no original rows, figures, credentials or NULL attribution are changed.
-- No backfill. Existing draft/review endpoints remain valid. Uses existing transaction locks.
-- Rollback: stop new queue submissions before removing this function; retain queued payloads.
begin;
create function public.farm_daily_report_submit(p_actor uuid,p_payload jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; scope jsonb; fields jsonb; target uuid; reason text;
 saved_actor text:=current_setting('operations.actor',true);saved_period text:=current_setting('operations.period',true);
begin
 if p_request is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='Report and retry identifier required';end if;
 target:=nullif(p_payload->>'id','')::uuid;reason:=p_payload->>'reason';
 scope:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,md5(jsonb_build_array('daily-report-submit',p_payload)::text));
 fields:=p_payload-'id'-'revision'-'reason'-'evidence_ids';
 if target is null then
  result:=public.farm_operations_write(p_actor,'report','create',fields,null,null,md5(p_request::text||':draft')::uuid);
 else
  if nullif(trim(reason),'') is null then raise exception using errcode='22023',message='Explain changes to the saved draft';end if;
  result:=public.farm_operations_write(p_actor,'report','update',fields||jsonb_build_object('expected_revision',p_payload->'revision'),target,reason,md5(p_request::text||':draft')::uuid);
 end if;
 result:=public.farm_operations_write(p_actor,'report','submit',jsonb_build_object('expected_revision',result->'revision','manager_period_id',scope->'periodId'),(result->>'id')::uuid,reason,md5(p_request::text||':submit')::uuid);
 perform operations_private.attach_farm_evidence(p_actor,'farm_daily_reports',(result->>'id')::uuid,p_payload->'evidence_ids');
 perform set_config('operations.actor',coalesce(saved_actor,''),true);perform set_config('operations.period',coalesce(saved_period,''),true);
 return result;
end $$;
revoke all on function public.farm_daily_report_submit(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.farm_daily_report_submit(uuid,jsonb,uuid) to service_role;
commit;
