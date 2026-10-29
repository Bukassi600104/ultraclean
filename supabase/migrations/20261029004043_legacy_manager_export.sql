-- Preconditions: manager reports, period links and cash custody schema. Read-only export only.
-- No source/account updates, backfill, guessed recipient or opening quantity/cash is permitted.
-- One STABLE RPC reads one PostgreSQL statement snapshot, across every period of an eligible account.
-- Missing legacy actors remain NULL. Original numeric and nested JSON fields are returned as text.
-- No source locks beyond normal reads; retain this additive schema on application rollback.
begin;
create function operations_private.export_owned(p_target uuid,p_resource text,p_row jsonb)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare actor_column text;linked uuid;target_resource text;related jsonb;
begin
 if p_row is null then return false;end if;
 select period_id into linked from manager_record_links where resource=p_resource and record_id=(p_row->>'id')::uuid;
 if linked is not null then return exists(select 1 from manager_periods where id=linked and manager_id=p_target);end if;
 select r.actor_column into actor_column from operations_private.resources() r where r.resource=p_resource and r.business='farm';
 if actor_column is not null and p_row->>actor_column=p_target::text then return true;end if;
 if p_resource in ('farm_activity','farm_correction_requests') then target_resource:=operations_private.write_resource('farm_v2_write',p_row->>'record_type');
 elsif p_resource='farm_operation_events' then target_resource:=case p_row->>'record_type' when 'daily_report' then 'farm_daily_reports' when 'report' then 'farm_daily_reports' when 'operational_request' then 'farm_operational_requests' when 'request' then 'farm_operational_requests' end;
 elsif p_resource='farm_inventory_transactions' and p_row->>'sale_id' is not null then target_resource:='farm_sales';
 elsif p_resource='farm_feed_stock_movements' then target_resource:=case when p_row->>'daily_feed_id' is not null then 'farm_daily_feed' when p_row->>'purchase_id' is not null then 'farm_feed_purchases' end;
 elsif p_resource='farm_livestock_events' and p_row->>'transaction_id' is not null then target_resource:='farm_inventory_transactions';end if;
 if target_resource is not null and target_resource not in ('farm_activity','farm_correction_requests','farm_operation_events') and exists(select 1 from operations_private.resources() where resource=target_resource and business='farm') then
  execute format('select to_jsonb(t) from public.%I t where id=$1',target_resource) into related using coalesce(nullif(p_row->>'record_id',''),nullif(p_row->>'sale_id',''),nullif(p_row->>'daily_feed_id',''),nullif(p_row->>'purchase_id',''),nullif(p_row->>'transaction_id',''))::uuid;
  return operations_private.export_owned(p_target,target_resource,related);
 end if;
 if p_resource='farm_inventory_transactions' and p_row->>'correction_of' is not null then
  select to_jsonb(t) into related from farm_inventory_transactions t where id=(p_row->>'correction_of')::uuid;
  return related->>'created_by'=p_target::text or exists(select 1 from manager_record_links l join manager_periods m on m.id=l.period_id where l.resource=p_resource and l.record_id=(related->>'id')::uuid and m.manager_id=p_target);
 end if;return false;
