-- Preconditions: guarded farm_activity, manager_context and managed staff roles exist.
-- Adds one service-only audit routine; no records, credentials or legacy NULLs change.
-- No backfill or inventory/accounting writes. Only the new audit row is locked on insertion.
-- Rollback may drop this function after removing its application caller; retain audit rows.
begin;
create function public.staff_restoration_audit(p_actor uuid,p_target uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target profiles; result uuid; context jsonb;
begin
 context:=manager_context(p_actor,'farm',null);
 if context->>'mode' is distinct from 'admin_all' then raise exception using errcode='42501',message='CEO access required';end if;
 if p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception using errcode='22023',message='Restoration reason required';end if;
 select * into target from profiles where id=p_target;
 if target.id is null or target.id=p_actor or target.role not in ('manager','property_manager','content_manager','farm_vet','farm_accountant') then
  raise exception using errcode='42501',message='Only staff accounts can be restored';
 end if;
 perform set_config('operations.actor',p_actor::text,true);
 perform set_config('operations.period','',true);
 insert into farm_activity(record_type,record_id,operation,actor_id,reason,before_value,after_value)
 values('staff_account',p_target,'restore_requested',p_actor,trim(p_reason),jsonb_build_object('role',target.role,'suspended',target.suspended,'access_removed',true),null)
 returning id into result;
 return result;
end $$;
revoke all on function public.staff_restoration_audit(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.staff_restoration_audit(uuid,uuid,text) to service_role;
commit;
