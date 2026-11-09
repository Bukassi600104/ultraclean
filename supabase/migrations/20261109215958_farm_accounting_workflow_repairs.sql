-- Preconditions: guarded credit, purchasing and manager funding routines are installed.
-- No legacy debt/receipt backfill, historical recalculation or stock rebuild. NULL stays unknown.
-- New cancellation metadata defaults NULL. Existing approval/delivery facts remain intact.
-- Shared transaction locks protect retries. Brief DDL locks, timeout 5s.
-- Rollback must retain new receipts, audit facts and cancellation metadata after use.
begin;
set local lock_timeout='5s';
do $migration$ declare d text;old text;new text;begin
 d:=replace(pg_get_functiondef('farm_credit_write(uuid,text,jsonb,uuid,uuid)'::regprocedure),E'\r','');
 old:='credit boolean;days integer;';
 old:=replace(old,E'\r','');
 if position(old in d)=0 then raise exception 'Credit declaration precondition changed';end if;
 d:=replace(d,old,'credit boolean;days integer;received_value numeric;expected_total numeric;payment_date date;');
 old:=$p$'credit',item.value->'credit','cash_receiver',item.value->'cash_receiver','sale',item.value$p$;
 old:=replace(old,E'\r','');
 if position(old in d)=0 then raise exception 'Invoice batch precondition changed';end if;
 d:=replace(d,old,$p$'credit',item.value->'credit','amount_received',item.value->'amount_received','payment_date',item.value->'payment_date','cash_receiver',item.value->'cash_receiver','sale',item.value$p$);
 old:=$p$perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');credit:=coalesce((p_payload->>'credit')::boolean,false);$p$;
 old:=replace(old,E'\r','');
 if position(old in d)=0 then raise exception 'Invoice amount precondition changed';end if;
 new:=$p$perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');
 expected_total:=round((case when coalesce(p_payload->'sale'->>'pricing_basis',case when p_payload->'sale'->>'product'='catfish' then 'per_kg' else 'per_unit' end)='per_kg' then (p_payload->'sale'->>'weight_kg')::numeric else (p_payload->'sale'->>'quantity')::numeric end)*(p_payload->'sale'->>'unit_price')::numeric,2);
 received_value:=coalesce((p_payload->>'amount_received')::numeric,case when coalesce((p_payload->>'credit')::boolean,false) then 0 else expected_total end);
 payment_date:=coalesce((p_payload->>'payment_date')::date,d);
 if expected_total is null or expected_total<=0 or received_value<0 or received_value>expected_total or scale(received_value)>2 then raise exception using errcode='22023',message='Payment must be between zero and the sale total, with up to two decimal places';end if;
 if received_value>0 and (payment_date<d or payment_date>(now() at time zone 'Africa/Lagos')::date) then raise exception using errcode='22023',message='Use the actual payment date on or after the sale date';end if;
 credit:=received_value<expected_total;$p$;
 d:=replace(d,old,new);
 old:=$p$if not credit then
 perform farm_credit_write(p_actor,'receipt',jsonb_build_object('customer_id',customer.id,'date',d,'amount',sale->>'total_amount','cash_receiver',p_payload->'cash_receiver','notes','Payment recorded with invoice'),null,md5(p_request::text||':receipt')::uuid);$p$;
 old:=replace(old,E'\r','');
 if position(old in d)=0 then raise exception 'Invoice receipt precondition changed';end if;
 d:=replace(d,old,$p$if (sale->>'total_amount')::numeric<>expected_total then raise exception using errcode='23514',message='Sale total changed. Review the amount before saving';end if;
 if received_value>0 then
 perform farm_credit_write(p_actor,'receipt',jsonb_build_object('customer_id',customer.id,'date',payment_date,'amount',received_value,'cash_receiver',p_payload->'cash_receiver','notes','Payment recorded with invoice'),null,md5(p_request::text||':receipt')::uuid);$p$);
 execute replace(d,E'\r','');
