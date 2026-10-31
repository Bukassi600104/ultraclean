-- PROPOSAL ONLY. NOT A RELEASE MIGRATION. Do not execute against production.
-- Preconditions: paid password-hook capability approved; verified CEO recovery;
-- isolated concurrency/rollback rehearsal; reviewed gateway and grants.
-- Additive only: no auth.users, profiles, sessions or business rows are changed.
-- No historical backfill. Tables begin empty. Locks affect security subjects only.
-- Rollback: detach hook before removing routines; preserve audit; never ban users.
begin;
create schema if not exists login_security;
revoke all on schema login_security from public, anon, authenticated;
create table login_security.subject_state (
  subject text primary key,
  events timestamptz[] not null default '{}',
  escalations timestamptz[] not null default '{}',
  blocked_until timestamptz
);
create table login_security.audit (
  id bigint generated always as identity primary key,
  actor uuid not null,
  target uuid not null,
  action text not null check (action='staff_unlock'),
  reason text not null check(length(btrim(reason)) > 0),
  occurred_at timestamptz not null default clock_timestamp()
);
alter table login_security.subject_state enable row level security;
alter table login_security.audit enable row level security;
revoke all on all tables in schema login_security from public, anon, authenticated;

-- Hook owns actual-user failure counters, not the gateway. No duplicate counting.
create function login_security.password_verification(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k text := 'user:' || (event->>'user_id')::uuid::text;
  s login_security.subject_state;
  t timestamptz;
  duration integer;
begin
  if event->>'valid' is null or jsonb_typeof(event->'valid') <> 'boolean' then
    raise exception 'LOGIN_PROTECTION_UNAVAILABLE';
  end if;
  insert into login_security.subject_state(subject) values(k) on conflict do nothing;
  select * into strict s from login_security.subject_state where subject=k for update;
  t := clock_timestamp(); -- Read time AFTER waiting for the row lock.
  if s.blocked_until > t then
    return jsonb_build_object('decision','reject','message','Unable to sign in. Try again later.','should_logout_user',false);
  end if;
  select coalesce(array_agg(x), '{}') into s.escalations from unnest(s.escalations) x where x > t - interval '24 hours';
  select coalesce(array_agg(x), '{}') into s.events from unnest(s.events) x where x > t - interval '15 minutes';
  s.blocked_until := null;
  if (event->>'valid')::boolean then
    s.events := '{}';
  else
    s.events := array_append(s.events,t);
    if cardinality(s.events) >= 5 then
      duration := case cardinality(s.escalations) when 0 then 15 when 1 then 30 else 60 end;
      s.blocked_until := t + make_interval(mins => duration);
      s.escalations := array_append(s.escalations,t);
      s.events := '{}';
    end if;
  end if;
  update login_security.subject_state set events=s.events, escalations=s.escalations, blocked_until=s.blocked_until where subject=k;
  return jsonb_build_object('decision',case when s.blocked_until > t then 'reject' else 'continue' end,
    'message','Unable to sign in. Try again later.','should_logout_user',false);
end $$;
revoke all on function login_security.password_verification(jsonb) from public,anon,authenticated;
grant usage on schema login_security to supabase_auth_admin;
grant execute on function login_security.password_verification(jsonb) to supabase_auth_admin;

-- Atomic window primitive for gateway IP/recovery keys. Values are constrained
-- by a reviewed wrapper, never supplied by browsers. Use HMAC identifiers.
-- For recovery, consume account + IP together in one outer SQL transaction,
-- locking keys in sorted order; reject BOTH without consuming if either denies.
-- For IP failures call exactly once per completed invalid-password attempt;
-- gateway must deduplicate completion with a private attempt UUID table.
create function login_security.consume_window(k text, max_events integer, window_seconds integer, failure_block_seconds integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s login_security.subject_state; t timestamptz; until_at timestamptz;
begin
  if (max_events,window_seconds,failure_block_seconds) not in ((3,3600,0),(10,3600,0),(20,60,0),(50,900,900))
     or k is null or k !~ '^(recovery-account|recovery-ip|login-ip|failure-ip):[a-f0-9]{64}$'
     or split_part(k,':',1) <> (case max_events when 3 then 'recovery-account' when 10 then 'recovery-ip' when 20 then 'login-ip' else 'failure-ip' end) then
    raise exception 'LOGIN_PROTECTION_UNAVAILABLE';
  end if;
  insert into login_security.subject_state(subject) values(k) on conflict do nothing;
  select * into strict s from login_security.subject_state where subject=k for update;
  t := clock_timestamp();
  if s.blocked_until > t then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',ceil(extract(epoch from s.blocked_until-t)));
  end if;
  select coalesce(array_agg(x order by x),'{}') into s.events from unnest(s.events) x where x > t - make_interval(secs=>window_seconds);
  if cardinality(s.events)>=max_events and failure_block_seconds=0 then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',ceil(extract(epoch from s.events[1]+make_interval(secs=>window_seconds)-t)));
  end if;
  s.events:=array_append(s.events,t);
  if failure_block_seconds>0 and cardinality(s.events)>=max_events then
    until_at:=t+make_interval(secs=>failure_block_seconds);
    s.events:='{}';
  end if;
  update login_security.subject_state set events=s.events,blocked_until=until_at where subject=k;
  return jsonb_build_object('allowed',until_at is null,'retryAfterSeconds',coalesce(ceil(extract(epoch from until_at-t)),0));
end $$;
revoke all on function login_security.consume_window(text,integer,integer,integer) from public,anon,authenticated;
-- Both quotas are reserved together. The account key is used for all submitted
-- identifiers, including nonexistent accounts; no auth lookup is needed here.
create function login_security.reserve_recovery(account_hash text, ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a text := 'recovery-account:' || account_hash;
  i text := 'recovery-ip:' || ip_hash;
  s login_security.subject_state;
  t timestamptz;
  cap integer;
  retry numeric := 0;
begin
  if account_hash is null or ip_hash is null or account_hash !~ '^[a-f0-9]{64}$' or ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'LOGIN_PROTECTION_UNAVAILABLE';
  end if;
  insert into login_security.subject_state(subject) values(a),(i) on conflict do nothing;
  perform subject from login_security.subject_state where subject in(a,i) order by subject for update;
  t := clock_timestamp();
  for s in select * from login_security.subject_state where subject in(a,i) order by subject loop
    cap := case when s.subject=a then 3 else 10 end;
    select coalesce(array_agg(x order by x),'{}') into s.events from unnest(s.events) x where x > t - interval '1 hour';
    if cardinality(s.events)>=cap then
      retry := greatest(retry,ceil(extract(epoch from s.events[1]+interval '1 hour'-t)));
    end if;
  end loop;
  if retry > 0 then return jsonb_build_object('allowed',false,'retryAfterSeconds',retry); end if;
  update login_security.subject_state set events =
    array_append(array(select x from unnest(events) x where x > t-interval '1 hour' order by x),t)
    where subject in(a,i);
  return jsonb_build_object('allowed',true,'retryAfterSeconds',0);
end $$;
revoke all on function login_security.reserve_recovery(text,text) from public,anon,authenticated;
-- Deliberately NO service_role execute/schema grant and NO activation config.
-- Privileged gateway wrappers, attempt receipt
-- deduplication and audited reauth-bound unlock MUST be implemented/reviewed
-- before this proposal can become a deployable migration.
rollback; -- Intentional safety: proposal remains nonpersistent even if rehearsed.
