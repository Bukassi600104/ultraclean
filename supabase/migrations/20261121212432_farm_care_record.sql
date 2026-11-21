-- The care register is independent of the existing health schedule and observations.
-- Page one is virtual. Only explicit user actions append events.
begin;

create table operations_private.farm_care_record_events (
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  register_id uuid not null references public.manager_periods(id),
  operation text not null,
  page integer not null check (page > 0),
  row_number integer,
  revision integer,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, request_id),
  check (
    (operation = 'add_page' and page > 1 and row_number is null and revision is null)
    or (operation = 'save_row' and row_number is not null and row_number between 1 and 22
      and revision is not null and revision > 0)
    or (operation = 'save_review' and row_number is null and revision is not null and revision > 0)
  )
);

alter table operations_private.farm_care_record_events enable row level security;
revoke all on operations_private.farm_care_record_events from public, anon, authenticated, service_role;
create trigger care_record_immutable before update or delete or truncate
  on operations_private.farm_care_record_events
  for each statement execute function public.farm_activity_immutable();

create unique index farm_care_record_page
  on operations_private.farm_care_record_events (register_id, page) where operation = 'add_page';
create unique index farm_care_record_row_revision
  on operations_private.farm_care_record_events (register_id, page, row_number, revision desc)
  where operation = 'save_row';
create unique index farm_care_record_review_revision
  on operations_private.farm_care_record_events (register_id, page, revision desc)
  where operation = 'save_review';
create index farm_care_record_register on operations_private.farm_care_record_events (register_id);

create function public.farm_care_record_read(
  p_actor uuid, p_period uuid, p_register uuid, p_page integer
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  scope jsonb := public.manager_context(p_actor, 'farm', p_period);
  is_owner boolean := (select role = 'admin' from public.profiles where id = p_actor);
  scope_id uuid := coalesce(p_period, (scope->>'periodId')::uuid);
  today date := (now() at time zone 'Africa/Lagos')::date;
  available jsonb;
  selected uuid;
  writable boolean;
  total_pages integer;
  current_page integer;
  saved_rows jsonb;
  saved_review jsonb;
begin
  -- Legacy workspaces may suppress periodId in the context until activation.
  if scope_id is null and not is_owner then
    select p.id into scope_id from public.manager_periods p
    where p.manager_id = p_actor and p.business = 'farm' and p.ended_at is null;
  end if;

  with periods as (
    select p.*, coalesce(u.name, 'Farm Supervisor') as manager_name,
      (p.status = 'active' and p.ended_at is null and u.role = 'manager'
        and not coalesce(u.suspended, false)
        and (p.starts_on is null or p.starts_on <= today)) as active
    from public.manager_periods p
    join public.profiles u on u.id = p.manager_id
    where p.business = 'farm'
      and ((is_owner and scope_id is null) or p.id = scope_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'manager_name', p.manager_name, 'starts_on', p.starts_on,
    'ends_on', (p.ended_at at time zone 'Africa/Lagos')::date
  ) order by p.active desc, p.ended_at desc nulls last,
    p.starts_on desc nulls last, p.created_at desc, p.id desc), '[]'::jsonb)
  into available from periods p
  where not is_owner or p.active or exists (
    select 1 from operations_private.farm_care_record_events e where e.register_id = p.id
  );

  if p_register is not null and not available @> jsonb_build_array(jsonb_build_object('id', p_register)) then
    raise exception using errcode = '42501', message = 'Choose an available farm care record';
  end if;
  selected := coalesce(p_register, (available->0->>'id')::uuid);

  select p.status = 'active' and p.ended_at is null and u.role = 'manager'
    and not coalesce(u.suspended, false) and (p.starts_on is null or p.starts_on <= today)
    and not exists (
      select 1 from public.operations_release_state where activated_at is not null and not enabled
    )
  into writable from public.manager_periods p
  join public.profiles u on u.id = p.manager_id where p.id = selected;

  select coalesce(max(e.page), 1) into total_pages
  from operations_private.farm_care_record_events e
  where e.register_id = selected and e.operation = 'add_page';
  current_page := least(greatest(coalesce(p_page, 1), 1), total_pages);

  select coalesce(jsonb_agg(jsonb_build_object(
    'row_number', latest.row_number, 'activity', latest.payload->>'activity',
    'values', latest.payload->'values', 'revision', latest.revision
  ) order by latest.row_number), '[]'::jsonb)
  into saved_rows from (
    select distinct on (e.row_number) e.row_number, e.payload, e.revision
    from operations_private.farm_care_record_events e
    where e.register_id = selected and e.page = current_page and e.operation = 'save_row'
    order by e.row_number, e.revision desc
  ) latest;

  select jsonb_build_object('text', e.payload->>'text', 'revision', e.revision)
  into saved_review from operations_private.farm_care_record_events e
  where e.register_id = selected and e.page = current_page and e.operation = 'save_review'
  order by e.revision desc limit 1;

  return jsonb_build_object(
    'register_id', selected, 'can_write', coalesce(writable, false),
    'page', current_page, 'page_count', total_pages, 'registers', available,
    'rows', saved_rows, 'review', saved_review
  );
