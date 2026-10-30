-- Preconditions: named batches, evidence, batch records and guarded cash writers.
-- Additive purchase records only; no historical purchase, stock or cash backfill.
-- Payments and physical deliveries are separate facts. Existing NULL links stay unknown.
-- Short DDL locks; transaction locks serialize remaining approval and delivery limits.
-- Rollback must retain these records and guards after use; never rebuild old inventory.
begin;
set local lock_timeout='5s';
-- Enable only after compatible application verification during the coordinated release.
alter table operations_release_state add column purchasing_enabled boolean not null default false;
alter table farm_evidence drop constraint farm_evidence_target_resource_check;
alter table farm_evidence add constraint farm_evidence_target_resource_check check(target_resource in ('farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks','farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions'));

create table farm_purchase_policies(
 id uuid primary key default gen_random_uuid(),automatic_limit numeric check(automatic_limit>0 and scale(automatic_limit)<=2),
 require_quote boolean not null,actor_id uuid not null references profiles(id),created_at timestamptz not null default now()
);
create table farm_purchases(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique references farm_operational_requests(id),
 date date not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 supplier text not null check(length(trim(supplier)) between 1 and 200),category text not null check(category in ('feed','equipment','veterinary','repair','maintenance','other')),
 description text not null check(length(trim(description)) between 1 and 4000),total numeric not null check(total>0 and total<=1000000000000000 and scale(total)<=2),
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 policy_id uuid references farm_purchase_policies(id),decision_by uuid references profiles(id),decision_at timestamptz,decision_reason text,
 revision integer not null default 0,created_at timestamptz not null default now()
);
create table farm_purchase_lines(
 id uuid primary key default gen_random_uuid(),purchase_id uuid not null references farm_purchases(id),
 description text not null check(length(trim(description)) between 1 and 500),quantity numeric not null check(quantity>0 and quantity<=1000000),
 unit_price numeric not null check(unit_price>=0 and unit_price<=1000000000000 and scale(unit_price)<=2),unit text not null check(length(trim(unit)) between 1 and 40),
 destination text not null check(destination in ('feed','supply','livestock','other')),
 feed_type text check(feed_type in ('fish','goat','pig','chicken','turkey','cattle','other')),feed_source text check(feed_source in ('local','foreign')),item_id uuid references farm_supply_inventory(id),batch_id uuid references farm_batches(id),
 check(destination<>'feed' or (unit='bags' and quantity=trunc(quantity) and feed_type is not null and feed_source is not null)),
 check(destination<>'supply' or item_id is not null),check(destination<>'livestock' or (batch_id is not null and quantity=trunc(quantity)))
);
create table farm_purchase_payments(
 id uuid primary key default gen_random_uuid(),purchase_id uuid not null references farm_purchases(id),date date not null,
 actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),amount numeric not null check(amount>0 and scale(amount)<=2),
 category text not null,expense_source text not null check(expense_source in ('owner_fund','sales_cash')),
 recipient text not null check(length(trim(recipient)) between 1 and 200),notes text,created_at timestamptz not null default now(),
 revision integer not null default 0,voided_at timestamptz,voided_by uuid references profiles(id),void_reason text
);
create table farm_purchase_deliveries(
 id uuid primary key default gen_random_uuid(),purchase_id uuid not null references farm_purchases(id),line_id uuid not null references farm_purchase_lines(id),
 date date not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 quantity numeric not null check(quantity>0 and quantity<=1000000),movement_resource text,movement_id uuid,notes text,created_at timestamptz not null default now(),
 unique(movement_resource,movement_id)
);
create table farm_purchase_exceptions(
 id uuid primary key default gen_random_uuid(),date date not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),
 supplier text not null,amount numeric not null check(amount>0 and scale(amount)<=2),description text not null,
 created_at timestamptz not null default now()
);
create table farm_purchase_receipts(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,primary key(actor_id,request_id));
alter function operations_private.resources() rename to resources_before_purchases;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean)
language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_purchases() union all values
 ('farm_purchases','farm','date','actor_id',false),('farm_purchase_payments','farm','date','actor_id',false),
 ('farm_purchase_deliveries','farm','date','actor_id',false),('farm_purchase_exceptions','farm','date','actor_id',false)