end $migration$;
alter table farm_purchases drop constraint farm_purchases_status_check;
alter table farm_purchases add constraint farm_purchases_status_check check(status in ('pending','approved','declined','cancelled'));
alter table farm_operational_requests drop constraint farm_operational_requests_status_check;
alter table farm_operational_requests add constraint farm_operational_requests_status_check check(status in ('pending','approved','declined','resolved','cancelled'));
alter table farm_purchases add column cancelled_at timestamptz,add column cancelled_by uuid references profiles(id),add column cancel_reason text;
alter table farm_operational_requests add column cancelled_at timestamptz,add column cancelled_by uuid references profiles(id),add column cancel_reason text;
alter function farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) rename to farm_operational_request_write_before_cancel;
create function public.farm_operational_request_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_reason text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;r farm_operation_receipts;q farm_operational_requests;o farm_purchases;result jsonb;
begin
 if p_operation<>'cancel' and exists(select 1 from farm_operational_requests where id=p_id and status='cancelled') then raise exception using errcode='23514',message='This request was cancelled and cannot be changed';end if;
 if p_operation<>'cancel' then return farm_operational_request_write_before_cancel(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id);end if;
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can cancel a saved request';end if;
 if p_request_id is null or nullif(trim(p_reason),'') is null or length(p_reason)>2000 then raise exception using errcode='22023',message='Explain the cancellation and provide a retry identifier';end if;
 fp:=md5(jsonb_build_array('cancel-request',p_payload,p_id,p_reason)::text);
 c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request_id,fp,operations_private.correction_period(p_actor,'farm_operations_write','request',p_id));
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select * into r from farm_operation_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another decision';end if;return r.result;end if;
 select * into q from farm_operational_requests where id=p_id for update;
 if q.id is null then raise exception using errcode='P0002',message='Request not found';end if;
 if q.revision is distinct from (p_payload->>'expected_revision')::integer or q.status='cancelled' then raise exception using errcode='40001',message='Request changed. Refresh before cancelling';end if;
 if exists(select 1 from farm_feed_activities where review_request_id=q.id) then raise exception using errcode='23514',message='Review this stock count in Feed Inventory before closing it';end if;
 perform farm_v2_lock_date(q.request_date,true,p_reason);
 select * into o from farm_purchases where request_id=q.id for update;
 if o.id is not null then
  if exists(select 1 from farm_purchase_payments where purchase_id=o.id and voided_at is null) or exists(select 1 from farm_purchase_deliveries where purchase_id=o.id and movement_id is not null) or exists(select 1 from manager_pending_expenses where payload->>'purchase_id'=o.id::text and status='pending') then raise exception using errcode='23514',message='This purchase has payments, stock activity or a funding review. Reconcile those records before cancelling';end if;
  update farm_purchases set status='cancelled',cancelled_at=now(),cancelled_by=p_actor,cancel_reason=p_reason,revision=revision+1 where id=o.id returning to_jsonb(farm_purchases.*) into result;
  insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('purchase',o.id,'cancel',p_actor,to_jsonb(o),result,p_reason);
 end if;
 perform set_config('farm.purchase_decision',q.id::text,true);
 update farm_operational_requests set status='cancelled',cancelled_at=now(),cancelled_by=p_actor,cancel_reason=p_reason,revision=revision+1 where id=q.id returning to_jsonb(farm_operational_requests.*) into result;
 perform set_config('farm.purchase_decision','',true);
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('request',q.id,'cancel',p_actor,to_jsonb(q),result,p_reason);
 insert into farm_operation_receipts(actor_id,request_id,fingerprint,result) values(p_actor,p_request_id,fp,result);return result;
