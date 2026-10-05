-- Dedicated content domain; social secrets are externally encrypted before storage.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.content_records(id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 1 and 300),platform text not null check(platform in ('instagram','facebook','tiktok')),content_type text not null check(length(trim(content_type)) between 1 and 100),status text not null default 'draft' check(status in ('draft','scheduled','published','archived')),published_at timestamptz,scheduled_at timestamptz,url text check(length(url)<=2000 and url ~ '^https?://[^[:space:]]+$'),notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,check(status<>'published' or published_at is not null),check(status<>'scheduled' or scheduled_at is not null));
create table public.content_performance(id uuid primary key default gen_random_uuid(),content_id uuid references content_records(id),platform text not null check(platform in ('instagram','facebook','tiktok')),account_id text not null default '' check(length(account_id)<=200),metric_date date not null,followers bigint check(followers>=0),reach bigint check(reach>=0),impressions bigint check(impressions>=0),engagements bigint check(engagements>=0),source text not null default 'manual' check(source in ('manual','official')),notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,check(followers is not null or reach is not null or impressions is not null or engagements is not null));
create unique index content_account_snapshot on content_performance(platform,account_id,metric_date) where content_id is null;
create unique index content_record_snapshot on content_performance(content_id,metric_date) where content_id is not null;
create table public.content_leads(id uuid primary key default gen_random_uuid(),content_id uuid references content_records(id),platform text not null check(platform in ('instagram','facebook','tiktok')),name text not null check(length(trim(name)) between 1 and 200),contact text check(length(contact)<=500),status text not null default 'new' check(status in ('new','contacted','converted','closed')),lead_date date not null,notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0);
create table public.content_sales(id uuid primary key default gen_random_uuid(),content_id uuid references content_records(id),lead_id uuid references content_leads(id),sale_type text not null check(sale_type in ('mentorship','affiliate')),amount numeric(16,2) not null check(amount>0),currency text not null check(currency ~ '^[A-Z]{3}$'),sale_date date not null,customer_name text check(length(customer_name)<=200),notes text check(length(notes)<=3000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0);
create table public.content_social_integrations(id uuid primary key default gen_random_uuid(),platform text not null unique check(platform in ('instagram','facebook','tiktok')),account_id text check(length(account_id)<=200),account_name text check(length(account_name)<=300),status text not null default 'disconnected' check(status in ('disconnected','connected','error')),authorized_by uuid references profiles(id),authorized_at timestamptz,last_sync_at timestamptz,last_error text check(length(last_error)<=2000),created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0,check(status<>'connected' or (account_id is not null and authorized_by is not null and authorized_at is not null)));
create table public.content_social_tokens(id uuid primary key default gen_random_uuid(),integration_id uuid not null unique references content_social_integrations(id),ciphertext text not null check(length(ciphertext) between 30 and 20000),expires_at timestamptz,created_by uuid not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 0);
create table public.content_audit(id uuid primary key default gen_random_uuid(),record_type text not null,record_id uuid not null,operation text not null,actor_id uuid not null references profiles(id),before_value jsonb,after_value jsonb,reason text,happened_at timestamptz not null default now());
create table public.content_write_receipts(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id));
create index content_publication_history on content_records(platform,status,published_at desc);
create index content_lead_history on content_leads(lead_date desc,status);
create index content_sales_history on content_sales(sale_date desc,sale_type);
create index content_audit_history on content_audit(record_type,record_id,happened_at desc);
create trigger content_audit_immutable before update or delete on content_audit for each row execute function farm_activity_immutable();

