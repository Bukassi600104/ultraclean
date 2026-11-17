begin;

-- Check the payer against the original report after replaying any saved decision.
do $migration$
declare
  routine regprocedure := 'public.farm_purchase_write_before_funding_confirmation(uuid,text,jsonb,uuid,uuid)'::regprocedure;
  definition text := pg_get_functiondef(routine);
  posting text := $anchor$  posted:=farm_v2_write(p_actor,'expense','create',$anchor$;
  check_payer text := $guard$  if exists (
    select 1 from public.operations_cash_accounts a
    where a.id = (p_payload->>'cash_payer_account_id')::uuid
      and a.holder_type = 'manager'
      and a.period_id is distinct from e.period_id
  ) then
    raise exception using errcode='42501', message='This payer belongs to a different supervisor period. Choose who paid this expense.';
  end if;
$guard$;
begin
  if array_length(string_to_array(definition, posting), 1) <> 2 then
    raise exception 'The emergency expense posting function differs from the rehearsed version';
  end if;
  execute replace(definition, posting, check_payer || posting);
end $migration$;

commit;
