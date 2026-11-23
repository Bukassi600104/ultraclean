-- Read-only, dated cash statements for the existing custody ledger.
begin;

create function public.operations_cash_statement(
  p_actor uuid, p_business text, p_period_id uuid,
  p_from date, p_to date, p_page integer, p_limit integer, p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  scope jsonb := public.manager_context(p_actor, p_business, p_period_id);
  period uuid := (scope->>'periodId')::uuid;
  is_owner boolean := exists (
    select 1 from public.profiles where id=p_actor and role='admin' and not suspended
  );
  whole_business boolean := is_owner and scope->>'mode'='admin_all';
  last_day date := coalesce(p_to, (now() at time zone 'Africa/Lagos')::date);
  first_day date := coalesce(p_from, (scope->>'startsOn')::date,
    date_trunc('month', last_day)::date);
  skipped bigint;
  result jsonb;
begin
  if not is_owner and (scope->>'mode' is distinct from 'personal'
    or coalesce(scope->>'status','') not in ('active','awaiting_handover') or period is null) then
    raise exception using errcode='42501', message='Open your current supervisor period to view its funds.';
  end if;
  if first_day>last_day or p_page is null or p_page<0 or
    p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode='22023', message='Choose a valid date range and statement page.';
  end if;
  if p_account_id is not null and not exists (
    select 1 from public.operations_cash_accounts a
    where a.id=p_account_id and a.business=p_business
      and a.holder_type in ('manager','custodian','ceo')
      and (whole_business or (a.holder_type='manager' and a.period_id=period))
  ) then
    raise exception using errcode='42501', message='This holder is outside the selected funds statement.';
  end if;
  skipped := p_page::bigint * p_limit;

  with held as materialized (
    select a.id,a.name,a.bucket,a.currency,a.period_id
    from public.operations_cash_accounts a
    where a.business=p_business and a.holder_type in ('manager','custodian','ceo')
      and (whole_business or (a.holder_type='manager' and a.period_id=period))
  ), selected as materialized (
    select * from held where p_account_id is null or id=p_account_id
  ), scoped_postings as materialized (
    select p.account_id,p.event_id,p.operational_date,p.phase,sum(p.amount) as amount,
      sum(greatest(p.amount,0)) as money_in,sum(greatest(-p.amount,0)) as money_out
    from selected a join public.operations_cash_postings p on p.account_id=a.id
    where p.operational_date<=last_day
    group by p.account_id,p.event_id,p.operational_date,p.phase
  ), totals as (
    select a.id,a.name,a.bucket,a.currency,
      coalesce(sum(p.amount) filter(where p.operational_date<first_day),0)::text as opening,
      coalesce(sum(p.money_in) filter(where p.operational_date>=first_day),0)::text as money_in,
      coalesce(sum(p.money_out) filter(where p.operational_date>=first_day),0)::text as money_out,
      coalesce(sum(p.amount),0)::text as closing
    from selected a left join scoped_postings p on p.account_id=a.id
    group by a.id,a.name,a.bucket,a.currency
  ), dated as (
    select p.*,e.recorded_at,e.operation,
      sum(p.amount) over (partition by p.account_id order by
        p.operational_date,e.recorded_at,p.event_id,p.phase desc rows unbounded preceding) as balance
    from scoped_postings p join public.operations_cash_events e on e.id=p.event_id
  ), movements as materialized (
    select * from dated where operational_date>=first_day
  ), movement_page as (
    select * from movements
    order by operational_date desc,recorded_at desc,event_id desc,phase,account_id
    limit p_limit offset skipped
  ), movement_details as (
    select concat(p.event_id,':',p.account_id,':',p.operational_date,':',p.phase) id,
      a.name as holder,a.bucket,a.currency,p.operational_date as date,p.recorded_at,
      p.event_id,p.phase,p.account_id,p.operation,original.cash_kind as kind,
      original.resource,p.amount::text,p.balance::text,
      case when p.phase='reversal' then labels.recipient else labels.sender end as sender,
      case when p.phase='reversal' then labels.sender else labels.recipient end as recipient
    from movement_page p join selected a on a.id=p.account_id
    join public.operations_cash_events e on e.id=p.event_id
    join public.operations_cash_events original on original.id=
      case when p.phase='reversal' then e.corrects_id else e.id end
    join public.operations_cash_accounts source on source.id=original.source_account_id
    join public.operations_cash_accounts target on target.id=original.target_account_id
    left join public.operations_cash_events dispatch on dispatch.id=original.origin_event_id and original.cash_kind='receive'
    left join public.operations_cash_accounts dispatcher on dispatcher.id=dispatch.source_account_id
    left join public.farm_expenses expense on original.resource='farm_expenses' and expense.id=original.record_id
    left join public.farm_purchase_payments purchase on original.resource='farm_purchase_payments' and purchase.id=original.record_id
    cross join lateral (select
      case when original.cash_kind='fund' or dispatch.cash_kind='fund' then 'MD/Owner'
        when original.cash_kind='inflow' and source.holder_type='outside' then 'Customer'
        else regexp_replace(coalesce(dispatcher.name,source.name),' awaiting receipt$','','i') end as sender,
      case when target.holder_type='outside' then coalesce(nullif(expense.paid_to,''),
        nullif(purchase.recipient,''),case when original.resource='farm_customer_refunds' then 'Customer' else 'Payee' end)
        else regexp_replace(target.name,' awaiting receipt$','','i') end as recipient
    ) labels
  ), awaiting as materialized (
    select a.id,a.name,a.bucket,a.currency
    from public.operations_cash_accounts a
    where a.business=p_business and a.holder_type='awaiting'
      and (
        (p_account_id is null and (whole_business or a.period_id=period))
        or exists (
          select 1 from selected m where m.period_id=a.period_id and m.bucket=a.bucket and m.currency=a.currency
        )
        or exists (
          select 1 from selected m join public.operations_cash_events e on e.source_account_id=m.id
          where e.target_account_id=a.id and e.cash_kind in ('fund','handoff')
        )
      )
  ), dispatch_totals as (
    select a.id,a.name,a.bucket,a.currency,max(p.operational_date) as last_movement,
      coalesce(sum(p.amount) filter(where e.cash_kind in ('fund','handoff') and e.target_account_id=a.id),0) as sent,
      coalesce(sum(-p.amount) filter(where e.cash_kind='receive' and e.source_account_id=a.id),0) as received,
      sum(p.amount) as outstanding
    from awaiting a join public.operations_cash_postings p on p.account_id=a.id
    join public.operations_cash_events e on e.id=p.event_id
    where p.operational_date<=last_day
    group by a.id,a.name,a.bucket,a.currency
  ), dispatches as materialized (
    select d.id,d.bucket,d.currency,origin.operational_date as date,
      case when origin.cash_kind='fund' then 'MD/Owner' else origin.sender end as sender,
      regexp_replace(d.name,' awaiting receipt$','','i') as recipient,
      d.sent::text,d.received::text,d.outstanding::text,
      case when d.sent=0 then 'cancelled' when d.outstanding=0 then 'received'
        when d.received>0 then 'partial' else 'awaiting' end as status
    from dispatch_totals d
    join lateral (
      select p.operational_date,e.cash_kind,s.name as sender
      from public.operations_cash_postings p
      join public.operations_cash_events e on e.id=p.event_id
      join public.operations_cash_accounts s on s.id=e.source_account_id
      where p.account_id=d.id and e.target_account_id=d.id and p.phase='effect'
        and p.operational_date<=last_day and e.cash_kind in ('fund','handoff')
      order by e.recorded_at desc,e.id desc,p.id desc limit 1
    ) origin on true
    where d.last_movement>=first_day or d.outstanding>0
  ), dispatch_page as (
    select * from dispatches order by date desc,id desc limit p_limit offset skipped
  )
  select jsonb_build_object(
    'from',first_day,'to',last_day,'page',p_page,'limit',p_limit,
    'accounts',coalesce((select jsonb_agg(to_jsonb(a)-'period_id' order by a.name,a.currency,a.bucket,a.id) from held a),'[]'::jsonb),
    'balances',coalesce((select jsonb_agg(to_jsonb(b) order by b.name,b.currency,b.bucket,b.id) from totals b),'[]'::jsonb),
    'movements',coalesce((select jsonb_agg(to_jsonb(m)-'recorded_at'-'event_id'
      order by m.date desc,m.recorded_at desc,m.event_id desc,m.phase,m.account_id) from movement_details m),'[]'::jsonb),
    'dispatches',coalesce((select jsonb_agg(to_jsonb(d) order by d.date desc,d.id desc) from dispatch_page d),'[]'::jsonb),
    'total',(select count(*) from movements),'dispatch_total',(select count(*) from dispatches)
  ) into result;
  return result;
end;
$$;

revoke all on function public.operations_cash_statement(uuid,text,uuid,date,date,integer,integer,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.operations_cash_statement(uuid,text,uuid,date,date,integer,integer,uuid)
  to service_role;

commit;