create function public.content_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_table text; v_cols text; v_sets text; v_allowed text[]; v_key text; v_before jsonb; v_data jsonb; v_result jsonb; v_receipt record; v_fp text; v_parent text;
begin
 select role into v_role from profiles where id=p_actor and not suspended;
 if v_role is null or v_role not in ('admin','content_manager') then raise exception using errcode='42501',message='Active content role required'; end if;
 if p_kind in ('integration','token') and v_role<>'admin' then raise exception using errcode='42501',message='CEO social authorization required'; end if;
 if p_operation not in ('create','update') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>30000 then raise exception using errcode='22023',message='Invalid content operation'; end if;
 if p_operation='update' and nullif(trim(p_reason),'') is null then raise exception using errcode='22023',message='Change reason required'; end if;
 if length(coalesce(p_reason,''))>2000 then raise exception using errcode='22023',message='Reason too long'; end if;
 perform pg_advisory_xact_lock(hashtextextended('content-operations',0));
 if p_request_id is not null then
  v_fp:=md5(jsonb_build_array(p_kind,p_operation,p_payload,p_id,p_reason)::text);
  select * into v_receipt from content_write_receipts where actor_id=p_actor and request_id=p_request_id;
  if found then if v_receipt.fingerprint<>v_fp then raise exception using errcode='23514',message='Retry identifier reused'; end if; return v_receipt.result; end if;
 end if;
 v_table:=case p_kind when 'record' then 'content_records' when 'performance' then 'content_performance' when 'lead' then 'content_leads' when 'sale' then 'content_sales' when 'integration' then 'content_social_integrations' when 'token' then 'content_social_tokens' end;
 if v_table is null then raise exception using errcode='22023',message='Unsupported content record'; end if;
 select array_agg(column_name order by ordinal_position) into v_allowed from information_schema.columns where table_schema='public' and table_name=v_table and column_name not in ('id','created_by','created_at','updated_at','revision','authorized_by','authorized_at');
 for v_key in select jsonb_object_keys(p_payload) loop if v_key<>'expected_revision' and not v_key=any(v_allowed) then raise exception using errcode='22023',message='Unsupported content field'; end if; end loop;
 if p_operation='update' then
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table) into v_before using p_id;
  if v_before is null then raise exception using errcode='P0002',message='Content record not found'; end if;
  if p_payload->>'expected_revision' is null or (p_payload->>'expected_revision')!~'^[0-9]+$' then raise exception using errcode='22023',message='Revision required'; end if;
  if (p_payload->>'expected_revision')::integer<>(v_before->>'revision')::integer then raise exception using errcode='40001',message='Record changed; refresh'; end if;
 end if;
 v_data:=coalesce(v_before,'{}')||(p_payload-'expected_revision');
 if p_kind in ('performance','lead') and v_data->>'content_id' is not null then
  select platform into v_parent from content_records where id=(v_data->>'content_id')::uuid;
  if v_parent is null or v_parent is distinct from v_data->>'platform' then raise exception using errcode='23514',message='Platform must match content'; end if;
 end if;
 if p_kind='performance' and v_role<>'admin' and coalesce(v_data->>'source','manual')<>'manual' then raise exception using errcode='42501',message='Official metrics require CEO authorized sync'; end if;
 if p_kind='sale' and v_data->>'lead_id' is not null and v_data->>'content_id' is not null and not exists(select 1 from content_leads where id=(v_data->>'lead_id')::uuid and content_id=(v_data->>'content_id')::uuid) then raise exception using errcode='23514',message='Sale content must match lead'; end if;
 if p_kind='integration' then
  if v_before is not null and v_data->>'platform'<>v_before->>'platform' then raise exception using errcode='23514',message='Integration platform is fixed'; end if;
  if v_data->>'status'='connected' and (p_operation='create' or p_payload ? 'account_id' or v_before->>'status'<>'connected') then v_data:=v_data||jsonb_build_object('authorized_by',p_actor,'authorized_at',now()); end if;
 end if;
 if p_kind='token' then
  if v_before is not null and v_data->>'integration_id'<>v_before->>'integration_id' then raise exception using errcode='23514',message='Token integration is fixed'; end if;
  if not exists(select 1 from content_social_integrations where id=(v_data->>'integration_id')::uuid and authorized_by=p_actor and status='connected') then raise exception using errcode='42501',message='CEO-authorized integration required'; end if;
 end if;
 if p_operation='create' then
  select string_agg(format('%I',k),','),string_agg(format('r.%I',k),',') into v_cols,v_sets from jsonb_object_keys(v_data) k;
  execute format('insert into public.%I(%s,created_by) select %s,$2 from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',v_table,v_cols,v_sets,v_table,v_table) into v_result using v_data,p_actor;
 else
  if p_kind='integration' then v_allowed:=v_allowed||array['authorized_by','authorized_at']; end if;
  select string_agg(format('%1$I=r.%1$I',k),',') into v_sets from unnest(v_allowed) k;
  execute format('update public.%I t set %s,revision=t.revision+1,updated_at=now() from jsonb_populate_record(null::public.%I,$1) r where t.id=$2 returning to_jsonb(t)',v_table,v_sets,v_table) into v_result using v_data,p_id;
 end if;
 -- Never copy encrypted secrets into audit snapshots, receipts or API results.
 if p_kind='token' then v_before:=v_before-'ciphertext';v_result:=v_result-'ciphertext'; end if;
 insert into content_audit(record_type,record_id,operation,actor_id,before_value,after_value,reason) values(p_kind,(v_result->>'id')::uuid,p_operation,p_actor,v_before,v_result,p_reason);
 if p_request_id is not null then insert into content_write_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,v_fp,v_result); end if;
 return v_result;
end $$;
create function public.content_social_token_read(p_actor uuid,p_integration_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Active CEO authorization required'; end if;
 select to_jsonb(t) into v_result from content_social_tokens t join content_social_integrations i on i.id=t.integration_id where i.id=p_integration_id and i.status='connected' and t.updated_at>=i.authorized_at and (t.expires_at is null or t.expires_at>now());
 return v_result;
end $$;
-- Reauthorization needs the existing revision even after secret reads are invalidated.
-- Only safe metadata is returned; this does not authorize a token read or extend expiry.
create function public.content_social_token_metadata(p_actor uuid,p_integration_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Active CEO authorization required'; end if;
 select jsonb_build_object('id',id,'revision',revision) into v_result from content_social_tokens where integration_id=p_integration_id;
 return v_result;
end $$;
revoke all on function public.content_write(uuid,text,text,jsonb,uuid,text,uuid),public.content_social_token_read(uuid,uuid),public.content_social_token_metadata(uuid,uuid) from public,anon,authenticated;
grant execute on function public.content_write(uuid,text,text,jsonb,uuid,text,uuid),public.content_social_token_read(uuid,uuid),public.content_social_token_metadata(uuid,uuid) to service_role;
do $$ declare t text; begin
 foreach t in array array['content_records','content_performance','content_leads','content_sales','content_social_integrations','content_social_tokens','content_audit','content_write_receipts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  if t<>'content_social_tokens' then execute format('grant select on public.%I to service_role',t); end if;
  if t not in ('content_social_tokens','content_write_receipts') then
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy %I on public.%I for select to authenticated using(public.operations_has_role(''content_manager''))',t||'_read',t);
  end if;
 end loop;
end $$;
commit;
