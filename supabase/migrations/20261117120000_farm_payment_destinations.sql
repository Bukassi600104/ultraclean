begin;
set local lock_timeout='5s';

-- A payment names the period that received the money, including when an owner
-- enters an earlier payment. Use the same dated list to display and validate it.
create function operations_private.farm_payment_supervisors(p_actor uuid,p_scope uuid,p_date date)
returns table(period_id uuid,name text)
language sql stable set search_path=public,pg_temp as $$
  select period.id,nullif(trim(supervisor.name),'')
  from manager_periods period
  join profiles supervisor on supervisor.id=period.manager_id and not supervisor.suspended
  join profiles actor on actor.id=p_actor and not actor.suspended
  where period.business='farm' and period.mode='personal' and period.starts_on<=p_date
    and (p_scope is null or period.id=p_scope)
    and (actor.role='admin' or (actor.role='manager' and actor.id=supervisor.id))
    and (
      (period.status='active' and period.ended_at is null and supervisor.role='manager')
      or (actor.role='admin' and period.status='closed' and p_date<=(period.ended_at at time zone 'Africa/Lagos')::date)
    )
$$;
revoke all on function operations_private.farm_payment_supervisors(uuid,uuid,date) from public,anon,authenticated,service_role;

do $migration$
declare
  definition text:=replace(pg_get_functiondef('operations_private.business_cash_effect(uuid,text,text,text,jsonb,jsonb,uuid,text)'::regprocedure),chr(13),'');
  anchor text:=$source$  elsif party->>'type'='self' then$source$;
  destination_branch text:=$source$  elsif party->>'type' in ('farm_destination','farm_supervisor') then
   declare
    recipient_name text;
    supervisor_period uuid;
   begin
    if business_name<>'farm' or currency_name<>'NGN' or bucket_name<>'sales'
      or p_writer not in ('farm_v2_write','farm_customer_receipt')
      or actor_row.id is null or actor_row.role not in ('admin','manager') then
     raise exception using errcode='42501',message='Choose a recipient for this business.';
    end if;
    if actor_row.role='manager' and
      (responsible.manager_id is distinct from p_actor or responsible.business<>'farm' or responsible.status<>'active') then
     raise exception using errcode='42501',message='Use your active farm supervisor period to record a payment.';
    end if;
    if party->>'type'='farm_destination' then
     recipient_name:=case party->>'destination'
       when 'primefield_account' then 'Primefield Account'
       when 'sales_and_procurement' then 'Sales and Procurement'
     end;
     if recipient_name is null or (party-array['type','destination'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='Choose who received the farm payment.';
     end if;
     -- Reuse the normalized custodian key used by existing funds and handoffs.
     target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,
       'custodian',lower(recipient_name),recipient_name);
    else
     if (party-array['type','period_id'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='Choose the farm supervisor for this payment.';
     end if;
     select s.period_id,s.name into supervisor_period,recipient_name
     from operations_private.farm_payment_supervisors(p_actor,p_period,d) s
     where s.period_id=(party->>'period_id')::uuid;
     if supervisor_period is null then
      raise exception using errcode='42501',message='Choose a farm supervisor who was responsible on the payment date.';
     end if;
     target_id:=operations_private.cash_account(p_actor,business_name,currency_name,bucket_name,
       'manager',supervisor_period::text,coalesce(recipient_name,'Farm Supervisor'),supervisor_period);
    end if;
   end;
$source$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Cash recipient handling differs from the rehearsed version';end if;
  execute replace(definition,anchor,destination_branch||anchor);
end
$migration$;

do $migration$
declare
  definition text:=replace(pg_get_functiondef('public.operations_cash_summary(uuid,text,uuid,date,date,integer,integer)'::regprocedure),chr(13),'');
  anchor text:=$source$ return result||jsonb_build_object('manager_receivers',receivers);$source$;
  farm_receivers text:=$source$ if p_business='farm' then
   result:=result||jsonb_build_object('farm_supervisor_receivers',(
     select coalesce(jsonb_agg(to_jsonb(s) order by s.name,s.period_id),'[]'::jsonb)
     from operations_private.farm_payment_supervisors(p_actor,(result->>'periodId')::uuid,(result->>'to')::date) s
   ));
  end if;
$source$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Cash summary differs from the rehearsed version';end if;
  execute replace(definition,anchor,farm_receivers||anchor);
end
$migration$;
commit;
