begin;

-- Original reports and messages stay in place. Only an explicit completion adds a row.
create table public.farm_log_followup_completions (
  message_id uuid primary key references public.farm_record_messages(id),
  completed_by uuid not null references public.profiles(id),
  period_id uuid not null references public.manager_periods(id),
  completed_at timestamptz not null default clock_timestamp()
);
alter table public.farm_log_followup_completions enable row level security;
revoke all on public.farm_log_followup_completions from public, anon, authenticated, service_role;
create trigger farm_log_completion_immutable before update or delete on public.farm_log_followup_completions
  for each row execute function public.farm_activity_immutable();

-- A linked report always belongs to its recorded period, including MD-entered corrections.
-- For older unlinked reports, only an identified author still in their own legacy period qualifies.
create view operations_private.farm_log_followup_messages as
select m.id as message_id, m.resource, m.record_id, m.body, m.created_at,
       coalesce(d.report_date, b.date) as report_date, d.sections->>'area' as area,
       batch.id as batch_id, batch.name as batch_name,
       coalesce(link.period_id, legacy.id) as recipient_period_id,
       completion.completed_at
from public.farm_record_messages m
join public.profiles author on author.id = m.actor_id
left join public.farm_daily_reports d on m.resource = 'farm_daily_reports' and d.id = m.record_id
left join public.farm_batch_records b on m.resource = 'farm_batch_records' and b.id = m.record_id
left join public.farm_batches batch on batch.id = b.batch_id
left join public.manager_record_links link on link.resource = m.resource and link.record_id = m.record_id
left join public.manager_periods legacy on link.period_id is null and legacy.mode = 'legacy'
  and legacy.business = 'farm' and legacy.ended_at is null
  and legacy.manager_id = coalesce(d.manager_id, b.actor_id)
  and (b.period_id is null or b.period_id = legacy.id)
left join public.farm_log_followup_completions completion on completion.message_id = m.id
where m.resource in ('farm_daily_reports', 'farm_batch_records')
  and (d.id is not null or b.id is not null)
  and (author.role = 'admin' or completion.message_id is not null);
revoke all on operations_private.farm_log_followup_messages from public, anon, authenticated, service_role;

create function operations_private.farm_log_active_period(p_actor uuid) returns uuid
language sql stable set search_path = public, pg_temp as $$
  select p.id
  from public.manager_periods p join public.profiles a on a.id = p.manager_id
  where p.manager_id = p_actor and a.role = 'manager' and not a.suspended
    and p.business = 'farm' and p.status = 'active' and p.ended_at is null
    and (p.mode = 'legacy' or (p.starts_on <= (now() at time zone 'Africa/Lagos')::date
         and exists (select 1 from public.operations_release_state where activated_at is not null)));
$$;
revoke all on function operations_private.farm_log_active_period(uuid) from public, anon, authenticated, service_role;

create function public.farm_log_followups_read(p_actor uuid, p_period uuid default null, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare active_period uuid := operations_private.farm_log_active_period(p_actor);
begin
  if active_period is null or (p_period is not null and p_period <> active_period) then
    raise exception using errcode = '42501', message = 'An active Farm supervisor account is required';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'Choose a valid page';
  end if;

  return (
    with pending as materialized (
      select message_id, record_id, resource, body, created_at, report_date, area, batch_name, batch_id
      from operations_private.farm_log_followup_messages
      where recipient_period_id = active_period and completed_at is null
    ), page as (
      select * from pending order by created_at desc, message_id desc limit 20 offset p_offset
    )
    select jsonb_build_object('total', (select count(*) from pending),
      'items', coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc, message_id desc) from page), '[]'::jsonb))
  );
end $$;

create function public.farm_log_followup_complete(p_actor uuid, p_message uuid, p_request uuid, p_period uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  active_period uuid;
  instruction operations_private.farm_log_followup_messages%rowtype;
  context jsonb;
  fingerprint text;
  receipt public.manager_write_receipts%rowtype;
  result jsonb;
  done_at timestamptz;
begin
  if p_message is null or p_request is null then
    raise exception using errcode = '22023', message = 'Choose a follow-up and provide its retry identifier';
  end if;
  -- Share the period-change and retry locks used by other manager actions.
  fingerprint := encode(sha256(convert_to('farm_log_followup_complete:' || p_message::text, 'UTF8')), 'hex');
  context := operations_private.prepare_write(p_actor, 'farm', '{}'::jsonb, p_request, fingerprint, p_period);
  active_period := operations_private.farm_log_active_period(p_actor);
  if active_period is null or (p_period is not null and p_period <> active_period) then
    raise exception using errcode = '42501', message = 'An active Farm supervisor account is required';
  end if;
  select * into instruction from operations_private.farm_log_followup_messages
    where message_id = p_message and recipient_period_id = active_period;
  if not found then
    raise exception using errcode = '42501', message = 'This follow-up is unavailable for your account';
  end if;

  select * into receipt from public.manager_write_receipts where actor_id = p_actor and request_id = p_request;
  if found then
    if receipt.fingerprint <> fingerprint or receipt.business <> 'farm'
       or (receipt.period_id is not null and receipt.period_id <> active_period) then
      raise exception using errcode = '23514', message = 'This retry belongs to another entry';
    end if;
    return receipt.result;
  end if;

  insert into public.farm_log_followup_completions(message_id, completed_by, period_id)
    values (p_message, p_actor, active_period) on conflict (message_id) do nothing;
  select completed_at into strict done_at from public.farm_log_followup_completions where message_id = p_message;
  result := jsonb_build_object('message_id', p_message, 'record_id', instruction.record_id,
    'resource', instruction.resource, 'completed_at', done_at);
  insert into public.manager_write_receipts(actor_id, request_id, business, period_id, fingerprint, result)
    values (p_actor, p_request, 'farm', (context->>'periodId')::uuid, fingerprint, result);
  return result;
end $$;

create or replace function public.farm_record_messages_read(p_actor uuid, p_resource text, p_record uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare active_period uuid;
begin
  perform operations_private.farm_thread_source(p_actor, p_resource, p_record);
  if p_resource in ('farm_daily_reports', 'farm_batch_records') then
    active_period := operations_private.farm_log_active_period(p_actor);
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'is_followup', f.completed_at is not null or coalesce(
          f.recipient_period_id = operations_private.farm_log_active_period(recipient.manager_id), false),
        'completed_at', f.completed_at,
        'can_complete', coalesce(f.recipient_period_id = active_period and f.completed_at is null, false))
      order by m.created_at, m.id), '[]'::jsonb)
    from public.farm_record_messages m
    left join operations_private.farm_log_followup_messages f on f.message_id = m.id
    left join public.manager_periods recipient on recipient.id = f.recipient_period_id
    where m.resource = p_resource and m.record_id = p_record);
end $$;

revoke all on function public.farm_log_followups_read(uuid,uuid,int),
  public.farm_log_followup_complete(uuid,uuid,uuid,uuid), public.farm_record_messages_read(uuid,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.farm_log_followups_read(uuid,uuid,int),
  public.farm_log_followup_complete(uuid,uuid,uuid,uuid), public.farm_record_messages_read(uuid,text,uuid)
  to service_role;
notify pgrst, 'reload schema';
commit;
