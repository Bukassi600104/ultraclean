begin;
set local lock_timeout='5s';

-- An earlier balance can receive payments through the existing invoice allocator.
-- No opening balance, sale, cash movement or stock entry is inferred for existing customers.
alter table public.farm_invoices
  add column opening_amount numeric,
  add column opening_reference text,
  add column opening_voided_at timestamptz,
  add column opening_voided_by uuid references public.profiles(id),
  add column opening_void_reason text,
  add constraint farm_invoice_opening_fields check (
    (opening_amount is null and opening_reference is null and opening_voided_at is null
      and opening_voided_by is null and opening_void_reason is null)
    or (sale_id is null and opening_amount is not null and opening_amount>0
      and opening_amount<=1000000000000000 and scale(opening_amount)<=2
      and opening_reference is not null and length(btrim(opening_reference)) between 1 and 160
      and ((opening_voided_at is null and opening_voided_by is null and opening_void_reason is null)
        or (opening_voided_at is not null and opening_voided_by is not null
          and opening_void_reason is not null and length(btrim(opening_void_reason)) between 1 and 2000)))
  );
create unique index farm_opening_reference_per_customer on public.farm_invoices(customer_id,lower(btrim(opening_reference)))
  where opening_amount is not null and opening_voided_at is null;

create view operations_private.farm_receivable_amounts as
  select i.id as invoice_id,coalesce(i.opening_amount,s.total_amount) as total_amount,
    coalesce(i.opening_voided_at,s.voided_at) as voided_at
  from public.farm_invoices i left join public.farm_sales s on s.id=i.sale_id
  where i.opening_amount is not null or s.id is not null;
revoke all on operations_private.farm_receivable_amounts from public,anon,authenticated,service_role;

create or replace function operations_private.invoice_due(p_invoice uuid,p_date date default '9999-12-31')
returns numeric language sql stable security definer set search_path=public,pg_temp as $$
  select case when v.voided_at is null then v.total_amount else 0 end
    - coalesce((select sum(n.amount) from farm_credit_notes n where n.invoice_id=p_invoice and n.voided_at is null and n.date<=p_date),0)
    - coalesce((select sum(operations_private.allocation_effective(a.id,p_date))
        from farm_receipt_allocations a join farm_customer_receipts r on r.id=a.receipt_id
        where a.invoice_id=p_invoice and r.voided_at is null and r.date<=p_date),0)
  from operations_private.farm_receivable_amounts v where v.invoice_id=p_invoice
$$;

