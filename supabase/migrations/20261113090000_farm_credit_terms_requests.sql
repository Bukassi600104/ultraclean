begin;

-- Credit decisions reuse the operational request and customer payment terms ledgers.
alter function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) rename to farm_operational_request_before_credit_terms;
revoke all on function public.farm_operational_request_before_credit_terms(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_operational_request_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  customer uuid; ctx jsonb; fingerprint text; receipt farm_operation_receipts; result jsonb;
  days integer; customer_name text;
begin
  if p_operation='create' then
    customer:=(p_payload#>>'{request_details,credit_customer_id}')::uuid;
  elsif p_operation='approve' then
    select (r.request_details->>'credit_customer_id')::uuid into customer
      from farm_operational_requests r where r.id=p_id;
  end if;
  if customer is null then
    if p_payload?'credit_days' then raise exception using errcode='22023',message='Choose a customer credit request to approve terms';end if;
    return farm_operational_request_before_credit_terms(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id);
  end if;
  if p_request_id is null then raise exception using errcode='22023',message='A retry identifier is required';end if;
  fingerprint:=md5(jsonb_build_array('customer-terms-request',p_operation,p_payload,p_id,p_reason)::text);
  ctx:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request_id,fingerprint,
    operations_private.correction_period(p_actor,'farm_operations_write','request',p_id));
  if not operations_private.customer_allowed(p_actor,customer,(ctx->>'periodId')::uuid) then
    raise exception using errcode='42501',message='Choose a customer assigned to this farm account';
  end if;
  select * into receipt from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then
    if receipt.fingerprint<>fingerprint then raise exception using errcode='23514',message='This retry belongs to a different request';end if;
    return receipt.result;
  end if;

  if p_operation='create' then
    if p_id is not null or p_payload->>'category' is distinct from 'other' or (p_payload->'request_details')?'purchase_category'
       or p_payload?'credit_days' then
      raise exception using errcode='22023',message='Submit a separate request for customer credit terms';
    end if;
    -- prepare_write holds the shared period write lock until commit, including across devices.
    select to_jsonb(r) into result from farm_operational_requests r
      where r.requested_by=p_actor and r.request_details->>'credit_customer_id'=customer::text and r.status='pending'
        and operations_private.record_visible(p_actor,'farm_operational_requests',to_jsonb(r),(ctx->>'periodId')::uuid)
      order by r.created_at desc,r.id desc limit 1;
    if result is null then
      if coalesce((select t.days from farm_customer_terms t where t.customer_id=customer order by t.created_at desc,t.id desc limit 1),0)>0 then
        raise exception using errcode='40001',message='Payment terms are already approved. Refresh the sale to continue.';
      end if;
      select name into strict customer_name from farm_customers where id=customer;
      result:=farm_operational_request_before_credit_terms(p_actor,'create',
        p_payload||jsonb_build_object('description','Approve credit terms for '||customer_name),null,null,
        md5(p_request_id::text||':credit-request')::uuid);
    end if;
  else
    if coalesce(p_payload->>'credit_days','')!~'^[1-9][0-9]{0,3}$' or (p_payload->>'credit_days')::integer>3650 then
      raise exception using errcode='22023',message='Enter the approved payment term in days (1 to 3650)';
    end if;
    days:=(p_payload->>'credit_days')::integer;
    result:=farm_operational_request_before_credit_terms(p_actor,'approve',p_payload-'credit_days',p_id,p_reason,md5(p_request_id::text||':credit-decision')::uuid);
    perform farm_credit_write(p_actor,'terms',jsonb_build_object('days',days,'reason',p_reason),customer,
      md5(p_request_id::text||':approved-days')::uuid);
  end if;
  insert into farm_operation_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,fingerprint,result);
  return result;
end $$;
revoke all on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