$$;
do $$ declare t text;begin
 foreach t in array array['farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions','farm_purchase_lines','farm_purchase_policies','farm_purchase_receipts'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public,anon,authenticated,service_role',t);
  execute format('grant select on %I to service_role',t);
  if t in ('farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions') then
   execute format('create trigger manager_record_guard before insert or update on %I for each row execute function operations_private.guard_record()',t);
   execute format('create trigger manager_record_attribution after insert on %I for each row execute function operations_private.tag_record()',t);
  end if;
  if t not in ('farm_purchases','farm_purchase_payments') then execute format('create trigger purchase_facts_immutable before update or delete on %I for each row execute function farm_activity_immutable()',t);end if;
 end loop;
end $$;
alter function operations_private.write_resource(text,text) rename to write_resource_before_purchases;
create function operations_private.write_resource(p_writer text,p_kind text) returns text language sql immutable set search_path=public,pg_temp as $$
 select case when p_writer='farm_purchase_payment_write' then 'farm_purchase_payments' else operations_private.write_resource_before_purchases(p_writer,p_kind) end
$$;
-- Reuse the existing cash transaction and funding-review boundary, including legacy payers.
do $$ declare d text;begin
 d:=pg_get_functiondef('operations_private.business_cash_write(text,uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 if position('if p_writer not in (''farm_v2_write'',''property_write'',''content_write'')' in d)=0 then raise exception 'Cash writer precondition changed';end if;
 d:=replace(d,'if p_writer not in (''farm_v2_write'',''property_write'',''content_write'')','if p_writer not in (''farm_v2_write'',''property_write'',''content_write'',''farm_purchase_payment_write'')');
 d:=replace(d,'financial:=(p_writer=','financial:=(p_writer=''farm_purchase_payment_write'' and p_kind=''expense'') or (p_writer=');
 d:=replace(d,'if c->>''mode''<>''personal'' and not cash_metadata','if p_writer<>''farm_purchase_payment_write'' and c->>''mode''<>''personal'' and not cash_metadata');
 execute d;
end $$;
do $$ declare d text;needle text:='select * into responsible from manager_periods where id=p_period;';begin
 d:=pg_get_functiondef('operations_private.business_cash_effect(uuid,text,text,text,jsonb,jsonb,uuid,text)'::regprocedure);
 if position(needle in d)=0 then raise exception 'Cash responsibility precondition changed';end if;
 execute replace(d,needle,needle||' if p_writer=''farm_purchase_payment_write'' and p_operation=''create'' and responsible.mode=''legacy'' and actor_row.role<>''admin'' then raise exception using errcode=''P0F01'',message=''Ask Bimbo to confirm the actual payer for this legacy responsibility'';end if;');
end $$;
create function public.farm_purchase_payment_write_before_business_cash(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o farm_purchases;v farm_purchase_payments;before_value jsonb;c jsonb;paid numeric;
begin
 if p_kind<>'expense' or p_operation not in ('create','void') then raise exception using errcode='22023',message='Record a payment or an audited void';end if;
 c:=manager_context(p_actor,'farm',nullif(current_setting('operations.period',true),'')::uuid);
 if p_operation='void' then
  if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) or nullif(trim(p_reason),'') is null then raise exception using errcode='42501',message='Only Bimbo can void a saved payment with a reason';end if;
  select * into v from farm_purchase_payments where id=p_id for update;
  if v.id is null then raise exception using errcode='P0002',message='Payment not found';end if;
  if v.revision is distinct from (p_payload->>'expected_revision')::integer or v.voided_at is not null then raise exception using errcode='40001',message='Payment changed; refresh';end if;
  before_value:=to_jsonb(v);
  perform farm_v2_lock_date(v.date,true,p_reason);
  update farm_purchase_payments set voided_at=now(),voided_by=p_actor,void_reason=p_reason,revision=revision+1 where id=v.id returning * into v;
 else
  select * into o from farm_purchases where id=(p_payload->>'purchase_id')::uuid for update;
  if o.id is null then raise exception using errcode='P0002',message='Purchase not found';end if;
  perform operations_private.require_record(p_actor,'farm_purchases',o.id,(c->>'periodId')::uuid);
  if o.status<>'approved' then raise exception using errcode='23514',message='This purchase needs approval before payment can be posted';end if;
  perform farm_v2_lock_date((p_payload->>'date')::date,exists(select 1 from profiles where id=p_actor and role='admin'),p_reason);
  select coalesce(sum(amount),0) into paid from farm_purchase_payments where purchase_id=o.id and voided_at is null;
  if (p_payload->>'amount')::numeric+paid>o.total then raise exception using errcode='23514',message='Payment exceeds the remaining approved amount';end if;
  if o.category='feed' and coalesce(p_payload->>'expense_source','owner_fund')<>'owner_fund' then raise exception using errcode='23514',message='Feed purchases remain owner-funded';end if;
  insert into farm_purchase_payments(purchase_id,date,actor_id,period_id,amount,category,expense_source,recipient,notes)
  values(o.id,(p_payload->>'date')::date,p_actor,(c->>'periodId')::uuid,(p_payload->>'amount')::numeric,o.category,coalesce(p_payload->>'expense_source','owner_fund'),p_payload->>'recipient',p_payload->>'notes') returning * into v;
  perform operations_private.attach_farm_evidence(p_actor,'farm_purchase_payments',v.id,p_payload->'evidence_ids');
 end if;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('purchase_payment',v.id,p_operation,p_actor,before_value,to_jsonb(v),p_reason);
 return to_jsonb(v)||jsonb_build_object('amount_exact',v.amount::text);
end $$;
create function public.farm_purchase_payment_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select operations_private.business_cash_write('farm_purchase_payment_write',p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id)
$$;
create function public.farm_purchase_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;r farm_purchase_receipts;o farm_purchases;l farm_purchase_lines;policy farm_purchase_policies;
 line jsonb;result jsonb;before_value jsonb;request_row jsonb;movement jsonb;target jsonb;total_value numeric:=0;received numeric;qty numeric;d date;is_admin boolean;new_id uuid;
begin
 if p_operation='payment' then return farm_purchase_payment_write(p_actor,'expense','create',p_payload||jsonb_build_object('purchase_id',p_id),null,p_payload->>'reason',p_request);end if;
 if p_operation='void_payment' then return farm_purchase_payment_write(p_actor,'expense','void',p_payload,p_id,p_payload->>'reason',p_request);end if;
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>40000 then raise exception using errcode='22023',message='Valid purchase details and retry identifier required';end if;
 fp:=md5(jsonb_build_array('purchase',p_operation,p_payload,p_id)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 is_admin:=exists(select 1 from profiles where id=p_actor and role='admin' and not suspended);
 select * into r from farm_purchase_receipts where actor_id=p_actor and request_id=p_request;
 if found then if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another purchase entry';end if;return r.result;end if;
 if p_operation='policy' then
  if not is_admin then raise exception using errcode='42501',message='Only Bimbo configures purchase approval';end if;
  insert into farm_purchase_policies(automatic_limit,require_quote,actor_id) values((p_payload->>'automatic_limit')::numeric,coalesce((p_payload->>'require_quote')::boolean,false),p_actor) returning to_jsonb(farm_purchase_policies.*) into result;
 elsif p_operation='request' then
  d:=(p_payload->>'date')::date;perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
  if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 50 then raise exception using errcode='22023',message='Add between one and fifty purchase lines';end if;
  for line in select value from jsonb_array_elements(p_payload->'lines') loop
   if (line->>'quantity')::numeric<=0 or (line->>'unit_price')::numeric<0 or scale((line->>'unit_price')::numeric)>2 then raise exception using errcode='22023',message='Check line quantities and prices';end if;
   if (line->>'destination'='feed') is distinct from (p_payload->>'category'='feed') then raise exception using errcode='22023',message='Keep feed purchases in their own owner-funded request';end if;
   total_value:=total_value+round((line->>'quantity')::numeric*(line->>'unit_price')::numeric,2);
  end loop;
  select * into policy from farm_purchase_policies order by created_at desc,id desc limit 1;
  if policy.require_quote and coalesce(jsonb_array_length(p_payload->'evidence_ids'),0)=0 then raise exception using errcode='23514',message='Attach the quotation required by the current purchase policy';end if;
  request_row:=farm_operations_write(p_actor,'request','create',jsonb_build_object('request_date',d,'category','purchase','description',p_payload->>'description'),null,null,md5(p_request::text||':request')::uuid);
  insert into farm_purchases(request_id,date,actor_id,period_id,supplier,category,description,total,policy_id)
  values((request_row->>'id')::uuid,d,p_actor,(c->>'periodId')::uuid,p_payload->>'supplier',p_payload->>'category',p_payload->>'description',total_value,policy.id) returning * into o;
  for line in select value from jsonb_array_elements(p_payload->'lines') loop
   if line->>'destination'='supply' then
    perform operations_private.require_record(p_actor,'farm_supply_inventory',(line->>'item_id')::uuid,(c->>'periodId')::uuid);
    select to_jsonb(t) into target from farm_supply_inventory t where id=(line->>'item_id')::uuid;
    if target->>'archived_at' is not null or target->>'unit' is distinct from line->>'unit' then raise exception using errcode='23514',message='Supply unit must match an active store item';end if;
   elsif line->>'destination'='livestock' then perform operations_private.require_record(p_actor,'farm_batches',(line->>'batch_id')::uuid,(c->>'periodId')::uuid);end if;
   insert into farm_purchase_lines(purchase_id,description,quantity,unit_price,unit,destination,feed_type,feed_source,item_id,batch_id)
   values(o.id,line->>'description',(line->>'quantity')::numeric,(line->>'unit_price')::numeric,line->>'unit',line->>'destination',line->>'feed_type',line->>'feed_source',(line->>'item_id')::uuid,(line->>'batch_id')::uuid);
  end loop;
  perform operations_private.attach_farm_evidence(p_actor,'farm_purchases',o.id,p_payload->'evidence_ids');
  if policy.automatic_limit is not null and total_value<=policy.automatic_limit then
   perform set_config('farm.purchase_decision',o.request_id::text,true);
   update farm_operational_requests set status='approved',decision_at=now(),decision_by=policy.actor_id,ceo_response='Automatic approval under configured purchase policy',revision=revision+1 where id=o.request_id;
   update farm_purchases set status='approved',decision_at=now(),decision_reason='Automatic approval under configured policy',revision=1 where id=o.id returning * into o;
  end if;
  result:=to_jsonb(o)||jsonb_build_object('total_exact',o.total::text);
 elsif p_operation in ('approve','decline','delivery') then
  select * into o from farm_purchases where id=p_id for update;
  if o.id is null then raise exception using errcode='P0002',message='Purchase not found';end if;
  perform operations_private.require_record(p_actor,'farm_purchases',o.id,(c->>'periodId')::uuid);
  before_value:=to_jsonb(o);
  perform set_config('farm.purchase_decision',o.request_id::text,true);
  if p_operation in ('approve','decline') then
   if not is_admin then raise exception using errcode='42501',message='Only Bimbo decides purchase requests';end if;
   if o.status<>'pending' or o.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='This purchase changed; refresh before deciding';end if;
   if nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Explain the decision';end if;
   update farm_purchases set status=case p_operation when 'approve' then 'approved' else 'declined' end,decision_by=p_actor,decision_at=now(),decision_reason=p_payload->>'reason',revision=revision+1 where id=o.id returning * into o;
   select to_jsonb(t) into request_row from farm_operational_requests t where id=o.request_id;
   perform farm_operations_write(p_actor,'request',p_operation,jsonb_build_object('expected_revision',(request_row->>'revision')::integer,'ceo_response',p_payload->>'reason'),o.request_id,p_payload->>'reason',md5(p_request::text||':decision')::uuid);
   result:=to_jsonb(o)||jsonb_build_object('total_exact',o.total::text);
  else
   d:=(p_payload->>'date')::date;perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
   select * into l from farm_purchase_lines where id=(p_payload->>'line_id')::uuid and purchase_id=o.id;
   if l.id is null then raise exception using errcode='23514',message='Choose a line from this purchase';end if;
   qty:=(p_payload->>'quantity')::numeric;
   select coalesce(sum(quantity),0) into received from farm_purchase_deliveries where line_id=l.id;
   if qty is null or qty<=0 or qty+received>l.quantity then raise exception using errcode='23514',message='Delivery exceeds the outstanding quantity';end if;
   if l.destination in ('feed','livestock') and qty<>trunc(qty) then raise exception using errcode='22023',message='Enter a whole bag or animal count';end if;
   if p_payload->>'existing_movement_id' is not null then
    target:=jsonb_build_object('resource',case l.destination when 'feed' then 'farm_feed_activities' when 'supply' then 'farm_supply_transactions' when 'livestock' then 'farm_inventory_transactions' end,'id',p_payload->>'existing_movement_id');
    if target->>'resource' is null then raise exception using errcode='22023',message='This delivery has no stock ledger to link';end if;
    perform operations_private.require_record(p_actor,target->>'resource',(target->>'id')::uuid,(c->>'periodId')::uuid);
    execute format('select to_jsonb(t) from %I t where id=$1 for update',target->>'resource') into movement using (target->>'id')::uuid;
    if coalesce((movement->>'date')::date,(movement->>'activity_date')::date) is distinct from d then raise exception using errcode='23514',message='Use the actual date of the existing receipt';end if;
    if l.destination='feed' then
     select movement||jsonb_build_object('feed_type',s.feed_type,'feed_source',s.feed_source) into movement from farm_feed_stock s where s.id=(movement->>'stock_id')::uuid;
     if movement->>'kind'<>'received' or (movement->>'bags')::numeric<>qty or movement->>'feed_type' is distinct from l.feed_type or movement->>'feed_source' is distinct from l.feed_source then raise exception using errcode='23514',message='Choose the matching feed delivery and exact bag count';end if;
    elsif l.destination='supply' then
     if exists(select 1 from farm_activity where record_type='supply_transaction' and record_id=(movement->>'id')::uuid and operation='update') or movement->>'action'<>'purchase' or (movement->>'quantity_change')::numeric<>qty or (movement->>'item_id')::uuid<>l.item_id then raise exception using errcode='23514',message='Choose the matching supply receipt and exact quantity';end if;
    else
     if movement->>'correction_of' is not null or exists(select 1 from farm_inventory_transactions r where r.correction_of=(movement->>'id')::uuid) or movement->>'action'<>'add' or (movement->>'quantity')::numeric<>qty or (movement->>'batch_id')::uuid is distinct from l.batch_id then raise exception using errcode='23514',message='Choose the matching batch receipt and exact animal count';end if;
    end if;
   elsif l.destination='feed' then
    movement:=farm_feed_activity_write(p_actor,'received',jsonb_build_object('date',d,'feed_type',l.feed_type,'feed_source',l.feed_source,'bags',qty,'included_in_starting_count',p_payload->'included_in_starting_count','notes',p_payload->>'notes'),null,p_payload->>'reason',md5(p_request::text||':delivery')::uuid);
    target:=jsonb_build_object('resource','farm_feed_activities','id',movement->'activity'->>'id');
   elsif l.destination='supply' then
    movement:=farm_v2_write(p_actor,'supply_transaction','create',jsonb_build_object('date',d,'item_id',l.item_id,'action','purchase','quantity_change',qty,'notes',p_payload->>'notes'),null,p_payload->>'reason',md5(p_request::text||':delivery')::uuid);
    target:=jsonb_build_object('resource','farm_supply_transactions','id',movement->>'id');
   elsif l.destination='livestock' then
    select to_jsonb(t) into target from farm_batches t where id=l.batch_id;
    movement:=farm_v2_write(p_actor,'inventory_transaction','create',jsonb_build_object('date',d,'batch_id',l.batch_id,'stock_group_id',target->'stock_group_id','product',target->>'product','action','add','quantity',qty,'reason','Purchase delivery'),null,p_payload->>'reason',md5(p_request::text||':delivery')::uuid);
    target:=jsonb_build_object('resource','farm_inventory_transactions','id',movement->>'id');
   else target:=null;end if;
   insert into farm_purchase_deliveries(purchase_id,line_id,date,actor_id,period_id,quantity,movement_resource,movement_id,notes)
   values(o.id,l.id,d,p_actor,(c->>'periodId')::uuid,qty,target->>'resource',(target->>'id')::uuid,p_payload->>'notes') returning to_jsonb(farm_purchase_deliveries.*) into result;
   perform operations_private.attach_farm_evidence(p_actor,'farm_purchase_deliveries',(result->>'id')::uuid,p_payload->'evidence_ids');
  end if;
 elsif p_operation='resolve_exception' then
  if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can reconcile this report with a reason';end if;
  select to_jsonb(e) into before_value from farm_purchase_exceptions e where id=p_id for update;
  if before_value is null then raise exception using errcode='P0002',message='Spending report not found';end if;
  if exists(select 1 from farm_operation_events where record_type='purchase_exception' and record_id=p_id and operation='resolve') then raise exception using errcode='40001',message='This report was already reconciled';end if;
  if p_payload->>'decision' is null or p_payload->>'decision' not in ('link','decline') then raise exception using errcode='22023',message='Choose a reconciliation decision';end if;
  if p_payload->>'decision'='link' then
   if p_payload->>'record_id' is null or p_payload->>'resource' is null or p_payload->>'resource' not in ('farm_purchase_payments','farm_expenses','farm_feed_purchases') then raise exception using errcode='22023',message='Choose an existing posted cost';end if;
   execute format('select to_jsonb(t) from %I t where id=$1',p_payload->>'resource') into target using (p_payload->>'record_id')::uuid;
   if target is null or target->>'voided_at' is not null or (target->>'date')::date is distinct from (before_value->>'date')::date or coalesce((target->>'amount')::numeric,(target->>'cost')::numeric) is distinct from (before_value->>'amount')::numeric then raise exception using errcode='23514',message='Match the actual date and amount to an active posted cost';end if;
   if (select period_id from manager_record_links where resource=p_payload->>'resource' and record_id=(p_payload->>'record_id')::uuid) is distinct from (before_value->>'period_id')::uuid then raise exception using errcode='42501',message='The cost must belong to this responsibility period';end if;
  elsif p_payload->>'decision'<>'decline' then raise exception using errcode='22023',message='Link a posted cost or explain why it cannot be accepted';end if;
  result:=jsonb_build_object('id',p_id,'decision',p_payload->>'decision','resource',p_payload->>'resource','record_id',p_payload->>'record_id','reason',p_payload->>'reason','resolved_at',now(),'resolved_by',p_actor);
  insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('purchase_exception',p_id,'resolve',p_actor,before_value,result,p_payload->>'reason');
 elsif p_operation='exception' then
  d:=(p_payload->>'date')::date;perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
  if coalesce(jsonb_array_length(p_payload->'evidence_ids'),0)=0 then raise exception using errcode='23514',message='Attach proof of the actual unapproved purchase for review';end if;
  insert into farm_purchase_exceptions(date,actor_id,period_id,supplier,amount,description)
  values(d,p_actor,(c->>'periodId')::uuid,p_payload->>'supplier',(p_payload->>'amount')::numeric,p_payload->>'description') returning to_jsonb(farm_purchase_exceptions.*) into result;
  perform operations_private.attach_farm_evidence(p_actor,'farm_purchase_exceptions',(result->>'id')::uuid,p_payload->'evidence_ids');
 else raise exception using errcode='22023',message='Unknown purchase operation';end if;
 perform set_config('farm.purchase_decision','',true);
 new_id:=(result->>'id')::uuid;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('purchase',new_id,p_operation,p_actor,before_value,result,p_payload->>'reason');
 insert into farm_purchase_receipts values(p_actor,p_request,fp,result);
 return result;
end $$;
create function public.farm_purchase_read(p_actor uuid,p_period uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;result jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);
 select coalesce(jsonb_agg(to_jsonb(o)||jsonb_build_object('total_exact',o.total::text,
  'paid_exact',(select coalesce(sum(amount),0)::text from farm_purchase_payments where purchase_id=o.id and voided_at is null),
  'lines',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('received_exact',(select coalesce(sum(quantity),0)::text from farm_purchase_deliveries where line_id=l.id))),'[]') from farm_purchase_lines l where l.purchase_id=o.id),
  'payments',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('amount_exact',p.amount::text) order by p.date,p.created_at),'[]') from farm_purchase_payments p where p.purchase_id=o.id),
  'deliveries',(select coalesce(jsonb_agg(to_jsonb(d) order by d.date,d.created_at),'[]') from farm_purchase_deliveries d where d.purchase_id=o.id)) order by o.created_at desc),'[]') into result
 from farm_purchases o where operations_private.record_visible(p_actor,'farm_purchases',to_jsonb(o),(c->>'periodId')::uuid);
 return jsonb_build_object('purchases',result,'policy',(select to_jsonb(p) from farm_purchase_policies p order by created_at desc,id desc limit 1),
  'exceptions',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('amount_exact',e.amount::text,'matching_costs',(select coalesce(jsonb_agg(jsonb_build_object('resource',t.resource,'id',t.id,'label',t.label)),'[]') from (
 select p.id,p.date,p.amount,p.voided_at,'farm_purchase_payments' resource,p.recipient label from farm_purchase_payments p
 union all select x.id,x.date,x.amount,x.voided_at,'farm_expenses',x.category from farm_expenses x
 union all select f.id,f.date,f.cost,null::timestamptz,'farm_feed_purchases',f.feed_type from farm_feed_purchases f
 ) t where t.date=e.date and t.amount=e.amount and t.voided_at is null and exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) and exists(select 1 from manager_record_links link where link.resource=t.resource and link.record_id=t.id and link.period_id is not distinct from e.period_id)),
 'resolution',(select after_value from farm_operation_events where record_type='purchase_exception' and record_id=e.id and operation='resolve'))),'[]') from farm_purchase_exceptions e where operations_private.record_visible(p_actor,'farm_purchase_exceptions',to_jsonb(e),(c->>'periodId')::uuid)));
