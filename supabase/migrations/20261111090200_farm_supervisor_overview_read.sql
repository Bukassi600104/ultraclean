-- Read the existing, permission-scoped sources in one PostgreSQL snapshot.
create function public.farm_supervisor_overview_read(p_actor uuid, p_period uuid, p_today date)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'report', manager_report_snapshot(p_actor, 'farm', p_period, p_today - extract(dow from p_today)::integer, p_today),
    'stores', farm_store_read(p_actor, p_period, p_today),
    'credit', farm_credit_read(p_actor, p_period, p_today),
    'purchases', farm_purchase_read(p_actor, p_period),
    'health', farm_health_read(p_actor, p_period, p_today),
    'currentPerformance', farm_performance_read(p_actor, p_period, p_today - 1, p_today)
  );
$$;
revoke all on function public.farm_supervisor_overview_read(uuid,uuid,date) from public, anon, authenticated;
grant execute on function public.farm_supervisor_overview_read(uuid,uuid,date) to service_role;
