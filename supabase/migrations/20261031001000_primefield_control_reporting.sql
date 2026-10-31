-- Preconditions: Pulse phases 1-7 and manager snapshot contracts exist.
-- Additive report preferences only; no backfill, financial rewrite or legacy attribution.
-- Preferences retain every version. Brief DDL locks; abort rather than wait on live writes.
-- Rollback keeps preferences/history and the additive source tables; no down migration.
begin;
set local lock_timeout='5s';
create table farm_reporting_settings(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references profiles(id),request_id uuid not null,
 timezone text not null,mortality_alert_count integer check(mortality_alert_count>0),feed_alert_days numeric check(feed_alert_days>0),
 display_currency text,exchange_rate numeric check(exchange_rate>0),rate_date date,rate_valid_until date,rate_source text,
 reason text not null check(length(trim(reason)) between 1 and 2000),created_at timestamptz not null default now(),
 unique(actor_id,request_id),check(display_currency is null or (display_currency ~ '^[A-Z]{3}$' and exchange_rate is not null and rate_date is not null and rate_valid_until is not null and rate_valid_until>=rate_date and rate_source is not null and length(trim(rate_source))>0))
);
alter table farm_reporting_settings enable row level security;
revoke all on farm_reporting_settings from public,anon,authenticated,service_role;
grant select on farm_reporting_settings to service_role;
create trigger reporting_settings_immutable before update or delete on farm_reporting_settings for each row execute function farm_activity_immutable();
create function farm_reporting_config_write(p_actor uuid,p_payload jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result farm_reporting_settings;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('timezone','mortality_alert_count','feed_alert_days','display_currency','exchange_rate','rate_date','rate_valid_until','rate_source','reason')) or not exists(select 1 from pg_timezone_names where name=p_payload->>'timezone') then raise exception using errcode='22023',message='Use valid reporting preferences and timezone';end if;
 perform pg_advisory_xact_lock(hashtextextended('farm-report-preferences',0));
 select * into result from farm_reporting_settings where actor_id=p_actor and request_id=p_request;
 if found then
 if (to_jsonb(result)-array['id','actor_id','request_id','created_at']) is distinct from jsonb_build_object('timezone',p_payload->>'timezone','mortality_alert_count',(p_payload->>'mortality_alert_count')::integer,'feed_alert_days',(p_payload->>'feed_alert_days')::numeric,'display_currency',p_payload->>'display_currency','exchange_rate',(p_payload->>'exchange_rate')::numeric,'rate_date',(p_payload->>'rate_date')::date,'rate_valid_until',(p_payload->>'rate_valid_until')::date,'rate_source',p_payload->>'rate_source','reason',p_payload->>'reason') then raise exception using errcode='23514',message='Retry belongs to other preferences';end if;return to_jsonb(result);end if;
 insert into farm_reporting_settings(actor_id,request_id,timezone,mortality_alert_count,feed_alert_days,display_currency,exchange_rate,rate_date,rate_valid_until,rate_source,reason)
 values(p_actor,p_request,p_payload->>'timezone',(p_payload->>'mortality_alert_count')::integer,(p_payload->>'feed_alert_days')::numeric,p_payload->>'display_currency',(p_payload->>'exchange_rate')::numeric,(p_payload->>'rate_date')::date,(p_payload->>'rate_valid_until')::date,p_payload->>'rate_source',p_payload->>'reason') returning * into result;
 return to_jsonb(result);