end $$;
alter function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) rename to farm_v2_write_before_purchase_approval;
create function public.farm_v2_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_kind in ('inventory_transaction','supply_transaction') and p_operation='update' and exists(select 1 from farm_purchase_deliveries where movement_id=p_id and movement_resource=case p_kind when 'inventory_transaction' then 'farm_inventory_transactions' else 'farm_supply_transactions' end) then raise exception using errcode='23514',message='This receipt is linked to a purchase delivery. Preserve its history; record a separate verified physical stock adjustment instead';end if;
 if p_kind='feed' and p_operation='create' and (select purchasing_enabled from operations_release_state)
 and not exists(select 1 from manager_write_receipts where actor_id=p_actor and request_id=p_request_id)
 and not exists(select 1 from farm_write_receipts where actor_id=p_actor and request_id=p_request_id)
 and not exists(select 1 from manager_pending_expenses where id=nullif(current_setting('operations.resolving_pending',true),'')::uuid and kind='feed' and writer='farm_v2_write' and status='pending') then
  raise exception using errcode='23514',message='This saved purchase needs review under the new approval workflow. Keep the original entry and use Purchases & deliveries; report any actual unapproved spending for Bimbo.';
 end if;
 return farm_v2_write_before_purchase_approval(p_actor,p_kind,p_operation,p_payload,p_id,p_reason,p_request_id);