-- Keep opening entries inside the same customer lock, retry identity and audit transaction as receipts.
do $migration$
declare
  definition text:=replace(pg_get_functiondef('public.farm_credit_write(uuid,text,jsonb,uuid,uuid)'::regprocedure),chr(13),'');
  at_invoice constant text:=' elsif p_operation=''invoice'' then';
  allocation_join constant text:='from farm_invoices i join farm_sales s on s.id=i.sale_id where i.customer_id=customer.id and i.currency=receipt.currency';
  check_join constant text:='from public.farm_invoices i join public.farm_sales s on s.id=i.sale_id';
  receivables_join constant text:='from public.farm_invoices i join operations_private.farm_receivable_amounts s on s.invoice_id=i.id';
  opening_branches constant text:=$branches$
 elsif p_operation='opening_balance' then
   select * into customer from farm_customers where id=(p_payload->>'customer_id')::uuid;
   if customer.id is null or not operations_private.customer_in_scope(p_actor,customer.id,(c->>'periodId')::uuid) then
     raise exception using errcode='42501',message='Choose a customer in this farm view';
   end if;
   if p_id is not null or p_payload->>'date' is null or jsonb_typeof(p_payload->'amount') is distinct from 'string'
      or (p_payload->>'amount') !~ '^(0|[1-9][0-9]{0,14})([.][0-9]{1,2})?$'
      or (p_payload->>'amount')::numeric<=0 or jsonb_typeof(p_payload->'reference') is distinct from 'string'
      or length(btrim(p_payload->>'reference')) not between 1 and 160 then
     raise exception using errcode='22023',message='Enter the date, amount still owed and original reference';
   end if;
   perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
   if exists(select 1 from farm_invoices i where i.customer_id=customer.id and
       (lower(i.number)=lower(btrim(p_payload->>'reference')) or
        (i.opening_voided_at is null and lower(btrim(i.opening_reference))=lower(btrim(p_payload->>'reference'))))) then
     raise exception using errcode='23514',message='This reference is already on the customer account. Open the existing entry.';
   end if;
   if exists(select 1 from farm_customer_receipts r where r.customer_id=customer.id and r.voided_at is null and r.date>d) then
     raise exception using errcode='23514',message='A later payment is already recorded. Check the amount still owed and enter the date you confirmed that balance.';
   end if;
   insert into farm_invoices(customer_id,date,due_date,credit_days,actor_id,period_id,opening_amount,opening_reference)
     values(customer.id,d,d,0,p_actor,(c->>'periodId')::uuid,(p_payload->>'amount')::numeric,btrim(p_payload->>'reference'))
     returning * into invoice;
   result:=to_jsonb(invoice)||jsonb_build_object('kind','opening_balance','reference',invoice.opening_reference,'total_exact',invoice.opening_amount::text);
 elsif p_operation='void_opening_balance' then
   if not is_admin then raise exception using errcode='42501',message='Only the MD/Owner can reverse an earlier balance';end if;
   if nullif(btrim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Enter a reason for reversing this balance';end if;
   select * into invoice from farm_invoices i where i.id=p_id and i.opening_amount is not null for update;
   if invoice.id is null or invoice.opening_voided_at is not null then raise exception using errcode='40001',message='This earlier balance is missing or already reversed';end if;
   if (c->>'periodId') is not null and (not operations_private.customer_in_scope(p_actor,invoice.customer_id,(c->>'periodId')::uuid)
        or (invoice.period_id is not null and invoice.period_id<>(c->>'periodId')::uuid)) then
     raise exception using errcode='42501',message='Open the original farm responsibility to reverse this balance';
   end if;
   if exists(select 1 from farm_receipt_allocations a join farm_customer_receipts r on r.id=a.receipt_id
      where a.invoice_id=invoice.id and r.voided_at is null and operations_private.allocation_effective(a.id)>0) then
     raise exception using errcode='23514',message='This balance has payments against it. Review those payments before reversing it.';
   end if;
   perform set_config('operations.period',coalesce(invoice.period_id::text,''),true);
   perform farm_v2_lock_date(invoice.date,true,p_payload->>'reason');
   before_value:=to_jsonb(invoice);
   update farm_invoices set opening_voided_at=now(),opening_voided_by=p_actor,opening_void_reason=btrim(p_payload->>'reason')
     where id=invoice.id returning to_jsonb(farm_invoices.*) into result;
$branches$;
begin
  if strpos(definition,at_invoice)=0 or strpos(definition,allocation_join)=0 or strpos(definition,check_join)=0 then
    raise exception 'Customer write function differs from the rehearsed version';
  end if;
  definition:=replace(definition,at_invoice,opening_branches||at_invoice);
  definition:=replace(definition,allocation_join,receivables_join||' where i.customer_id=customer.id and i.currency=receipt.currency');
  execute replace(definition,check_join,receivables_join);
end $migration$;

-- Show both kinds of receivables for the scoped customer. Revenue still uses only actual sales.
do $migration$
declare
  definition text:=replace(pg_get_functiondef('public.farm_credit_read_before_payment_details(uuid,uuid,date)'::regprocedure),chr(13),'');
  detail_join constant text:='join farm_sales s on s.id=i.sale_id join farm_customers cu';
  due_field constant text:='''due_date'',i.due_date';
  overdue constant text:='''overdue_days'',case when operations_private.invoice_due';
begin
  if strpos(definition,detail_join)=0 or strpos(definition,due_field)=0 or strpos(definition,overdue)=0 then
    raise exception 'Customer report function differs from the rehearsed version';
  end if;
  definition:=replace(definition,detail_join,'join operations_private.farm_receivable_amounts s on s.invoice_id=i.id join farm_customers cu');
  definition:=replace(definition,due_field,$fields$'due_date',case when i.opening_amount is null then i.due_date end,
    'kind',case when i.opening_amount is not null then 'opening_balance' else 'sale' end,'reference',i.opening_reference$fields$);
  execute replace(definition,overdue,'''overdue_days'',case when i.opening_amount is null and operations_private.invoice_due');
end $migration$;
commit;
