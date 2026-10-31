-- Preconditions: existing profile roles, guarded manager periods and Pulse reports.
-- Add explicit support roles/grants only. No existing identity, record or attribution changes.
-- Retain grants/recommendations on rollback; never map support roles to admin or manager.
begin;
set local lock_timeout='5s';
do $$ declare c record;found_role boolean:=false;begin
 for c in select conname,pg_get_expr(conbin,conrelid) expression from pg_constraint where conrelid='profiles'::regclass and contype='c' and conkey=array[(select attnum from pg_attribute where attrelid='profiles'::regclass and attname='role')] loop
 found_role:=true;execute format('alter table profiles drop constraint %I',c.conname);execute format('alter table profiles add constraint %I check((%s) or role in (''farm_vet'',''farm_accountant''))',c.conname,c.expression);
 end loop;
 if not found_role then raise exception 'Expected profile role constraint missing; inspect before release';end if;
end $$;
create table farm_support_grants(id uuid primary key default gen_random_uuid(),support_id uuid not null references profiles(id),capability text not null check(capability in ('health','finance')),batch_id uuid references farm_batches(id),period_id uuid references manager_periods(id),actor_id uuid not null references profiles(id),reason text not null check(length(trim(reason)) between 1 and 2000),created_at timestamptz not null default now(),revoked_at timestamptz,revoked_by uuid references profiles(id),revoke_reason text,check((capability='health' and batch_id is not null and period_id is null) or (capability='finance' and batch_id is null)));
create table farm_support_recommendations(id uuid primary key default gen_random_uuid(),grant_id uuid not null references farm_support_grants(id),task_id uuid not null references farm_health_tasks(id),actor_id uuid not null references profiles(id),body text not null check(length(trim(body)) between 1 and 4000),request_id uuid not null,created_at timestamptz not null default now(),unique(actor_id,request_id));
do $$ declare t text;begin foreach t in array array['farm_support_grants','farm_support_recommendations'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated,service_role',t);execute format('grant select on %I to service_role',t);end loop;end $$;
create trigger support_recommendations_immutable before update or delete on farm_support_recommendations for each row execute function farm_activity_immutable();
create function farm_support_account_provision(p_actor uuid,p_id uuid,p_role text,p_name text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) or p_id=p_actor then raise exception using errcode='42501',message='CEO access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if not manager_release_status(p_actor) then raise exception using errcode='55000',message='New account setup paused';end if;
 if p_role not in ('farm_vet','farm_accountant') or length(trim(p_name)) not between 2 and 200 then raise exception using errcode='22023',message='Choose a support role and name';end if;
 if not exists(select 1 from auth.users u where id=p_id and to_jsonb(u)->'raw_app_meta_data'->>'manager_setup_pending'='true' and (to_jsonb(u)->>'banned_until')::timestamptz>now()) or exists(select 1 from manager_periods where manager_id=p_id) then raise exception using errcode='42501',message='Only a new locked support account can be provisioned';end if;
 update profiles set role=p_role,name=p_name,suspended=false where id=p_id;
 if not found then raise exception using errcode='P0002',message='New profile unavailable';end if;
 return (select to_jsonb(p) from profiles p where id=p_id);
end $$;
create function farm_support_access_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare g farm_support_grants;before_value jsonb;target_role text;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 if nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='A reason is required';end if;
 perform operations_private.prepare_write(p_actor,'farm',p_payload,gen_random_uuid(),md5(jsonb_build_array('support_access',p_operation,p_payload,p_id)::text));
 perform pg_advisory_xact_lock(hashtextextended('farm-support-access',0));
 if p_operation='grant' then
 select role into target_role from profiles where id=(p_payload->>'support_id')::uuid and not suspended;
 if target_role is distinct from (case p_payload->>'capability' when 'health' then 'farm_vet' when 'finance' then 'farm_accountant' end) or target_role is null then raise exception using errcode='42501',message='Choose the matching active support account';end if;
 if p_payload->>'capability'='finance' and not (p_payload ? 'period_id') then raise exception using errcode='22023',message='Choose a responsibility period or explicitly grant whole-farm finance';end if;
 if p_payload->>'period_id' is not null and not exists(select 1 from manager_periods where id=(p_payload->>'period_id')::uuid and business='farm') then raise exception using errcode='22023',message='Choose a Farm responsibility period';end if;
 select * into g from farm_support_grants where support_id=(p_payload->>'support_id')::uuid and capability=p_payload->>'capability' and batch_id is not distinct from (p_payload->>'batch_id')::uuid and period_id is not distinct from (p_payload->>'period_id')::uuid and revoked_at is null;
 if found then return to_jsonb(g);end if;
 insert into farm_support_grants(support_id,capability,batch_id,period_id,actor_id,reason) values((p_payload->>'support_id')::uuid,p_payload->>'capability',(p_payload->>'batch_id')::uuid,(p_payload->>'period_id')::uuid,p_actor,p_payload->>'reason') returning * into g;
 elsif p_operation='revoke' then
 select * into g from farm_support_grants where id=p_id for update;if g.id is null then raise exception using errcode='P0002',message='Assignment unavailable';end if;
 if g.revoked_at is not null then return to_jsonb(g);end if;before_value:=to_jsonb(g);
 update farm_support_grants set revoked_at=now(),revoked_by=p_actor,revoke_reason=p_payload->>'reason' where id=p_id returning * into g;
 else raise exception using errcode='22023',message='Unknown access action';end if;
 insert into farm_activity(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('support_access',g.id,p_operation,p_actor,before_value,to_jsonb(g),p_payload->>'reason');
 return to_jsonb(g);
end $$;
create function farm_support_recommend(p_actor uuid,p_task uuid,p_body text,p_request uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare g farm_support_grants;r farm_support_recommendations;
begin
 if not exists(select 1 from profiles where id=p_actor and role='farm_vet' and not suspended) then raise exception using errcode='42501',message='Assigned vet access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('farm-support-access',0));
 select a.* into g from farm_support_grants a join farm_health_tasks t on t.batch_id=a.batch_id where a.support_id=p_actor and a.capability='health' and a.revoked_at is null and t.id=p_task order by a.created_at desc limit 1;
 if g.id is null then raise exception using errcode='42501',message='This health task is not assigned to you';end if;
 select * into r from farm_support_recommendations where actor_id=p_actor and request_id=p_request;
 if found then if r.task_id<>p_task or r.body<>p_body then raise exception using errcode='23514',message='Retry belongs to another recommendation';end if;return to_jsonb(r);end if;
 insert into farm_support_recommendations(grant_id,task_id,actor_id,body,request_id) values(g.id,p_task,p_actor,p_body,p_request) returning * into r;return to_jsonb(r);
end $$;
create function farm_support_read(p_actor uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare actor_role text;tasks jsonb:='[]';recommendations jsonb:='[]';records jsonb:='{}';rows jsonb;t text;amount_column text;accounts jsonb:='[]';
begin
 select role into actor_role from profiles where id=p_actor and not suspended;
 if actor_role is null or actor_role not in ('farm_vet','farm_accountant') then raise exception using errcode='42501',message='Assigned support access required';end if;
 if p_from is null or p_to is null or p_from>p_to then raise exception using errcode='22023',message='Choose valid report dates';end if;
 if actor_role='farm_vet' then
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'batch_id',t.batch_id,'batch_name',b.name,'title',t.title,'instructions',t.instructions,'due_date',t.due_date,'cancelled_at',t.cancelled_at,'completions',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'date',c.date,'state',c.state,'notes',c.notes,'reason',c.reason,'created_at',c.created_at,'supersedes_id',c.supersedes_id)),'[]') from farm_health_completions c where c.task_id=t.id)) order by t.due_date,t.id),'[]') into tasks from farm_health_tasks t join farm_batches b on b.id=t.batch_id where exists(select 1 from farm_support_grants g where g.support_id=p_actor and g.capability='health' and g.batch_id=t.batch_id and g.revoked_at is null);
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id),'[]') into recommendations from farm_support_recommendations r join farm_health_tasks t on t.id=r.task_id where exists(select 1 from farm_support_grants g where g.support_id=p_actor and g.batch_id=t.batch_id and g.capability='health' and g.revoked_at is null);
 else
 foreach t in array array['farm_sales','farm_expenses','farm_feed_purchases','farm_fund_transfers','farm_purchase_payments','farm_customer_receipts','farm_customer_refunds','farm_credit_notes'] loop
 amount_column:=case t when 'farm_sales' then 'total_amount' when 'farm_feed_purchases' then 'cost' else 'amount' end;
 execute format('select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object(%L,t.%I::text) order by t.date,t.id),''[]'') from %I t where t.date<=$2 and exists(select 1 from farm_support_grants g where g.support_id=$1 and g.capability=''finance'' and g.revoked_at is null and (g.period_id is null or exists(select 1 from manager_record_links l where l.resource=%L and l.record_id=t.id and l.period_id=g.period_id)))',amount_column,amount_column,t,t) into rows using p_actor,p_to;
 records:=records||jsonb_build_object(t,rows);
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'currency',a.currency,'bucket',a.bucket,'closing',coalesce((select sum(p.amount) from operations_cash_postings p where p.account_id=a.id and p.operational_date<=p_to),0)::text)),'[]') into accounts from operations_cash_accounts a where a.business='farm' and a.holder_type not in ('outside','awaiting') and exists(select 1 from farm_support_grants g where g.support_id=p_actor and g.capability='finance' and g.revoked_at is null and (g.period_id is null or g.period_id=a.period_id));
 end if;
 return jsonb_build_object('role',actor_role,'from',p_from,'to',p_to,'tasks',tasks,'recommendations',recommendations,'records',records,'accounts',accounts);
