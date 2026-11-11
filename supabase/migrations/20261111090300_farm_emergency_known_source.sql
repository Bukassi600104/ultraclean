-- A CEO may know the source of an emergency expense before confirming who paid it.
-- The approval event retains that statement. Only a separate verified posting moves money.
begin;
set local lock_timeout='5s';
create or replace function public.farm_purchase_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 scope jsonb; report farm_purchase_exceptions; prior farm_purchase_receipts; fingerprint text; result jsonb;
 decision text:=p_payload->>'decision';
 source_name text:=p_payload->>'expense_source';
begin
 if p_operation='resolve_exception' and p_payload->>'manager_period_id' is not null
 and exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) and exists(
  select 1 from farm_purchase_exceptions where id=p_id and period_id is distinct from (p_payload->>'manager_period_id')::uuid
 ) then
  raise exception using errcode='42501',message='Open the expense in its original manager period';
 end if;
 if p_operation is distinct from 'resolve_exception' or decision is distinct from 'approve_awaiting_funding' then
  return public.farm_purchase_write_before_funding_confirmation(p_actor,p_operation,p_payload,p_id,p_request);
 end if;
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then
  raise exception using errcode='42501',message='Only Bimbo can approve this expense';
 end if;
 if p_request is null or nullif(trim(p_payload->>'reason'),'') is null or length(p_payload->>'reason')>2000 or
    coalesce(p_payload->>'category','') not in ('labor','utilities','veterinary','transport','equipment','produce') then
  raise exception using errcode='22023',message='Choose an expense category and explain the approval';
 end if;
 -- Earlier source-less clients could include this boolean. It never identifies a payer or moves cash.
 if p_payload - array['decision','category','reason','expense_source','manager_period_id','cash_payer_review'] <> '{}'::jsonb
    or (p_payload ? 'cash_payer_review' and (p_payload ? 'expense_source' or jsonb_typeof(p_payload->'cash_payer_review')<>'boolean'))
    or (p_payload ? 'expense_source' and coalesce(source_name,'') not in ('bimbo_transfer','sales_cash')) then
  raise exception using errcode='22023',message='Choose a known source or leave it open. Confirm the payer and payment separately';
 end if;
 fingerprint:=md5(jsonb_build_array('approve-expense-awaiting-funding',p_payload,p_id)::text);
 scope:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fingerprint);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 perform operations_private.require_record(p_actor,'farm_purchase_exceptions',p_id,(scope->>'periodId')::uuid);
 select * into prior from farm_purchase_receipts where actor_id=p_actor and request_id=p_request;
 if found then
  if prior.fingerprint<>fingerprint then raise exception using errcode='23514',message='This retry belongs to another decision';end if;
  return prior.result;
 end if;
 select * into strict report from farm_purchase_exceptions where id=p_id for update;
 if exists(select 1 from farm_operation_events where record_type='purchase_exception' and record_id=p_id and operation in ('resolve','approve_awaiting_funding'))
    or exists(select 1 from farm_exception_postings where exception_id=p_id) then
  raise exception using errcode='40001',message='This expense was already reviewed. Refresh to see its status';
 end if;
 result:=jsonb_build_object('id',p_id,'status','approved_awaiting_funding','category',p_payload->>'category','reason',p_payload->>'reason','approved_at',now())
    || jsonb_strip_nulls(jsonb_build_object('expense_source',source_name));
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason)
 values('purchase_exception',p_id,'approve_awaiting_funding',p_actor,to_jsonb(report),result,p_payload->>'reason');
 insert into farm_purchase_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request,fingerprint,result);
 return result;
end $$;
revoke all on function public.farm_purchase_write(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.farm_purchase_write(uuid,text,jsonb,uuid,uuid) to service_role;
commit;
