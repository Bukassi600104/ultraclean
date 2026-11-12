-- New handoffs use existing requests, decisions, purchase lines, payments and private evidence.
begin;
set local lock_timeout='5s';
alter table farm_operational_requests add column request_details jsonb;
alter table farm_purchase_deliveries add column delivered_by text check(delivered_by in ('sales_procurement','supplier','farm_supervisor'));
create table farm_procurement_assignments(
 id uuid primary key default gen_random_uuid(),request_id uuid not null references farm_operational_requests,
 period_id uuid references manager_periods,assigned_by uuid not null references profiles,created_at timestamptz not null default clock_timestamp());
create index farm_procurement_current_assignment on farm_procurement_assignments(request_id,created_at desc,id desc);
create table farm_procurements(
 purchase_id uuid primary key references farm_purchases,request_id uuid not null unique references farm_operational_requests,
 recorded_by uuid not null references profiles,recorded_at timestamptz not null default now());
create table farm_purchase_dispatches(
 id uuid primary key default gen_random_uuid(),line_id uuid not null references farm_purchase_lines,date date not null,
 quantity numeric not null check(quantity>0),notes text,actor_id uuid not null references profiles,created_at timestamptz not null default now());
create index farm_dispatch_line on farm_purchase_dispatches(line_id);
do $$declare t text;begin
 foreach t in array array['farm_procurement_assignments','farm_procurements','farm_purchase_dispatches'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public,anon,authenticated,service_role',t);
  execute format('grant select on %I to service_role',t);
  execute format('create trigger immutable_handoff_fact before update or delete on %I for each row execute function farm_activity_immutable()',t);
 end loop;
end $$;

create function operations_private.new_request_fields() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 new.request_details:=nullif(current_setting('farm.new_request_details',true),'')::jsonb;
 return new;
end $$;
create trigger request_fields_on_create before insert on farm_operational_requests for each row execute function operations_private.new_request_fields();

create function operations_private.delivery_party_on_insert() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 new.delivered_by:=nullif(current_setting('farm.delivery_party',true),'');
 return new;
end $$;
create trigger delivery_party_on_create before insert on farm_purchase_deliveries for each row execute function operations_private.delivery_party_on_insert();

create function operations_private.assigned_buyer(request_id uuid,actor_id uuid,actor_period uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from (select a.period_id from farm_procurement_assignments a where a.request_id=$1 order by a.created_at desc,a.id desc limit 1) latest
 join manager_periods p on p.id=latest.period_id join profiles pr on pr.id=p.manager_id and pr.role='manager' and not pr.suspended
 where p.id=$3 and p.manager_id=$2 and p.business='farm' and p.status='active' and p.ended_at is null and (p.starts_on is null or p.starts_on<=(now() at time zone 'Africa/Lagos')::date));
$$;
revoke all on function operations_private.new_request_fields(),operations_private.delivery_party_on_insert(),operations_private.assigned_buyer(uuid,uuid,uuid) from public,anon,authenticated,service_role;

alter function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) rename to farm_operational_request_write_before_handoff;
revoke all on function public.farm_operational_request_write_before_handoff(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.farm_operational_request_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare details jsonb:=p_payload->'request_details'; line jsonb; dest text; c jsonb; fp text; result jsonb; receipt farm_operation_receipts; previous text:=current_setting('farm.new_request_details',true);
begin
 if p_operation<>'create' or not (p_payload?'request_details') then
  if p_operation='cancel' then
   -- All guarded farm writes acquire this lock first, including the buyer placing the order.
   perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
  end if;
  if p_operation='cancel' and exists(select 1 from farm_procurements where request_id=p_id) then raise exception using errcode='23514',message='This purchase has already been made. Review its payment and delivery records';end if;
  if p_operation='resolve' and exists(select 1 from farm_operational_requests where id=p_id and request_details?'purchase_category') then
   raise exception using errcode='23514',message='Track this purchase in Deliveries';end if;
  return farm_operational_request_write_before_handoff(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id);
 end if;
 if p_request_id is null or p_id is not null or jsonb_typeof(details) is distinct from 'object' or octet_length(details::text)>40000 or
    (details->>'needed_on') is null or (details->>'needed_on')::date<(p_payload->>'request_date')::date or
    coalesce(length(trim(details->>'why_needed')),0) not between 1 and 2000 or jsonb_typeof(details->'items') is distinct from 'array' or
    (details ? 'purchase_category' and (coalesce(details->>'purchase_category','') not in ('feed','equipment','veterinary','repair','maintenance','other') or jsonb_array_length(details->'items') not between 1 and 50)) or
    (not (details?'purchase_category') and jsonb_array_length(details->'items')<>0) then
   raise exception using errcode='22023',message='Check when the request is needed, why and the items requested';end if;
 fp:=md5(jsonb_build_array('operational-handoff',p_payload)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request_id,fp);
 select * into receipt from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if receipt.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to another request';end if;return receipt.result;end if;
 for line in select value from jsonb_array_elements(details->'items') loop
  dest:=line->>'destination';
  if coalesce(length(trim(line->>'description')),0) not between 1 and 500 or coalesce(length(trim(line->>'unit')),0) not between 1 and 40
    or coalesce(line->>'quantity','')!~'^[0-9]{1,7}([.][0-9]{1,3})?$' or (line->>'quantity')::numeric not between 0.001 and 1000000
    or (line?'unit_price' and coalesce(line->>'unit_price','')!~'^[0-9]{1,12}([.][0-9]{1,2})?$') or coalesce(dest,'') not in ('other','feed','supply','livestock')
    or (dest='feed') is distinct from (details->>'purchase_category'='feed') then raise exception using errcode='22023',message='Check the requested quantities, units and estimate';end if;
  if dest in ('feed','livestock') and (line->>'quantity')::numeric<>trunc((line->>'quantity')::numeric) then raise exception using errcode='22023',message='Use whole bags or animals';end if;
  if dest='feed' and (line->>'unit' is distinct from 'bags' or coalesce(line->>'feed_source','') not in ('local','foreign') or coalesce(line->>'feed_type','') not in ('fish','goat','pig','chicken','turkey','cattle','other')) then raise exception using errcode='22023',message='Choose a feed type and source';end if;
  if dest='supply' then perform operations_private.require_record(p_actor,'farm_supply_inventory',(line->>'item_id')::uuid,(c->>'periodId')::uuid);
   if not exists(select 1 from farm_supply_inventory where id=(line->>'item_id')::uuid and archived_at is null and unit=line->>'unit') then raise exception using errcode='23514',message='Choose an active supply item and its recorded unit';end if;
  elsif dest='livestock' then perform operations_private.require_record(p_actor,'farm_batches',(line->>'batch_id')::uuid,(c->>'periodId')::uuid);end if;
 end loop;
 perform set_config('farm.new_request_details',details::text,true);
 result:=farm_operational_request_write_before_handoff(p_actor,'create',p_payload-'request_details',null,p_reason,md5(p_request_id::text||':operational-handoff')::uuid);
 perform set_config('farm.new_request_details',coalesce(previous,''),true);
 insert into farm_operation_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,fp,result);
 return result;