end $$;
create function operations_private.export_row(p_actor uuid,p_resource text,p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;entry record;
begin
 result:=case when exists(select 1 from operations_private.resources() where resource=p_resource) then operations_private.row_payload(p_actor,p_resource,p_row,null) else p_row end;
 for entry in select key,value from jsonb_each(result) where jsonb_typeof(value) in ('number','object','array') loop result:=jsonb_set(result,array[entry.key],to_jsonb(entry.value::text));end loop;
 return result||jsonb_build_object('_source_json',p_row::text);
end $$;
create function public.manager_legacy_export_snapshot(p_actor uuid,p_target uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare person profiles;actor profiles;r record;rows jsonb;sheets jsonb:='[]';records jsonb:='{}';name text;summary jsonb;totals record;
begin
 select * into actor from profiles where id=p_actor and not suspended;select * into person from profiles where id=p_target and role='manager';
 if actor.id is null or person.id is null or p_target not in ('ca7d7137-72dc-4cbc-848d-beb56d951344'::uuid,'a1e4ad6e-a565-4330-ae4c-3a0bc92081d1'::uuid) or not(actor.role='admin' or actor.role='manager' and actor.id=p_target) then raise exception using errcode='42501',message='Historical export is limited to the two authorised manager accounts';end if;
 for r in select * from operations_private.resources() where business='farm' loop
  execute format('select coalesce(jsonb_agg(operations_private.export_row($1,$2,to_jsonb(t)) order by t.id),''[]''::jsonb) from public.%I t where operations_private.export_owned($3,$2,to_jsonb(t))',r.resource) into rows using p_actor,r.resource,p_target;
  name:=case r.resource when 'farm_sales' then 'Sales' when 'farm_expenses' then 'Expenses' when 'farm_feed_purchases' then 'Feed purchases' when 'farm_fund_transfers' then 'Owner transfers' when 'farm_activity' then 'Activity history' else initcap(replace(replace(r.resource,'farm_',''),'_',' ')) end;
  sheets:=sheets||jsonb_build_array(jsonb_build_object('name',name,'rows',rows));records:=records||jsonb_build_object(r.resource,rows);
 end loop;
 for r in select value resource from unnest(array['manager_periods','manager_period_events','manager_period_days','manager_asset_assignments','manager_handover_sessions','manager_handover_items','operations_cash_accounts','operations_cash_events','operations_cash_postings','manager_pending_expenses','manager_pending_decisions','manager_write_receipts','farm_write_receipts','farm_operation_receipts']) value loop
  if r.resource='manager_periods' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,'manager_periods',to_jsonb(t)) order by t.created_at,t.id),'[]'::jsonb) into rows from manager_periods t where t.manager_id=p_target;
  elsif r.resource='manager_handover_items' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,r.resource,to_jsonb(t)) order by t.id),'[]'::jsonb) into rows from manager_handover_items t join manager_handover_sessions s on s.id=t.session_id join manager_periods m on m.id=s.period_id where m.manager_id=p_target;
  elsif r.resource='operations_cash_accounts' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,r.resource,to_jsonb(t)) order by t.id),'[]'::jsonb) into rows from operations_cash_accounts t join manager_periods m on m.id=t.period_id where m.manager_id=p_target;
  elsif r.resource='operations_cash_events' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,r.resource,to_jsonb(t)) order by t.id),'[]'::jsonb) into rows from operations_cash_events t where t.period_id in(select id from manager_periods where manager_id=p_target) or t.source_account_id in(select id from operations_cash_accounts where period_id in(select id from manager_periods where manager_id=p_target)) or t.target_account_id in(select id from operations_cash_accounts where period_id in(select id from manager_periods where manager_id=p_target));
  elsif r.resource='operations_cash_postings' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,r.resource,to_jsonb(t)) order by t.id),'[]'::jsonb) into rows from operations_cash_postings t where t.event_id in(select (value->>'id')::uuid from jsonb_array_elements(records->'operations_cash_events'));
  elsif r.resource='manager_pending_decisions' then
   select coalesce(jsonb_agg(operations_private.export_row(p_actor,r.resource,to_jsonb(t)) order by t.id),'[]'::jsonb) into rows from manager_pending_decisions t join manager_pending_expenses e on e.id=t.pending_id join manager_periods m on m.id=e.period_id where m.manager_id=p_target;
  elsif r.resource in ('farm_write_receipts','farm_operation_receipts') then
   execute format('select coalesce(jsonb_agg(operations_private.export_row($1,$2,to_jsonb(t)) order by t.request_id),''[]''::jsonb) from %I t where t.actor_id=$3',r.resource) into rows using p_actor,r.resource,p_target;
  else
   execute format('select coalesce(jsonb_agg(operations_private.export_row($1,$2,to_jsonb(t)) order by to_jsonb(t)::text),''[]''::jsonb) from %I t where t.period_id in(select id from manager_periods where manager_id=$3)',r.resource) into rows using p_actor,r.resource,p_target;
  end if;
  name:=case r.resource when 'operations_cash_accounts' then 'Cash accounts' when 'operations_cash_events' then 'Cash events' when 'operations_cash_postings' then 'Cash postings' when 'manager_pending_decisions' then 'Funding decisions' when 'manager_write_receipts' then 'Cash retry receipts' when 'farm_write_receipts' then 'Farm retry receipts' when 'farm_operation_receipts' then 'Report retry receipts' else initcap(replace(replace(r.resource,'manager_',''),'_',' ')) end;
  sheets:=sheets||jsonb_build_array(jsonb_build_object('name',name,'rows',rows));records:=records||jsonb_build_object(r.resource,rows);
 end loop;
 summary:=jsonb_build_object('Known personal opening cash',null);
 for r in select * from (values('farm_sales','Active sales','total_amount'),('farm_expenses','General expenses','amount'),('farm_feed_purchases','Feed purchases','cost'),('farm_fund_transfers','Owner transfer records','amount')) x(resource,label,amount_column) loop
  select coalesce(sum((value->>r.amount_column)::numeric),0)::text amount,count(*) entries into totals from jsonb_array_elements(records->r.resource) where value->>'voided_at' is null;
  summary:=summary||jsonb_build_object(r.label||' · NGN',totals.amount,r.label||' entries',totals.entries);
 end loop;
 return jsonb_build_object('target',jsonb_build_object('id',person.id,'name',person.name),'asOf',now(),'sheets',sheets,'summary',summary,'attributionNotes',jsonb_build_array('Only recorded attribution and explicit responsibility links prove ownership. Shared stock is not a personal opening quantity.','Recording or responsibility for a transaction is not proof that its recorder paid or received the cash.','Older Bimbo-entered transfers without a manager recipient remain unallocated. They cannot establish this person''s opening cash or debt.','All periods of this eligible account are included. Voids remain in detail and are excluded from active summary totals. Raw original JSON and exact numeric text preserve stored values.'));
end $$;
revoke all on function manager_legacy_export_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function manager_legacy_export_snapshot(uuid,uuid) to service_role;
revoke all on all functions in schema operations_private from public,anon,authenticated,service_role;
commit;
