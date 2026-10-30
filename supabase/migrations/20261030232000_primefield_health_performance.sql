-- Preconditions: scoped batches, record evidence, complete financial and store ledgers.
-- Adds schedules/completions only. No invented treatments, historical completions or costs.
-- Shared write locks; original tasks and before/after audit survive corrections.
-- Keep additive health history on rollback. No medication/dosage defaults.
begin;
set local lock_timeout='5s';
create table farm_health_tasks(id uuid primary key default gen_random_uuid(),batch_id uuid not null references farm_batches(id),period_id uuid not null references manager_periods(id),date date not null default (now() at time zone 'Africa/Lagos')::date,title text not null check(length(trim(title)) between 1 and 200),instructions text not null check(length(trim(instructions)) between 1 and 4000),due_date date not null,actor_id uuid not null references profiles(id),created_at timestamptz not null default now(),revision integer not null default 0,cancelled_at timestamptz,cancelled_by uuid references profiles(id),cancel_reason text);
create table farm_health_completions(id uuid primary key default gen_random_uuid(),task_id uuid not null references farm_health_tasks(id),batch_id uuid not null references farm_batches(id),period_id uuid not null references manager_periods(id),date date not null,state text not null check(state in ('completed','retracted')),notes text,reason text,actor_id uuid not null references profiles(id),supersedes_id uuid unique references farm_health_completions(id),created_at timestamptz not null default now());
create table farm_health_retries(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,primary key(actor_id,request_id));
alter function operations_private.resources() rename to resources_before_health;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean) language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_health() union all values ('farm_health_tasks','farm','date','actor_id',false),('farm_health_completions','farm','date','actor_id',false)
$$;
do $$ declare t text;begin
 foreach t in array array['farm_health_tasks','farm_health_completions','farm_health_retries'] loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated,service_role',t);execute format('grant select on %I to service_role',t);
 if t<>'farm_health_retries' then execute format('create trigger manager_record_guard before insert or update on %I for each row execute function operations_private.guard_record()',t);execute format('create trigger manager_record_attribution after insert on %I for each row execute function operations_private.tag_record()',t);end if;
 if t<>'farm_health_tasks' then execute format('create trigger health_facts_immutable before update or delete on %I for each row execute function farm_activity_immutable()',t);end if;
 end loop;