end $$;
revoke all on function farm_operational_request_write_before_cancel(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function farm_operational_request_write(uuid,text,jsonb,uuid,text,uuid) to service_role;
-- One posting attempt per report; funding-pending remains distinct from posted spending.
create table farm_exception_postings(exception_id uuid primary key references farm_purchase_exceptions(id),pending_id uuid unique references manager_pending_expenses(id),record_id uuid unique references farm_expenses(id),actor_id uuid not null references profiles(id),reason text not null,created_at timestamptz not null default now(),check(num_nonnulls(pending_id,record_id)=1));
alter table farm_exception_postings enable row level security;
revoke all on farm_exception_postings from public,anon,authenticated,service_role;
grant select on farm_exception_postings to service_role;
create trigger farm_exception_postings_immutable before update or delete on farm_exception_postings for each row execute function farm_activity_immutable();
alter function farm_purchase_write(uuid,text,jsonb,uuid,uuid) rename to farm_purchase_write_before_remediation;
create function public.farm_purchase_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;r farm_purchase_receipts;o farm_purchases;q farm_operational_requests;e farm_purchase_exceptions;posted jsonb;result jsonb;
begin
 if p_operation not in ('cancel','resolve_exception') or (p_operation='resolve_exception' and p_payload->>'decision'<>'post') then
  if p_operation='resolve_exception' and exists(select 1 from farm_exception_postings l join manager_pending_expenses p on p.id=l.pending_id where l.exception_id=p_id and p.status='pending') then raise exception using errcode='23514',message='Complete the pending funding decision first';end if;
  if p_operation='delivery' and exists(select 1 from farm_purchases where id=p_id and status='cancelled') then raise exception using errcode='23514',message='A cancelled purchase cannot receive new deliveries';end if;
  return farm_purchase_write_before_remediation(p_actor,p_operation,p_payload,p_id,p_request);
 end if;
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only Bimbo can make this decision';end if;
 if p_request is null or nullif(trim(p_payload->>'reason'),'') is null or length(p_payload->>'reason')>2000 then raise exception using errcode='22023',message='Explain the decision and provide a retry identifier';end if;
 fp:=md5(jsonb_build_array('purchase-remediation',p_operation,p_payload,p_id)::text);c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select * into r from farm_purchase_receipts where actor_id=p_actor and request_id=p_request;
 if found then if r.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another decision';end if;return r.result;end if;
 if p_operation='cancel' then
  select * into o from farm_purchases where id=p_id for update;
  if o.id is null then raise exception using errcode='P0002',message='Purchase not found';end if;
  if o.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='Purchase changed. Refresh before cancelling';end if;
  select * into q from farm_operational_requests where id=o.request_id;
  perform farm_operational_request_write(p_actor,'cancel',jsonb_build_object('expected_revision',q.revision),q.id,p_payload->>'reason',md5(p_request::text||':cancel-request')::uuid);
  select to_jsonb(t) into result from farm_purchases t where id=o.id;
 else
  select * into e from farm_purchase_exceptions where id=p_id for update;
  if e.id is null then raise exception using errcode='P0002',message='Spending report not found';end if;
  if exists(select 1 from farm_operation_events where record_type='purchase_exception' and record_id=e.id and operation='resolve') or exists(select 1 from farm_exception_postings where exception_id=e.id) then raise exception using errcode='40001',message='This report already has a decision or funding request. Refresh to review it';end if;
  if p_payload->>'category' is null or p_payload->>'category' not in ('labor','utilities','veterinary','transport','equipment','produce') then raise exception using errcode='22023',message='Choose the actual expense category';end if;
  posted:=farm_v2_write(p_actor,'expense','create',jsonb_build_object('date',e.date,'category',p_payload->>'category','amount',e.amount,'paid_to',e.supplier,'notes',e.description,'expense_source',coalesce(p_payload->>'expense_source','bimbo_transfer'),'manager_period_id',e.period_id,'cash_payer_account_id',p_payload->>'cash_payer_account_id','cash_payer_review',coalesce((p_payload->>'cash_payer_review')::boolean,false)),null,p_payload->>'reason',md5(p_request::text||':expense')::uuid);
  if posted->>'status'='pending_funding' then
   insert into farm_exception_postings(exception_id,pending_id,actor_id,reason) values(e.id,(posted->>'id')::uuid,p_actor,p_payload->>'reason');result:=posted;
  else
   insert into farm_exception_postings(exception_id,record_id,actor_id,reason) values(e.id,(posted->>'id')::uuid,p_actor,p_payload->>'reason');
   result:=farm_purchase_write_before_remediation(p_actor,'resolve_exception',jsonb_build_object('decision','link','resource','farm_expenses','record_id',posted->>'id','reason',p_payload->>'reason'),e.id,md5(p_request::text||':link')::uuid);
  end if;
 end if;
 insert into farm_purchase_receipts values(p_actor,p_request,fp,result);return result;
end $$;
revoke all on function farm_purchase_write_before_remediation(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_purchase_write(uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function farm_purchase_write(uuid,text,jsonb,uuid,uuid) to service_role;
-- Approval posts the original cost and resolves its report in the same transaction.
create function operations_private.link_exception_funding() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare link farm_exception_postings;
begin
 if new.status is distinct from old.status and new.status in ('posted','declined') then
  select * into link from farm_exception_postings where pending_id=new.id;
  if found then perform farm_purchase_write_before_remediation(new.resolved_by,'resolve_exception',jsonb_build_object('decision',case when new.status='posted' then 'link' else 'decline' end,'resource',case when new.status='posted' then 'farm_expenses' end,'record_id',new.posted_record_id,'reason',new.resolution_reason),link.exception_id,md5(new.id::text||':exception-resolution')::uuid);end if;
 end if;return new;
end $$;
revoke all on function operations_private.link_exception_funding() from public,anon,authenticated,service_role;
create trigger link_exception_funding after update on manager_pending_expenses for each row execute function operations_private.link_exception_funding();
alter function farm_purchase_read(uuid,uuid) rename to farm_purchase_read_before_remediation;
create function public.farm_purchase_read(p_actor uuid,p_period uuid default null) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 result:=farm_purchase_read_before_remediation(p_actor,p_period);
 return jsonb_set(result,'{exceptions}',coalesce((select jsonb_agg(e.value||jsonb_build_object('funding_status',(select p.status from farm_exception_postings l join manager_pending_expenses p on p.id=l.pending_id where l.exception_id=(e.value->>'id')::uuid))) from jsonb_array_elements(result->'exceptions') e),'[]'::jsonb));
end $$;
revoke all on function farm_purchase_read_before_remediation(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function farm_purchase_read(uuid,uuid) from public,anon,authenticated;
grant execute on function farm_purchase_read(uuid,uuid) to service_role;
alter function farm_credit_read(uuid,uuid,date) rename to farm_credit_read_before_payment_details;
create function public.farm_credit_read(p_actor uuid,p_period uuid default null,p_date date default (now() at time zone 'Africa/Lagos')::date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 result:=farm_credit_read_before_payment_details(p_actor,p_period,p_date);
 return jsonb_set(result,'{invoices}',coalesce((select jsonb_agg(i.value||jsonb_build_object('collected',(select coalesce(sum(operations_private.allocation_effective(a.id,p_date)),0)::text from farm_receipt_allocations a join farm_customer_receipts r on r.id=a.receipt_id where a.invoice_id=(i.value->>'id')::uuid and r.voided_at is null and r.date<=p_date),'credited',(select coalesce(sum(n.amount),0)::text from farm_credit_notes n where n.invoice_id=(i.value->>'id')::uuid and n.voided_at is null and n.date<=p_date))) from jsonb_array_elements(result->'invoices') i),'[]'::jsonb));
end $$;
revoke all on function farm_credit_read_before_payment_details(uuid,uuid,date) from public,anon,authenticated,service_role;
revoke all on function farm_credit_read(uuid,uuid,date) from public,anon,authenticated;
grant execute on function farm_credit_read(uuid,uuid,date) to service_role;
commit;