end $$;
create function farm_support_admin_read(p_actor uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='CEO access required';end if;
 return jsonb_build_object('accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'role',role,'suspended',suspended)),'[]') from profiles where role in ('farm_vet','farm_accountant')),'grants',(select coalesce(jsonb_agg(to_jsonb(g)),'[]') from farm_support_grants g),'batches',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') from farm_batches),'periods',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',u.name,'starts_on',p.starts_on)),'[]') from manager_periods p join profiles u on u.id=p.manager_id where p.business='farm'),'recommendations',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('actor_name',p.name,'task_title',t.title,'batch_name',b.name) order by r.created_at desc),'[]') from farm_support_recommendations r join profiles p on p.id=r.actor_id join farm_health_tasks t on t.id=r.task_id join farm_batches b on b.id=t.batch_id));
end $$;
-- Include only the already-authorized record's batch metadata for archived-record corrections.
do $$ declare d text;begin
 d:=pg_get_functiondef('farm_today_read(uuid,uuid,date)'::regprocedure);
 if position('''batch_name'',b.name' in d)=0 then raise exception 'Today record shape changed';end if;
 execute replace(d,'''batch_name'',b.name','''batch_name'',b.name,''batch'',to_jsonb(b)||jsonb_build_object(''site_name'',(select name from farm_sites where id=b.site_id),''quantity_exact'',coalesce((select sum(quantity) from farm_batch_movements where batch_id=b.id),0)::text,''chicken_type'',(select chicken_type from farm_livestock_groups where id=b.stock_group_id),''sex'',(select sex from farm_livestock_groups where id=b.stock_group_id))');
 d:=pg_get_functiondef('farm_health_read(uuid,uuid,date)'::regprocedure);
 if position('''tasks'',tasks' in d)=0 then raise exception 'Health read shape changed';end if;
 execute replace(d,'''tasks'',tasks','''tasks'',tasks,''recommendations'',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(''actor_name'',p.name) order by r.created_at),''[]'') from farm_support_recommendations r join profiles p on p.id=r.actor_id join farm_health_tasks t on t.id=r.task_id where operations_private.record_visible(p_actor,''farm_health_tasks'',to_jsonb(t),(c->>''periodId'')::uuid))');