end $$;
revoke all on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) to service_role;

alter function public.farm_purchase_write(uuid,text,jsonb,uuid,uuid) rename to farm_purchase_write_before_handoff;
revoke all on function public.farm_purchase_write_before_handoff(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated,service_role;
create function public.farm_purchase_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;is_md boolean;q farm_operational_requests;original_period uuid;assigned farm_procurement_assignments;order_row farm_purchases;
 line jsonb;price numeric;total numeric:=0;i integer:=0;d date;receipt farm_purchase_receipts;fp text;result jsonb;
 delivered numeric;sent numeric;qty numeric;ordered farm_purchase_lines;source_key text;before_party text:=current_setting('farm.delivery_party',true);quote farm_evidence;
begin
 if p_operation not in ('assign_procurement','procure','dispatch','confirm_delivery') then
  if p_operation='cancel' and exists(select 1 from farm_procurements where purchase_id=p_id) then raise exception using errcode='23514',message='This purchase has already been made. Review its payment and delivery records';end if;
  if p_operation='delivery' and exists(select 1 from farm_procurements where purchase_id=p_id) then raise exception using errcode='23514',message='Use delivery confirmation and attach a photo of the goods received';end if;
  return farm_purchase_write_before_handoff(p_actor,p_operation,p_payload,p_id,p_request);
 end if;
 if p_request is null or p_id is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>40000 then raise exception using errcode='22023',message='A saved request and retry identifier are required';end if;
 fp:=md5(jsonb_build_array('purchase-handoff',p_operation,p_payload,p_id)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) into is_md;
 select * into receipt from farm_purchase_receipts where actor_id=p_actor and request_id=p_request;
 if found then if receipt.fingerprint<>fp then raise exception using errcode='23514',message='This retry belongs to another purchase';end if;return receipt.result;end if;
 if p_operation='confirm_delivery' then
  select * into order_row from farm_purchases where id=p_id for update;
  perform operations_private.require_record(p_actor,'farm_purchases',p_id,(c->>'periodId')::uuid);
  if order_row.id is null or order_row.status<>'approved' then raise exception using errcode='23514',message='The purchase must be approved before delivery confirmation';end if;
  if is_md and nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='22023',message='Say who confirmed receipt on site';end if;
  if is_md and order_row.period_id is distinct from (c->>'periodId')::uuid then raise exception using errcode='42501',message='Open the receipt in the original supervisor period';end if;
  if not is_md and (order_row.actor_id<>p_actor or order_row.period_id is distinct from (c->>'periodId')::uuid) then raise exception using errcode='42501',message='The requesting supervisor confirms receipt';end if;
  if coalesce(p_payload->>'delivered_by','') not in ('sales_procurement','supplier','farm_supervisor') or jsonb_typeof(p_payload->'evidence_ids') is distinct from 'array' or jsonb_array_length(p_payload->'evidence_ids') not between 1 and 6 then raise exception using errcode='22023',message='Choose who delivered the goods and add a delivery photo';end if;
  if (p_payload->>'date')::date<order_row.date then raise exception using errcode='23514',message='Delivery cannot precede the recorded purchase';end if;
  perform set_config('farm.delivery_party',p_payload->>'delivered_by',true);
  result:=farm_purchase_write_before_handoff(p_actor,'delivery',p_payload-'delivered_by',p_id,md5(p_request::text||':delivery-confirmed')::uuid);
  perform set_config('farm.delivery_party',coalesce(before_party,''),true);
  if exists(select 1 from farm_procurements where purchase_id=order_row.id) and not exists(select 1 from farm_purchase_lines l where l.purchase_id=order_row.id and l.quantity>(select coalesce(sum(d.quantity),0) from farm_purchase_deliveries d where d.line_id=l.id)) then
   perform set_config('farm.purchase_decision',order_row.request_id::text,true);
   update farm_operational_requests set status='resolved',resolution='All purchased items received',resolved_at=now(),revision=revision+1 where id=order_row.request_id and status='approved';
   insert into farm_operation_events(record_type,record_id,operation,actor_id,after_value,reason) values('request',order_row.request_id,'delivery_complete',p_actor,result,p_payload->>'reason');
   perform set_config('farm.purchase_decision','',true);
  end if;
 else
  select * into q from farm_operational_requests where id=p_id for update;
  if q.id is null or q.status not in ('approved','resolved') or not coalesce(q.request_details?'purchase_category',false) then raise exception using errcode='42501',message='An approved operational purchase request is required';end if;
  select period_id into original_period from manager_record_links where resource='farm_operational_requests' and record_id=q.id;
  select * into assigned from farm_procurement_assignments where request_id=q.id order by created_at desc,id desc limit 1;
  if is_md then perform operations_private.require_record(p_actor,'farm_operational_requests',q.id,(c->>'periodId')::uuid);
  elsif p_operation='assign_procurement' or not operations_private.assigned_buyer(q.id,p_actor,(c->>'periodId')::uuid) then raise exception using errcode='42501',message='The MD assigns procurement for this request';end if;
  if p_operation='assign_procurement' then
   if assigned.id is distinct from (p_payload->>'previous_id')::uuid then raise exception using errcode='40001',message='Assignment changed. Reopen the request';end if;
   if p_payload->>'period_id' is not null and not exists(select 1 from manager_periods mp join profiles p on p.id=mp.manager_id where mp.id=(p_payload->>'period_id')::uuid and mp.status='active' and mp.ended_at is null and mp.business='farm' and p.role='manager' and not p.suspended and (mp.starts_on is null or mp.starts_on<=(now() at time zone 'Africa/Lagos')::date)) then raise exception using errcode='23514',message='Choose an active farm account';end if;
   insert into farm_procurement_assignments(request_id,period_id,assigned_by) values(q.id,(p_payload->>'period_id')::uuid,p_actor) returning to_jsonb(farm_procurement_assignments.*) into result;
  elsif p_operation='procure' then
   if exists(select 1 from farm_purchases where request_id=q.id) then raise exception using errcode='40001',message='This request already has a purchase';end if;
   d:=(p_payload->>'date')::date;
   if d is null or d<(q.decision_at at time zone 'Africa/Lagos')::date or d>(now() at time zone 'Africa/Lagos')::date or coalesce(length(trim(p_payload->>'supplier')),0) not between 1 and 200 then raise exception using errcode='22023',message='Enter the actual supplier and purchase date after approval';end if;
   perform farm_v2_lock_date(d,is_md,p_payload->>'reason');
   if jsonb_typeof(p_payload->'prices') is distinct from 'array' or jsonb_array_length(p_payload->'prices')<>jsonb_array_length(q.request_details->'items') then raise exception using errcode='22023',message='Enter a price for each requested item';end if;
   for line in select value from jsonb_array_elements(q.request_details->'items') loop
    if coalesce(p_payload->'prices'->>i,'')!~'^[0-9]{1,12}([.][0-9]{1,2})?$' then raise exception using errcode='22023',message='Enter the actual unit price';end if;
    total:=total+round((line->>'quantity')::numeric*(p_payload->'prices'->>i)::numeric,2);i:=i+1;
   end loop;
   if total<=0 then raise exception using errcode='22023',message='The actual purchase total must be positive';end if;
   if original_period is not null and not exists(select 1 from manager_periods mp join profiles p on p.id=mp.manager_id where mp.id=original_period and mp.manager_id=q.requested_by and mp.ended_at is null and mp.status='active' and not p.suspended) then raise exception using errcode='42501',message='The original supervisor period is closed; review the handover with the MD';end if;
   insert into farm_purchases(request_id,date,actor_id,period_id,supplier,category,description,total,status,decision_by,decision_at,decision_reason)
   values(q.id,d,q.requested_by,original_period,trim(p_payload->>'supplier'),q.request_details->>'purchase_category',q.description,total,'approved',q.decision_by,q.decision_at,q.ceo_response) returning * into order_row;
   i:=0;
   for line in select value from jsonb_array_elements(q.request_details->'items') loop
    insert into farm_purchase_lines(purchase_id,description,quantity,unit_price,unit,destination,feed_type,feed_source,item_id,batch_id)
    values(order_row.id,line->>'description',(line->>'quantity')::numeric,(p_payload->'prices'->>i)::numeric,line->>'unit',line->>'destination',line->>'feed_type',line->>'feed_source',(line->>'item_id')::uuid,(line->>'batch_id')::uuid);i:=i+1;
   end loop;
   if (select require_quote from farm_purchase_policies order by created_at desc,id desc limit 1) and coalesce(jsonb_array_length(p_payload->'evidence_ids'),0)=0 then raise exception using errcode='23514',message='Attach the supplier quotation required by the MD';end if;
   if p_payload?'evidence_ids' then
    if jsonb_typeof(p_payload->'evidence_ids') is distinct from 'array' or jsonb_array_length(p_payload->'evidence_ids')>6 then raise exception using errcode='22023',message='Choose up to six quotation photos';end if;
    for source_key in select jsonb_array_elements_text(p_payload->'evidence_ids') loop
     select * into quote from farm_evidence where id=source_key::uuid for update;
     if quote.id is null or quote.actor_id<>p_actor or quote.period_id is distinct from (c->>'periodId')::uuid or quote.status<>'uploaded' or quote.target_resource<>'farm_purchases' or quote.activity_date<>d or quote.record_id is not null or quote.batch_id is not null then raise exception using errcode='23514',message='Use a quotation uploaded for this purchase date and account';end if;
     update farm_evidence set record_id=order_row.id,linked_at=now() where id=quote.id;
    end loop;
   end if;
   insert into farm_procurements(purchase_id,request_id,recorded_by) values(order_row.id,q.id,p_actor);
   result:=jsonb_build_object('id',order_row.id,'request_id',q.id,'total_exact',total::text,'status','purchased');
  else
   if q.status='resolved' then raise exception using errcode='23514',message='All purchased goods have been received';end if;
   select * into order_row from farm_purchases where request_id=q.id and status='approved' for update;
   select * into ordered from farm_purchase_lines where purchase_id=order_row.id and id=(p_payload->>'line_id')::uuid;
   d:=(p_payload->>'date')::date;qty:=(p_payload->>'quantity')::numeric;
   if ordered.id is null or qty is null or qty<=0 or d is null or d<order_row.date or d>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='23514',message='Choose a purchased item, date and quantity sent';end if;
   perform farm_v2_lock_date(d,is_md,p_payload->>'reason');
   select coalesce(sum(quantity),0) into sent from farm_purchase_dispatches where line_id=ordered.id;
   if sent+qty>ordered.quantity or (ordered.destination in ('feed','livestock') and qty<>trunc(qty)) then raise exception using errcode='23514',message='Check the remaining quantity to send';end if;
   insert into farm_purchase_dispatches(line_id,date,quantity,notes,actor_id) values(ordered.id,d,qty,p_payload->>'notes',p_actor) returning to_jsonb(farm_purchase_dispatches.*) into result;
  end if;
 end if;
 insert into farm_purchase_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request,fp,result);
 return result;
