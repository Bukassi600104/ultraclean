-- Preconditions: migration 012 is committed; farm_v2_write is SECURITY DEFINER
-- owned by the farm tables' trusted owner. Every V2 API writes through that RPC.
-- Prevent old deployments using service-role REST writes from bypassing V2 rules.
-- No data, defaults, account permissions, read grants or history are changed.
-- Transactional grant changes only; no table rebuild or backfill.
-- Rollback: retain this boundary when reverting the application. Restoring direct
-- write grants would reopen legacy API bypasses; use a compatible V2 application.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $$
declare t text;
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='farm_v2_write' and p.prosecdef
      and pg_get_userbyid(p.proowner) <> 'service_role'
  ) then
    raise exception 'V2 trusted write routine missing; stop release.';
  end if;
  foreach t in array array['farm_sales','farm_expenses','farm_inventory','farm_inventory_transactions','farm_feed_purchases','farm_fund_transfers','farm_daily_records','farm_daily_feed','farm_supply_inventory','farm_supply_transactions','farm_activity','farm_correction_requests','farm_write_receipts'] loop
    execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from service_role',t);
    if has_table_privilege('service_role','public.'||t,'INSERT')
      or has_table_privilege('service_role','public.'||t,'UPDATE')
      or has_table_privilege('service_role','public.'||t,'DELETE') then
      raise exception 'Inherited direct write privilege remains on %; audit grants.',t;
    end if;
  end loop;
end $$;
commit;