end $$;
alter table farm_evidence drop constraint farm_evidence_target_resource_check;
alter table farm_evidence add constraint farm_evidence_target_resource_check check(target_resource in ('farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks','farm_health_completions','farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions','farm_stock_counts','farm_egg_movements','farm_customer_receipts','farm_customer_refunds'));
do $$ declare d text;begin d:=pg_get_functiondef('operations_private.farm_thread_source(uuid,text,uuid)'::regprocedure);if position('''farm_health_tasks''' in d)=0 then raise exception 'Health discussion precondition changed';end if;execute replace(d,'''farm_health_tasks''','''farm_health_tasks'',''farm_health_completions''');end $$;
create function farm_health_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;r farm_health_retries;t farm_health_tasks;completion farm_health_completions;responsible manager_periods;b farm_batches;is_admin boolean;d date;result jsonb;before_value jsonb;
begin
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='Health details and retry identity required';end if;
 fp:=md5(jsonb_build_array('health',p_operation,p_payload,p_id)::text);c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);is_admin:=exists(select 1 from profiles where id=p_actor and role='admin' and not suspended);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));select * into r from farm_health_retries where actor_id=p_actor and request_id=p_request;
 if found then if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another health entry';end if;return r.result;end if;
 if p_operation='schedule' then
 if not is_admin then raise exception using errcode='42501',message='Bimbo creates approved health schedules';end if;
 select * into responsible from manager_periods where id=(p_payload->>'period_id')::uuid and business='farm' and status='active';select * into b from farm_batches where id=(p_payload->>'batch_id')::uuid and archived_at is null;
 if responsible.id is null or b.id is null or not operations_private.record_visible(responsible.manager_id,'farm_batches',to_jsonb(b),responsible.id) then raise exception using errcode='42501',message='Choose an active manager assigned to this batch';end if;
 perform set_config('operations.period',responsible.id::text,true);
 insert into farm_health_tasks(batch_id,period_id,title,instructions,due_date,actor_id) values(b.id,responsible.id,p_payload->>'title',p_payload->>'instructions',(p_payload->>'due_date')::date,p_actor) returning to_jsonb(farm_health_tasks.*) into result;
 elsif p_operation in ('amend','cancel') then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can change a schedule with a reason';end if;
 select * into t from farm_health_tasks where id=p_id for update;
 if t.id is null or t.cancelled_at is not null or t.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='Schedule changed; refresh before deciding';end if;
 before_value:=to_jsonb(t);perform set_config('operations.period',t.period_id::text,true);
 if p_operation='cancel' then update farm_health_tasks set cancelled_at=now(),cancelled_by=p_actor,cancel_reason=p_payload->>'reason',revision=revision+1 where id=p_id returning to_jsonb(farm_health_tasks.*) into result;
 else update farm_health_tasks set title=p_payload->>'title',instructions=p_payload->>'instructions',due_date=(p_payload->>'due_date')::date,revision=revision+1 where id=p_id returning to_jsonb(farm_health_tasks.*) into result;end if;
 elsif p_operation='complete' then
 perform operations_private.require_record(p_actor,'farm_health_tasks',p_id,(c->>'periodId')::uuid);select * into t from farm_health_tasks where id=p_id for update;
 if t.cancelled_at is not null then raise exception using errcode='23514',message='This schedule was cancelled';end if;
 if not is_admin and t.period_id is distinct from (c->>'periodId')::uuid then raise exception using errcode='42501',message='This task belongs to another responsibility';end if;
 select * into completion from farm_health_completions x where task_id=t.id and not exists(select 1 from farm_health_completions n where n.supersedes_id=x.id);
 if completion.state='completed' then raise exception using errcode='40001',message='This task is already completed';end if;
 d:=(p_payload->>'date')::date;if d is null or d>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='22023',message='Use the actual completion date';end if;
 if jsonb_typeof(p_payload->'evidence_ids') is distinct from 'array' or jsonb_array_length(p_payload->'evidence_ids')=0 then raise exception using errcode='23514',message='Add an actual product or treatment photo before completing this task';end if;
 perform set_config('operations.period',t.period_id::text,true);perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
 insert into farm_health_completions(task_id,batch_id,period_id,date,state,notes,actor_id,supersedes_id) values(t.id,t.batch_id,t.period_id,d,'completed',p_payload->>'notes',p_actor,completion.id) returning to_jsonb(farm_health_completions.*) into result;
 perform operations_private.attach_farm_evidence(p_actor,'farm_health_completions',(result->>'id')::uuid,p_payload->'evidence_ids');
 elsif p_operation='retract' then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can retract an incorrect completion with a reason';end if;
 select * into completion from farm_health_completions where id=p_id for update;
 if completion.id is null or completion.state<>'completed' or exists(select 1 from farm_health_completions where supersedes_id=p_id) then raise exception using errcode='40001',message='Completion already changed';end if;
 before_value:=to_jsonb(completion);perform set_config('operations.period',completion.period_id::text,true);perform farm_v2_lock_date(completion.date,true,p_payload->>'reason');
 insert into farm_health_completions(task_id,batch_id,period_id,date,state,reason,actor_id,supersedes_id) values(completion.task_id,completion.batch_id,completion.period_id,completion.date,'retracted',p_payload->>'reason',p_actor,completion.id) returning to_jsonb(farm_health_completions.*) into result;
 else raise exception using errcode='22023',message='Unknown health operation';end if;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('health',(result->>'id')::uuid,p_operation,p_actor,before_value,result,p_payload->>'reason');insert into farm_health_retries values(p_actor,p_request,fp,result);return result;
end $$;
create function farm_health_read(p_actor uuid,p_period uuid default null,p_date date default (now() at time zone 'Africa/Lagos')::date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;tasks jsonb;completions jsonb;batches jsonb;managers jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('batch_name',(select name from farm_batches where id=t.batch_id),'manager_name',(select name from profiles where id=(select manager_id from manager_periods where id=t.period_id)),'completion_id',x.id,'status',case when t.cancelled_at is not null then 'cancelled' when x.state='completed' then 'completed' when t.due_date<p_date then 'overdue' when t.due_date=p_date then 'due_today' else 'scheduled' end) order by t.due_date,t.id),'[]') into tasks from farm_health_tasks t left join farm_health_completions x on x.task_id=t.id and not exists(select 1 from farm_health_completions n where n.supersedes_id=x.id) where operations_private.record_visible(p_actor,'farm_health_tasks',to_jsonb(t),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('actor_name',(select name from profiles where id=x.actor_id)) order by x.created_at desc,x.id),'[]') into completions from farm_health_completions x where operations_private.record_visible(p_actor,'farm_health_completions',to_jsonb(x),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(b) order by b.name,b.id),'[]') into batches from farm_batches b where b.archived_at is null and operations_private.record_visible(p_actor,'farm_batches',to_jsonb(b),(c->>'periodId')::uuid);
 if exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',u.name,'batch_ids',(select coalesce(jsonb_agg(b.id),'[]') from farm_batches b where b.archived_at is null and operations_private.record_visible(p.manager_id,'farm_batches',to_jsonb(b),p.id)))),'[]') into managers from manager_periods p join profiles u on u.id=p.manager_id where p.business='farm' and p.status='active' and not u.suspended;else managers:='[]';end if;
 return jsonb_build_object('tasks',tasks,'completions',completions,'batches',batches,'managers',managers);