end $$;
-- CEO period filters must narrow customer reads without weakening write authorization.
create function operations_private.customer_in_scope(p_actor uuid,p_customer uuid,p_period uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select operations_private.customer_allowed(p_actor,p_customer,p_period) and (p_period is null or exists(select 1 from farm_customers where id=p_customer and period_id=p_period) or exists(select 1 from farm_customer_assignments where customer_id=p_customer and period_id=p_period))
$$;
do $$ declare d text;begin
 d:=pg_get_functiondef('farm_credit_read(uuid,uuid,date)'::regprocedure);
 if position('operations_private.customer_allowed' in d)=0 then raise exception 'Credit read precondition changed';end if;
 execute replace(d,'operations_private.customer_allowed','operations_private.customer_in_scope');
end $$;
create function farm_control_read(p_actor uuid,p_period uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare report jsonb;children jsonb;child record;today date:=(now() at time zone 'Africa/Lagos')::date;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 if p_from is null or p_to is null or p_from>p_to then raise exception using errcode='22023',message='Choose a valid reporting period';end if;
 report:=manager_report_snapshot(p_actor,'farm',p_period,p_from,p_to);
 select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('_source_json',row_to_json(l)::text,'unit_price_exact',l.unit_price::text)),'[]') into children from farm_purchase_lines l where exists(select 1 from jsonb_array_elements(report->'records'->'farm_purchases') p where p->>'id'=l.purchase_id::text);
 report:=jsonb_set(report,'{records,farm_purchase_lines}',children);
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('_source_json',row_to_json(a)::text,'amount_exact',a.amount::text)),'[]') into children from farm_receipt_allocations a where exists(select 1 from jsonb_array_elements(report->'records'->'farm_customer_receipts') r where r->>'id'=a.receipt_id::text);
 report:=jsonb_set(report,'{records,farm_receipt_allocations}',children);
 select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('_source_json',row_to_json(x)::text,'amount_exact',x.amount::text)),'[]') into children from farm_allocation_releases x join farm_receipt_allocations a on a.id=x.allocation_id where exists(select 1 from jsonb_array_elements(report->'records'->'farm_customer_receipts') r where r->>'id'=a.receipt_id::text);
 report:=jsonb_set(report,'{records,farm_allocation_releases}',children);
 for child in select * from (values ('farm_customer_terms','customer_id','farm_customers'),('farm_customer_assignments','customer_id','farm_customers'),('farm_stock_count_decisions','count_id','farm_stock_counts')) t(tab,col,parent) loop
 execute format('select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object(''_source_json'',row_to_json(t)::text)),''[]''::jsonb) from %I t where exists(select 1 from jsonb_array_elements($1) p where p->>''id''=t.%I::text)',child.tab,child.col) into children using coalesce(report->'records'->child.parent,'[]'::jsonb);
 report:=jsonb_set(report,array['records',child.tab],children);
 end loop;
 return jsonb_build_object('report',report,'asOf',now(),'today',today,
 'config',(select to_jsonb(s)||jsonb_build_object('exchange_rate',s.exchange_rate::text) from farm_reporting_settings s order by created_at desc,id desc limit 1),
 'credit',farm_credit_read(p_actor,p_period,p_to),'currentCredit',farm_credit_read(p_actor,p_period,today),
 'health',farm_health_read(p_actor,p_period,today),'stores',farm_store_read(p_actor,p_period,today),'purchases',farm_purchase_read(p_actor,p_period),
 'currentPerformance',farm_performance_read(p_actor,p_period,today-1,today),
 'performance',farm_performance_read(p_actor,p_period,p_from,p_to));
