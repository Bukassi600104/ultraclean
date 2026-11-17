begin;

-- Use the existing guarded movement correction, with no replacement when the actual loss was zero.
do $migration$
declare
  routine regprocedure := 'public.farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure;
  definition text := replace(pg_get_functiondef(routine), chr(13), '');
  original text := $source$        if v_quantity<=0 then raise exception using errcode='22023',message='Positive movement quantity is required'; end if;
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,correction_of,correction_role) values(v_tx.product,case when v_tx.action='add' then 'remove' else 'add' end,v_tx.quantity,v_date,p_actor,p_reason,p_id,'reversal');
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,notes,correction_of,correction_role) values(v_product,v_tx.action,v_quantity,v_date,p_actor,p_reason,coalesce(v_payload->>'notes',v_tx.notes),p_id,'replacement') returning to_jsonb(farm_inventory_transactions.*) into v_after;$source$;
  revised text := $source$        if v_quantity < 0 or (v_quantity = 0 and v_tx.action <> 'mortality') then
          raise exception using errcode='22023', message='Enter a positive movement quantity';
        end if;
        if v_tx.action = 'mortality' and v_quantity <> trunc(v_quantity) then
          raise exception using errcode='22023', message='Enter a whole number of deaths';
        end if;
        if v_quantity = 0 and (v_date <> v_tx.date or v_product <> v_tx.product
          or (v_payload ? 'batch_id' and (v_payload->>'batch_id')::uuid is distinct from v_tx.batch_id)
          or (v_payload ? 'stock_group_id' and (v_payload->>'stock_group_id')::uuid is distinct from v_tx.stock_group_id)) then
          raise exception using errcode='22023', message='Use the original date and stock when correcting deaths to zero';
        end if;
        insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,correction_of,correction_role)
        values(v_tx.product,case when v_tx.action='add' then 'remove' else 'add' end,v_tx.quantity,v_date,p_actor,p_reason,p_id,'reversal')
        returning to_jsonb(farm_inventory_transactions.*) into v_after;
        if v_quantity > 0 then
          insert into public.farm_inventory_transactions(product,action,quantity,date,created_by,reason,notes,correction_of,correction_role)
          values(v_product,v_tx.action,v_quantity,v_date,p_actor,p_reason,coalesce(v_payload->>'notes',v_tx.notes),p_id,'replacement')
          returning to_jsonb(farm_inventory_transactions.*) into v_after;
        end if;$source$;
begin
  original := replace(original, chr(13), '');
  if strpos(definition, original) = 0 then
    raise exception 'Movement correction definition differs from the rehearsed version';
  end if;
  execute replace(definition, original, revised);
end $migration$;

commit;