end $$;
revoke all on function farm_v2_write_before_purchase_approval(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_v2_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
create function public.farm_purchase_delivery_choices(p_actor uuid,p_line uuid,p_period uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;l farm_purchase_lines;rows jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);select * into l from farm_purchase_lines where id=p_line;
 if l.id is null then raise exception using errcode='P0002',message='Purchase line not found';end if;
 perform operations_private.require_record(p_actor,'farm_purchases',l.purchase_id,(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'date',date,'quantity',quantity::text,'notes',notes) order by date desc,id),'[]') into rows from (
 select a.id,a.activity_date date,a.bags::numeric quantity,a.notes,'farm_feed_activities' resource from farm_feed_activities a join farm_feed_stock s on s.id=a.stock_id where l.destination='feed' and a.kind='received' and s.feed_type=l.feed_type and s.feed_source=l.feed_source and operations_private.record_visible(p_actor,'farm_feed_activities',to_jsonb(a),(c->>'periodId')::uuid)
 union all select a.id,a.date,a.quantity_change,a.notes,'farm_supply_transactions' from farm_supply_transactions a where l.destination='supply' and a.item_id=l.item_id and a.action='purchase' and not exists(select 1 from farm_activity where record_type='supply_transaction' and record_id=a.id and operation='update') and operations_private.record_visible(p_actor,'farm_supply_transactions',to_jsonb(a),(c->>'periodId')::uuid)
 union all select a.id,a.date,a.quantity,a.reason,'farm_inventory_transactions' from farm_inventory_transactions a where l.destination='livestock' and a.batch_id=l.batch_id and a.action='add' and a.correction_of is null and not exists(select 1 from farm_inventory_transactions r where r.correction_of=a.id) and operations_private.record_visible(p_actor,'farm_inventory_transactions',to_jsonb(a),(c->>'periodId')::uuid)
 ) t where not exists(select 1 from farm_purchase_deliveries d where d.movement_resource=t.resource and d.movement_id=t.id);
 return rows;
