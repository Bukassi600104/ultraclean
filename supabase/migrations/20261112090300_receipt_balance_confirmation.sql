-- Validate an optional customer balance against the actual linked invoices within the receipt transaction.
begin;
set local lock_timeout='5s';
do $migration$
declare source text; anchor text; validation text;
begin
  source:=replace(pg_get_functiondef('public.farm_credit_write(uuid,text,jsonb,uuid,uuid)'::regprocedure),E'\r','');
  anchor:=$old$result:=to_jsonb(receipt)||jsonb_build_object('amount_exact',receipt.amount::text,'unapplied_exact',remaining::text);$old$;
  if strpos(source,anchor)=0 then raise exception 'Receipt allocation function changed. Review before applying.';end if;
  validation:=$new$
  if p_payload ? 'amount_owing' then
    if jsonb_typeof(p_payload->'amount_owing') <> 'string' or (p_payload->>'amount_owing') !~ '^(0|[1-9][0-9]{0,29})([.][0-9]{1,2})?$' then
      raise exception using errcode='22023',message='Enter a nonnegative amount owing with up to two decimal places.';
    end if;
    if (p_payload->>'amount_owing')::numeric <> (
      select coalesce(sum(operations_private.invoice_due(i.id,receipt.date)),0)
      from public.farm_invoices i join public.farm_sales s on s.id=i.sale_id
      where i.customer_id=receipt.customer_id and i.currency=receipt.currency and i.date<=receipt.date and s.voided_at is null
    ) then
      raise exception using errcode='40001',message='The amount owing does not match the recorded invoices. Check the customer balance and try again.';
    end if;
  end if;
  $new$;
  execute replace(source,anchor,validation||anchor);
end $migration$;
commit;