end $$;
-- Explicit future batch allocation on general costs; legacy NULL remains unallocated.
alter table farm_expenses add column batch_id uuid references farm_batches(id);
do $$ declare d text;needle text;begin
 d:=pg_get_functiondef('farm_v2_write_pre_livestock(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 needle:='created_by,expense_source,item_name) values';if position(needle in d)=0 then raise exception 'Expense insert precondition changed';end if;
 d:=replace(d,needle,'created_by,expense_source,item_name,batch_id) values');
 d:=replace(d,'v_payload->>''item_name'');','v_payload->>''item_name'',(v_payload->>''batch_id'')::uuid);');
 needle:='item_name=case when v_payload?''item_name'' then v_payload->>''item_name'' else item_name end,is_edited=true';
 if position(needle in d)=0 then raise exception 'Expense correction precondition changed';end if;
 d:=replace(d,needle,'batch_id=case when v_payload?''batch_id'' then (v_payload->>''batch_id'')::uuid else batch_id end,'||needle);execute d;
end $$;
create function farm_performance_read(p_actor uuid,p_period uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;batches jsonb;records jsonb;sales jsonb;expenses jsonb;feed jsonb;payments jsonb;credits jsonb;deaths jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);if p_from is null or p_to is null or p_from>p_to then raise exception using errcode='22023',message='Choose a valid reporting period';end if;
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('site_name',(select name from farm_sites where id=b.site_id),'head_count',coalesce((select sum(quantity) from farm_batch_movements where batch_id=b.id and date<=p_to),0)::text,'movement_dates',(select coalesce(jsonb_agg(date),'[]') from farm_batch_movements where batch_id=b.id and date between p_from and p_to),'laying_hens',exists(select 1 from farm_livestock_groups where id=b.stock_group_id and sex='female' and b.product='chicken' and chicken_type='layer' and growth_stage='layers')) order by b.name,b.id),'[]') into batches from farm_batches b where operations_private.record_visible(p_actor,'farm_batches',to_jsonb(b),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('head_count',coalesce((select sum(quantity) from farm_batch_movements where batch_id=r.batch_id and date<=r.date),0)::text,'feed_cost_estimate',case when r.feed_bags is not null then (r.feed_bags*operations_private.store_unit_cost('feed',(select s.id from farm_feed_stock s join farm_daily_feed f on f.feed_type=s.feed_type and f.feed_source=s.feed_source where f.id=r.daily_feed_id),r.date))::text end) order by r.date,r.id),'[]') into records from farm_batch_records r where r.date between p_from and p_to and not exists(select 1 from farm_batch_records n where n.supersedes_id=r.id) and operations_private.record_visible(p_actor,'farm_batch_records',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'batch_id',coalesce(r.batch_id,r.egg_batch_id),'amount',r.total_amount::text)),'[]') into sales from farm_sales r where r.date between p_from and p_to and r.voided_at is null and operations_private.record_visible(p_actor,'farm_sales',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'batch_id',r.batch_id,'amount',r.amount::text)),'[]') into expenses from farm_expenses r where r.date between p_from and p_to and r.voided_at is null and operations_private.record_visible(p_actor,'farm_expenses',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'amount',r.cost::text)),'[]') into feed from farm_feed_purchases r where r.date between p_from and p_to and operations_private.record_visible(p_actor,'farm_feed_purchases',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'amount',r.amount::text,'allocations',(select coalesce(jsonb_agg(jsonb_build_object('batch_id',l.batch_id,'amount',(r.amount*l.quantity*l.unit_price/o.total)::text)),'[]') from farm_purchase_lines l join farm_purchases o on o.id=l.purchase_id where l.purchase_id=r.purchase_id and l.batch_id is not null))),'[]') into payments from farm_purchase_payments r where r.date between p_from and p_to and r.voided_at is null and operations_private.record_visible(p_actor,'farm_purchase_payments',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'batch_id',coalesce(s.batch_id,s.egg_batch_id),'amount',r.amount::text)),'[]') into credits from farm_credit_notes r join farm_invoices i on i.id=r.invoice_id join farm_sales s on s.id=i.sale_id where r.date between p_from and p_to and r.voided_at is null and operations_private.record_visible(p_actor,'farm_credit_notes',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.date,'batch_id',r.batch_id,'quantity',r.quantity::text)),'[]') into deaths from farm_inventory_transactions r where r.date between p_from and p_to and r.action='mortality' and not exists(select 1 from farm_inventory_transactions undo where undo.correction_of=r.id and undo.correction_role='reversal') and operations_private.record_visible(p_actor,'farm_inventory_transactions',to_jsonb(r),(c->>'periodId')::uuid);
 return jsonb_build_object('batches',batches,'records',records,'sales',sales,'expenses',expenses,'feed',feed,'payments',payments,'credits',credits,'deaths',deaths,'from',p_from,'to',p_to);
end $$;
revoke all on function farm_performance_read(uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function farm_performance_read(uuid,uuid,date,date) to service_role;
revoke all on function operations_private.resources(),operations_private.resources_before_health() from public,anon,authenticated,service_role;
revoke all on function farm_health_write(uuid,text,jsonb,uuid,uuid),farm_health_read(uuid,uuid,date) from public,anon,authenticated;
grant execute on function farm_health_write(uuid,text,jsonb,uuid,uuid),farm_health_read(uuid,uuid,date) to service_role;
commit;