end $$;
revoke all on function farm_purchase_delivery_choices(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function farm_purchase_delivery_choices(uuid,uuid,uuid) to service_role;
create function operations_private.purchase_decision_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status is distinct from old.status and exists(select 1 from farm_purchases where request_id=old.id) and coalesce(current_setting('farm.purchase_decision',true),'')<>old.id::text then raise exception using errcode='23514',message='Review this structured purchase in Purchases & deliveries so the approved lines and amount stay linked';end if;
 return new;
end $$;
create trigger structured_purchase_decision before update on farm_operational_requests for each row execute function operations_private.purchase_decision_guard();
do $$ declare d text;begin
 d:=pg_get_functiondef('operations_private.farm_thread_source(uuid,text,uuid)'::regprocedure);
 if position('''farm_purchase_requests''' in d)=0 then raise exception 'Discussion precondition changed';end if;
 execute replace(d,'''farm_purchase_requests''','''farm_purchase_requests'',''farm_purchases'',''farm_purchase_payments'',''farm_purchase_deliveries'',''farm_purchase_exceptions''');
end $$;
revoke all on function operations_private.purchase_decision_guard() from public,anon,authenticated,service_role;
revoke all on function operations_private.resources(),operations_private.resources_before_purchases(),operations_private.write_resource(text,text),operations_private.write_resource_before_purchases(text,text),farm_purchase_payment_write_before_business_cash(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_purchase_write(uuid,text,jsonb,uuid,uuid),farm_purchase_read(uuid,uuid),farm_purchase_payment_write(uuid,text,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_purchase_write(uuid,text,jsonb,uuid,uuid),farm_purchase_read(uuid,uuid),farm_purchase_payment_write(uuid,text,text,jsonb,uuid,text,uuid) to service_role;
do $$ declare d text;signature regprocedure;needle text:='select coalesce(sum(p.amount) filter(where a.bucket=''owner''),0)';begin
 select p.oid::regprocedure into signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='manager_report_snapshot';
 d:=pg_get_functiondef(signature);
 if position(needle in d)=0 then raise exception 'Report reconciliation precondition changed';end if;
 execute replace(d,needle,'select owner_total-coalesce(sum(amount) filter(where expense_source<>''sales_cash''),0),sales_total-coalesce(sum(amount) filter(where expense_source=''sales_cash''),0) into owner_total,sales_total from farm_purchase_payments where voided_at is null and date<=until_date; '||needle);
end $$;
commit;