end $$;
create function farm_support_evidence_read(p_actor uuid,p_task uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from profiles p join farm_support_grants g on g.support_id=p.id join farm_health_tasks t on t.batch_id=g.batch_id where p.id=p_actor and p.role='farm_vet' and not p.suspended and g.capability='health' and g.revoked_at is null and t.id=p_task) then raise exception using errcode='42501',message='Assigned health evidence access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'object_path',e.object_path,'activity_date',e.activity_date,'record_id',e.record_id)),'[]') from farm_evidence e where e.status='uploaded' and e.linked_at is not null and ((e.target_resource='farm_health_tasks' and e.record_id=p_task) or (e.target_resource='farm_health_completions' and exists(select 1 from farm_health_completions c where c.id=e.record_id and c.task_id=p_task))));
end $$;
revoke all on function farm_support_evidence_read(uuid,uuid) from public,anon,authenticated;
grant execute on function farm_support_evidence_read(uuid,uuid) to service_role;
revoke all on function farm_support_account_provision(uuid,uuid,text,text),farm_support_access_write(uuid,text,jsonb,uuid),farm_support_recommend(uuid,uuid,text,uuid),farm_support_read(uuid,date,date),farm_support_admin_read(uuid) from public,anon,authenticated;
grant execute on function farm_support_account_provision(uuid,uuid,text,text),farm_support_access_write(uuid,text,jsonb,uuid),farm_support_recommend(uuid,uuid,text,uuid),farm_support_read(uuid,date,date),farm_support_admin_read(uuid) to service_role;
commit;