end $$;
revoke all on function public.farm_purchase_write(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.farm_purchase_write(uuid,text,jsonb,uuid,uuid) to service_role;
-- Assignment permits the existing guarded payment writer to charge the actual payer for this order only.
do $$ declare definition text;needle text:='perform operations_private.require_record(p_actor,''farm_purchases'',o.id,(c->>''periodId'')::uuid);';begin
 definition:=pg_get_functiondef('public.farm_purchase_payment_write_before_business_cash(uuid,text,text,jsonb,uuid,text,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Purchase payment permission precondition changed';end if;
 execute replace(definition,needle,$guard$
  if exists(select 1 from farm_procurements where purchase_id=o.id) and not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then
   if not operations_private.assigned_buyer(o.request_id,p_actor,(c->>'periodId')::uuid) then raise exception using errcode='42501',message='Only the assigned buyer or MD records this purchase payment';end if;
  else perform operations_private.require_record(p_actor,'farm_purchases',o.id,(c->>'periodId')::uuid);end if;
 $guard$);
end $$;

create function public.farm_purchase_handoff_read(p_actor uuid,p_period uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;is_md boolean;result jsonb;tasks jsonb;people jsonb:='[]';
begin
 c:=manager_context(p_actor,'farm',p_period);result:=farm_purchase_read(p_actor,p_period);
 select exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) into is_md;
 if is_md then select coalesce(jsonb_agg(jsonb_build_object('period_id',mp.id,'name',pr.name) order by pr.name,mp.id),'[]') into people
  from manager_periods mp join profiles pr on pr.id=mp.manager_id where mp.business='farm' and mp.status='active' and mp.ended_at is null and pr.role='manager' and not pr.suspended and (mp.starts_on is null or mp.starts_on<=(now() at time zone 'Africa/Lagos')::date);end if;
 select coalesce(jsonb_agg(jsonb_build_object('request_id',q.id,'description',q.description,'request_date',q.request_date,'details',q.request_details,
  'requester_name',pr.name,'assignment',case when a.id is null then null else jsonb_build_object('id',a.id,'period_id',a.period_id,'name',buyer.name) end,
  'can_procure',is_md or operations_private.assigned_buyer(q.id,p_actor,(c->>'periodId')::uuid),'order_id',o.id,'supplier',o.supplier,'purchased_on',o.date,
  'paid',case when o.id is not null then (select coalesce(sum(amount),0)::text from farm_purchase_payments where purchase_id=o.id and voided_at is null) end,
  'lines',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'unit',l.unit,'quantity',l.quantity::text,'unit_price',l.unit_price::text,
     'dispatched',(select coalesce(sum(quantity),0)::text from farm_purchase_dispatches where line_id=l.id),
     'received',(select coalesce(sum(quantity),0)::text from farm_purchase_deliveries where line_id=l.id)) order by l.id),'[]') from farm_purchase_lines l where l.purchase_id=o.id)
 ) order by q.request_date desc,q.id),'[]') into tasks
 from farm_operational_requests q join profiles pr on pr.id=q.requested_by left join farm_purchases o on o.request_id=q.id
 left join lateral (select * from farm_procurement_assignments a where a.request_id=q.id order by a.created_at desc,a.id desc limit 1) a on true
 left join manager_periods mp on mp.id=a.period_id left join profiles buyer on buyer.id=mp.manager_id
 where q.request_details?'purchase_category' and q.status in ('approved','resolved') and (o.id is null or o.status='approved')
 and (operations_private.record_visible(p_actor,'farm_operational_requests',to_jsonb(q),(c->>'periodId')::uuid)
 or operations_private.assigned_buyer(q.id,p_actor,(c->>'periodId')::uuid));
 return result||jsonb_build_object('procurement_tasks',tasks,'procurement_people',people);
end $$;
revoke all on function public.farm_purchase_handoff_read(uuid,uuid) from public,anon,authenticated;
grant execute on function public.farm_purchase_handoff_read(uuid,uuid) to service_role;
commit;
