-- Run only after compatible application verification and guarded activation.
-- Remove only the exact temporary release guard; preserve every business trigger/row.
begin;
set local lock_timeout='5s';
do $$ declare t record;begin
 for t in select c.relname from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and g.tgname='bossbimbz_release_pause' order by c.relname loop
  execute format('drop trigger bossbimbz_release_pause on public.%I',t.relname);
 end loop;
end $$;
drop function public.bossbimbz_release_pause_guard();
commit;