end $$;
revoke all on function operations_private.customer_in_scope(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_control_read(uuid,uuid,date,date),farm_reporting_config_write(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function farm_control_read(uuid,uuid,date,date),farm_reporting_config_write(uuid,jsonb,uuid) to service_role;
create table farm_summary_settings(id uuid primary key default gen_random_uuid(),actor_id uuid not null references profiles(id),channel text not null check(channel in ('email','whatsapp')),enabled boolean not null default false,recipient text not null,sender text not null,timezone text not null,delivery_time time not null,reason text not null check(length(trim(reason)) between 1 and 2000),created_at timestamptz not null default now());
create table farm_summary_deliveries(id uuid primary key default gen_random_uuid(),setting_id uuid not null references farm_summary_settings(id),channel text not null,recipient text not null,report_date date not null,summary text not null,status text not null check(status in ('sending','sent','failed','unknown')),attempts integer not null default 1,claim_id uuid not null,claimed_at timestamptz not null default now(),provider_id text,error text,created_at timestamptz not null default now(),unique(channel,recipient,report_date));
alter table farm_summary_settings enable row level security;alter table farm_summary_deliveries enable row level security;
revoke all on farm_summary_settings,farm_summary_deliveries from public,anon,authenticated,service_role;
grant select on farm_summary_settings,farm_summary_deliveries to service_role;
create trigger summary_settings_immutable before update or delete on farm_summary_settings for each row execute function farm_activity_immutable();
create function farm_summary_configure(p_actor uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result farm_summary_settings;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 if not exists(select 1 from pg_timezone_names where name=p_payload->>'timezone') or length(trim(p_payload->>'recipient')) not between 3 and 320 or length(trim(p_payload->>'sender')) not between 3 and 320 then raise exception using errcode='22023',message='Valid sender, recipient and timezone required';end if;
 perform pg_advisory_xact_lock(hashtextextended('farm-summary-settings',0));
 insert into farm_summary_settings(actor_id,channel,enabled,recipient,sender,timezone,delivery_time,reason) values(p_actor,p_payload->>'channel',(p_payload->>'enabled')::boolean,p_payload->>'recipient',p_payload->>'sender',p_payload->>'timezone',(p_payload->>'delivery_time')::time,p_payload->>'reason') returning * into result;
 return to_jsonb(result);
end $$;
create function farm_summary_claim(p_setting uuid,p_date date,p_summary text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s farm_summary_settings;j farm_summary_deliveries;
begin
 perform pg_advisory_xact_lock(hashtextextended('farm-summary-delivery',0));
 select * into s from farm_summary_settings where id=p_setting;
 if s.id is null or not s.enabled or not exists(select 1 from profiles where id=s.actor_id and role='admin' and not suspended) or s.id<>(select id from farm_summary_settings where actor_id=s.actor_id and channel=s.channel order by created_at desc,id desc limit 1) or (now() at time zone s.timezone)::time<s.delivery_time or p_date is distinct from (now() at time zone 'Africa/Lagos')::date-1 then return null;end if;
 if length(p_summary) not between 1 and 30000 then raise exception using errcode='22023',message='Summary must be complete and within delivery limits';end if;
 select * into j from farm_summary_deliveries where channel=s.channel and recipient=s.recipient and report_date=p_date for update;
 if found then
 if j.status='sending' and j.claimed_at<now()-interval '10 minutes' then update farm_summary_deliveries set status='unknown',error='Delivery interrupted; verify with provider before another send' where id=j.id;return null;end if;
 if j.status<>'failed' or j.attempts>=5 or j.claimed_at>now()-interval '15 minutes' or j.created_at<now()-interval '23 hours' then return null;end if;
 update farm_summary_deliveries set status='sending',attempts=attempts+1,claim_id=gen_random_uuid(),claimed_at=now(),error=null where id=j.id returning * into j;
 else insert into farm_summary_deliveries(setting_id,channel,recipient,report_date,summary,status,claim_id) values(s.id,s.channel,s.recipient,p_date,p_summary,'sending',gen_random_uuid()) returning * into j;end if;
 return to_jsonb(j);
end $$;
create function farm_summary_finish(p_id uuid,p_claim uuid,p_status text,p_provider text,p_error text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_status not in ('sent','failed','unknown') or (p_status='sent' and nullif(p_provider,'') is null) then raise exception using errcode='22023',message='Valid delivery outcome required';end if;
 update farm_summary_deliveries set status=p_status,provider_id=p_provider,error=left(p_error,1000) where id=p_id and claim_id=p_claim and status='sending';
 if not found then raise exception using errcode='40001',message='Delivery claim changed';end if;
end $$;
revoke all on function farm_summary_configure(uuid,jsonb),farm_summary_claim(uuid,date,text),farm_summary_finish(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function farm_summary_configure(uuid,jsonb),farm_summary_claim(uuid,date,text),farm_summary_finish(uuid,uuid,text,text,text) to service_role;
commit;
