-- Manual coordinated release step only, after explicit production approval.
-- Blocks Farm writes, including stale clients; reads and original values remain intact.
begin;
set local lock_timeout='5s';
create function public.bossbimbz_release_pause_guard() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 raise exception using errcode='55000',message='Farm writes are briefly paused for the production update. Keep your entry and retry shortly.';
end $$;
revoke all on function public.bossbimbz_release_pause_guard() from public,anon,authenticated,service_role;
do $$ declare t record;begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'farm\_%' escape '\' order by tablename loop
  execute format('create trigger bossbimbz_release_pause before insert or update or delete on public.%I for each row execute function public.bossbimbz_release_pause_guard()',t.tablename);
 end loop;
end $$;
commit;