end;
$$;

create function public.farm_care_record_write(
  p_actor uuid, p_period uuid, p_register uuid, p_operation text, p_request uuid, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  starter_activities constant text[] := array[
    'Fowl pox booster', 'Salt bath and partial water change', 'Newcastle disease (LaSota) booster',
    'Deworming (ivermectin injection)', 'Deworming (piperazine in drinking water)',
    'Hoof trimming', 'Gumboro (IBD) vaccination, second dose', 'Iron dextran and vitamin check',
    'PPR vaccination', 'FMD vaccination', 'Debeaking (beak trimming)', 'Tick bath', 'Dehorning',
    'Crossing (mating)', 'Sorting and grading', 'Layer-house fumigation', 'Marek’s disease vaccination',
    'Ranikhet disease (Newcastle disease)', 'Infectious bronchitis vaccination', 'Fowl pox vaccination',
    'Infectious coryza', 'Fowl cholera'
  ];
  value_fields constant text[] := array[
    'animal_group', 'location', 'animal_tag', 'record_date', 'age', 'breed', 'markings',
    'diagnosis', 'treatment', 'date_received', 'duration', 'withdrawal', 'next_due', 'animal_status', 'notes'
  ];
  scope jsonb;
  is_owner boolean;
  target public.manager_periods%rowtype;
  stored operations_private.farm_care_record_events%rowtype;
  previous operations_private.farm_care_record_events%rowtype;
  today date := (now() at time zone 'Africa/Lagos')::date;
  total_pages integer;
  target_page integer;
  target_row integer;
  next_row integer;
  new_revision integer;
  activity_name text;
  row_values jsonb;
  field_name text;
  field_value text;
  field_date date;
  previous_period text;
begin
  if p_register is null or p_request is null or p_operation is null
    or p_operation not in ('add_page', 'save_row', 'save_review')
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Check the farm care record and try again';
  end if;

  -- Share the existing period lock so closure/activation and page or row allocation cannot race.
  perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning', 0));
  scope := public.manager_context(p_actor, 'farm', p_period);
  select role = 'admin' into is_owner from public.profiles where id = p_actor;
  select * into target from public.manager_periods
  where id = p_register and business = 'farm' for no key update;

  if target.id is null or (p_period is not null and p_period <> target.id)
    or (not is_owner and (target.manager_id <> p_actor
      or ((scope->>'periodId') is not null and (scope->>'periodId')::uuid <> target.id))) then
    raise exception using errcode = '42501', message = 'Choose an available farm care record';
  end if;

  select * into stored from operations_private.farm_care_record_events
  where actor_id = p_actor and request_id = p_request;
  if found then
    if stored.register_id <> p_register or stored.operation <> p_operation or stored.payload <> p_payload then
      raise exception using errcode = '23514', message = 'This request belongs to a different care entry';
    end if;
    return jsonb_strip_nulls(jsonb_build_object(
      'page', stored.page, 'row_number', stored.row_number, 'revision', stored.revision
    ));
  end if;

  if target.status <> 'active' or target.ended_at is not null or target.starts_on > today
    or not exists (select 1 from public.profiles where id = target.manager_id and role = 'manager' and not suspended) then
    raise exception using errcode = '42501', message = 'This farm care record is read only';
  end if;
  if exists (select 1 from public.operations_release_state where activated_at is not null and not enabled) then
    raise exception using errcode = '55000', message = 'Operations are briefly paused for the update';
  end if;

  select coalesce(max(e.page), 1) into total_pages
  from operations_private.farm_care_record_events e
  where e.register_id = p_register and e.operation = 'add_page';

  if p_operation = 'add_page' then
    if p_payload <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'Check the page request and try again';
    end if;
    target_page := total_pages + 1;
  else
    if jsonb_typeof(p_payload->'page') is distinct from 'number' or p_payload->>'page' !~ '^[1-9][0-9]{0,9}$'
      or jsonb_typeof(p_payload->'expected_revision') is distinct from 'number'
      or p_payload->>'expected_revision' !~ '^[0-9]{1,10}$' then
      raise exception using errcode = '22023', message = 'Check the page and revision and try again';
    end if;
    if (p_payload->>'page')::bigint > 2147483647 or (p_payload->>'expected_revision')::bigint > 2147483647 then
      raise exception using errcode = '22023', message = 'Check the page and revision and try again';
    end if;
    target_page := (p_payload->>'page')::integer;
    if target_page > total_pages then
      raise exception using errcode = '22023', message = 'Open or add the page before saving';
    end if;

    if p_operation = 'save_review' then
      if p_payload - array['page', 'text', 'expected_revision'] <> '{}'::jsonb
        or jsonb_typeof(p_payload->'text') is distinct from 'string'
        or p_payload->>'text' !~ '[^[:space:]]'
        or char_length(p_payload->>'text') > 4000 then
        raise exception using errcode = '22023', message = 'Enter a general review of up to 4,000 characters';
      end if;
      select * into previous from operations_private.farm_care_record_events e
      where e.register_id = p_register and e.page = target_page and e.operation = 'save_review'
      order by e.revision desc limit 1;
    else
      if p_payload - array['page', 'row_number', 'activity', 'values', 'expected_revision'] <> '{}'::jsonb
        or not p_payload ? 'row_number'
        or jsonb_typeof(p_payload->'activity') is distinct from 'string'
        or p_payload->>'activity' !~ '[^[:space:]]'
        or char_length(p_payload->>'activity') > 200
        or jsonb_typeof(p_payload->'values') is distinct from 'object' then
        raise exception using errcode = '22023', message = 'Enter a farm care activity and its details';
      end if;
      activity_name := p_payload->>'activity';
      row_values := p_payload->'values';
      if row_values = '{}'::jsonb or row_values - value_fields <> '{}'::jsonb
        or exists (
          select 1 from jsonb_each(row_values) entry
          where jsonb_typeof(entry.value) <> 'string'
            or entry.value #>> '{}' !~ '[^[:space:]]'
            or char_length(entry.value #>> '{}') > case
              when entry.key in ('diagnosis', 'treatment', 'notes') then 4000 else 200 end
        )
        or (row_values ? 'animal_status' and row_values->>'animal_status' not in ('dead', 'alive', 'sold')) then
        raise exception using errcode = '22023', message = 'Check the farm care details and animal status';
      end if;

      if jsonb_typeof(p_payload->'row_number') = 'number' and p_payload->>'row_number' ~ '^[0-9]{1,2}$' then
        target_row := (p_payload->>'row_number')::integer;
      elsif p_payload->'row_number' <> 'null'::jsonb then
        raise exception using errcode = '22023', message = 'Choose a valid farm care row';
      end if;

      if target_page = 1 then
        if target_row is null or target_row not between 1 and 22
          or activity_name is distinct from starter_activities[target_row] then
          raise exception using errcode = '22023', message = 'Keep the original page one activity and row number';
        end if;
      else
        select coalesce(max(e.row_number), 0) + 1 into next_row
        from operations_private.farm_care_record_events e
        where e.register_id = p_register and e.page = target_page and e.operation = 'save_row';
        target_row := coalesce(target_row, next_row);
        if target_row > 22 then
          raise exception using errcode = '23514', message = 'This page is full. Add another page';
        end if;
        if target_row < 1 or target_row > next_row then
          raise exception using errcode = '22023', message = 'Choose an existing row or append the next row';
        end if;
      end if;

      select * into previous from operations_private.farm_care_record_events e
      where e.register_id = p_register and e.page = target_page
        and e.operation = 'save_row' and e.row_number = target_row
      order by e.revision desc limit 1;
      if previous.revision is not null and activity_name is distinct from previous.payload->>'activity' then
        raise exception using errcode = '22023', message = 'Copy the row to record a different activity';
      end if;

      foreach field_name in array array['record_date', 'date_received', 'next_due'] loop
        field_value := row_values->>field_name;
        if field_value is null then continue; end if;
        if field_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          raise exception using errcode = '22023', message = 'Enter a valid date in the farm care row';
        end if;
        begin
          field_date := field_value::date;
        exception when datetime_field_overflow or invalid_datetime_format then
          raise exception using errcode = '22023', message = 'Enter a valid date in the farm care row';
        end;
        if field_name = 'record_date' and field_date > today then
          raise exception using errcode = '22023', message = 'Record date cannot be in the future';
        end if;
        if field_name = 'record_date' and field_date < target.starts_on then
          raise exception using errcode = '22023', message = 'Record date must be on or after the supervisor’s start date';
        end if;
      end loop;
    end if;

    if (p_payload->>'expected_revision')::integer <> coalesce(previous.revision, 0) then
      raise exception using errcode = '40001', message = 'This care entry changed. Open the latest version before saving';
    end if;
    new_revision := coalesce(previous.revision, 0) + 1;

    if p_operation = 'save_row' then
      -- A later revision cannot move an existing dated observation out of a closed day.
      previous_period := current_setting('operations.period', true);
      perform set_config('operations.period', p_register::text, true);
      field_value := nullif(previous.payload->'values'->>'record_date', '');
      if field_value is not null then
        perform public.farm_v2_lock_date(field_value::date, is_owner, null);
      end if;
      if nullif(row_values->>'record_date', '') is not null
        and (row_values->>'record_date') is distinct from field_value then
        perform public.farm_v2_lock_date((row_values->>'record_date')::date, is_owner, null);
      end if;
      perform set_config('operations.period', coalesce(previous_period, ''), true);
    end if;
  end if;

  insert into operations_private.farm_care_record_events (
    actor_id, request_id, register_id, operation, page, row_number, revision, payload
  ) values (
    p_actor, p_request, p_register, p_operation, target_page, target_row, new_revision, p_payload
  ) returning * into stored;

  return jsonb_strip_nulls(jsonb_build_object(
    'page', stored.page, 'row_number', stored.row_number, 'revision', stored.revision
  ));
end;
$$;

revoke all on function public.farm_care_record_read(uuid, uuid, uuid, integer),
  public.farm_care_record_write(uuid, uuid, uuid, text, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.farm_care_record_read(uuid, uuid, uuid, integer),
  public.farm_care_record_write(uuid, uuid, uuid, text, uuid, jsonb) to service_role;

commit;
