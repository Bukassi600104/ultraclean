begin;
set local lock_timeout = '5s';

-- Mark a visible death as superseded even when the reversal is outside the report window.
-- The original movement and the reversal stay in their original audit dates and scopes.
do $migration$
declare
  routine regprocedure := 'operations_private.row_payload(uuid,text,jsonb,uuid)'::regprocedure;
  definition text := replace(pg_get_functiondef(routine), chr(13), '');
  original text := $source$ if p_row->>'stock_group_id' is not null then$source$;
  revised text := $source$ if p_resource = 'farm_inventory_transactions' and p_row->>'action' = 'mortality' then
  if exists (
   select 1 from public.farm_inventory_transactions undo
   where undo.correction_of = (p_row->>'id')::uuid and undo.correction_role = 'reversal'
  ) then
   result := result || jsonb_build_object('mortality_reversed', true);
  end if;
 end if;
 if p_row->>'stock_group_id' is not null then$source$;
begin
  if strpos(definition, original) = 0 or strpos(definition, 'mortality_reversed') <> 0 then
    raise exception 'Farm reporting payload differs from the rehearsed version';
  end if;
  execute replace(definition, original, revised);
end $migration$;

commit;
