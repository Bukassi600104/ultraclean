-- Preconditions: guarded sales/cash, manager periods, private evidence and store ledgers.
-- Additive identities/invoices/receipts only; no inferred legacy debt or cash backfill.
-- Original cash sales retain their meaning. NGN numeric arithmetic; no credit ceiling.
-- Brief DDL locks and shared writer/customer locks serialize allocation and corrections.
-- Rollback retains new records and guarded routines after use; never recalculate legacy sales.
begin;
set local lock_timeout='5s';
create table farm_customers(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 200),phone text,notes text,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),date date not null default (now() at time zone 'Africa/Lagos')::date,created_at timestamptz not null default now());
create table farm_customer_assignments(id uuid primary key default gen_random_uuid(),customer_id uuid not null references farm_customers(id),period_id uuid not null references manager_periods(id),actor_id uuid not null references profiles(id),created_at timestamptz not null default now(),unique(customer_id,period_id));
create table farm_customer_terms(id uuid primary key default gen_random_uuid(),customer_id uuid not null references farm_customers(id),days integer not null check(days between 0 and 3650),actor_id uuid not null references profiles(id),reason text not null,created_at timestamptz not null default now());
create sequence farm_invoice_number;
create table farm_invoices(id uuid primary key default gen_random_uuid(),number text not null unique default ('PF-'||lpad(nextval('farm_invoice_number')::text,8,'0')),customer_id uuid not null references farm_customers(id),sale_id uuid unique references farm_sales(id),date date not null,due_date date not null,terms_id uuid references farm_customer_terms(id),credit_days integer not null check(credit_days>=0),currency text not null default 'NGN' check(currency='NGN'),actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),created_at timestamptz not null default now());
create table farm_customer_receipts(id uuid primary key default gen_random_uuid(),customer_id uuid not null references farm_customers(id),date date not null,amount numeric not null check(amount>0 and amount<=1000000000000000 and scale(amount)<=2),currency text not null default 'NGN' check(currency='NGN'),actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),notes text,created_at timestamptz not null default now(),voided_at timestamptz,voided_by uuid references profiles(id),void_reason text,revision integer not null default 0);
create table farm_customer_refunds(id uuid primary key default gen_random_uuid(),receipt_id uuid not null references farm_customer_receipts(id),date date not null,amount numeric not null check(amount>0 and scale(amount)<=2),expense_source text not null default 'sales_cash' check(expense_source='sales_cash'),reason text not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),created_at timestamptz not null default now(),voided_at timestamptz,voided_by uuid references profiles(id),void_reason text,revision integer not null default 0);
create table farm_receipt_allocations(id uuid primary key default gen_random_uuid(),receipt_id uuid not null references farm_customer_receipts(id),invoice_id uuid not null references farm_invoices(id),amount numeric not null check(amount>0 and scale(amount)<=2),created_at timestamptz not null default now(),unique(receipt_id,invoice_id));
create table farm_credit_notes(id uuid primary key default gen_random_uuid(),product text not null,invoice_id uuid not null references farm_invoices(id),date date not null,amount numeric not null check(amount>0 and scale(amount)<=2),reason text not null,actor_id uuid not null references profiles(id),period_id uuid references manager_periods(id),created_at timestamptz not null default now());
alter table farm_credit_notes add column voided_at timestamptz, add column voided_by uuid references profiles(id), add column void_reason text;
create table farm_credit_retries(actor_id uuid not null references profiles(id),request_id uuid not null,fingerprint text not null,result jsonb not null,primary key(actor_id,request_id));
alter function operations_private.resources() rename to resources_before_credit;
create function operations_private.resources() returns table(resource text,business text,date_column text,actor_column text,is_asset boolean) language sql immutable set search_path=public,pg_temp as $$
 select * from operations_private.resources_before_credit() union all values ('farm_customers','farm','date','actor_id',false),('farm_invoices','farm','date','actor_id',false),('farm_customer_receipts','farm','date','actor_id',false),('farm_credit_notes','farm','date','actor_id',false),('farm_customer_refunds','farm','date','actor_id',false)
$$;
do $$ declare t text;begin
 foreach t in array array['farm_customers','farm_customer_assignments','farm_customer_terms','farm_invoices','farm_customer_receipts','farm_receipt_allocations','farm_credit_notes','farm_credit_retries','farm_customer_refunds'] loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated,service_role',t);execute format('grant select on %I to service_role',t);
 if t in ('farm_customers','farm_invoices','farm_customer_receipts','farm_credit_notes','farm_customer_refunds') then execute format('create trigger manager_record_guard before insert or update on %I for each row execute function operations_private.guard_record()',t);execute format('create trigger manager_record_attribution after insert on %I for each row execute function operations_private.tag_record()',t);end if;
 if t not in ('farm_invoices','farm_customer_receipts','farm_customer_refunds','farm_credit_notes') then execute format('create trigger credit_fact_immutable before update or delete on %I for each row execute function farm_activity_immutable()',t);end if;
 end loop;
end $$;
create function operations_private.customer_allowed(p_actor uuid,p_customer uuid,p_period uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from farm_customers c where c.id=p_customer and (exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) or (c.actor_id=p_actor and c.period_id is not distinct from p_period) or exists(select 1 from farm_customer_assignments a where a.customer_id=c.id and a.period_id=p_period)))
$$;
create function operations_private.invoice_due(p_invoice uuid,p_date date default '9999-12-31') returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select case when s.voided_at is null then s.total_amount else 0 end-coalesce((select sum(n.amount) from farm_credit_notes n where n.invoice_id=i.id and n.voided_at is null and n.date<=p_date),0)-coalesce((select sum(a.amount) from farm_receipt_allocations a join farm_customer_receipts r on r.id=a.receipt_id where a.invoice_id=i.id and r.voided_at is null and r.date<=p_date),0) from farm_invoices i join farm_sales s on s.id=i.sale_id where i.id=p_invoice
$$;
alter table farm_sales add column invoice_id uuid unique references farm_invoices(id);
create function operations_private.credit_sale_identity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare link uuid:=nullif(current_setting('farm.creating_invoice',true),'')::uuid;
begin
 if tg_op='INSERT' then
 if new.invoice_id is not null and new.invoice_id is distinct from link then raise exception using errcode='42501',message='Invoice identity is server assigned';end if;
 new.invoice_id:=link;
 elsif new.invoice_id is distinct from old.invoice_id then raise exception using errcode='23514',message='An issued sale retains its invoice identity';end if;return new;
end $$;
create trigger credit_sale_identity before insert or update on farm_sales for each row execute function operations_private.credit_sale_identity();
revoke all on function operations_private.credit_sale_identity() from public,anon,authenticated,service_role;
-- Only an internally created, owned invoice can suppress the original cash-sale effect.
create function operations_private.link_credit_sale() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare invoice farm_invoices;link uuid:=nullif(current_setting('farm.creating_invoice',true),'')::uuid;
begin
 if tg_op='INSERT' and link is not null then
 select * into invoice from farm_invoices where id=link and sale_id is null and actor_id=nullif(current_setting('operations.actor',true),'')::uuid for update;
 if invoice.id is null or invoice.date<>new.date then raise exception using errcode='23514',message='Invalid invoice source';end if;
 update farm_invoices set sale_id=new.id where id=invoice.id;
 elsif tg_op='UPDATE' then
 select * into invoice from farm_invoices where sale_id=new.id;
 if invoice.id is not null then
 if new.date<>old.date or new.customer_name is distinct from old.customer_name then raise exception using errcode='23514',message='An issued invoice retains its customer and issue date; use an audited credit and new invoice';end if;
 if operations_private.invoice_due(invoice.id)<0 then raise exception using errcode='23514',message='This correction would reduce an invoice below its allocated receipts and credits';end if;
 end if;
 end if;return new;
end $$;
create trigger link_credit_sale after insert or update on farm_sales for each row execute function operations_private.link_credit_sale();
do $$ declare d text;needle text:=' select * into actor_row from profiles where id=p_actor and not suspended;';begin
 d:=pg_get_functiondef('operations_private.business_cash_effect(uuid,text,text,text,jsonb,jsonb,uuid,text)'::regprocedure);
 if position(needle in d)=0 then raise exception 'Cash-effect precondition changed';end if;
 execute replace(d,needle,' if p_writer=''farm_v2_write'' and p_kind=''sale'' and exists(select 1 from farm_invoices where sale_id=(p_row->>''id'')::uuid) then return null;end if;'||needle);
end $$;
alter function operations_private.write_resource(text,text) rename to write_resource_before_credit;
create function operations_private.write_resource(p_writer text,p_kind text) returns text language sql immutable set search_path=public,pg_temp as $$ select case when p_writer='farm_customer_receipt' then 'farm_customer_receipts' when p_writer='farm_customer_refund' then 'farm_customer_refunds' else operations_private.write_resource_before_credit(p_writer,p_kind) end $$;
create function public.farm_credit_write(p_actor uuid,p_operation text,p_payload jsonb,p_id uuid default null,p_request uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;fp text;retry farm_credit_retries;result jsonb;before_value jsonb;customer farm_customers;terms farm_customer_terms;invoice farm_invoices;receipt farm_customer_receipts;refund farm_customer_refunds;note farm_credit_notes;payer uuid;is_admin boolean;d date;amount_value numeric;remaining numeric;due numeric;part numeric;item record;sale jsonb;credit boolean;days integer;batch_results jsonb:='[]';nested jsonb;position integer:=0;old_context text:=current_setting('farm.creating_invoice',true);
begin
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception using errcode='22023',message='Details and retry identity required';end if;
 fp:=md5(jsonb_build_array('credit',p_operation,p_payload,p_id)::text);c:=operations_private.prepare_write(p_actor,'farm',p_payload,p_request,fp);
 is_admin:=exists(select 1 from profiles where id=p_actor and role='admin' and not suspended);
 perform pg_advisory_xact_lock(hashtextextended('primefield-v2-writes',0));
 select * into retry from farm_credit_retries where actor_id=p_actor and request_id=p_request;
 if found then if retry.fingerprint<>fp then raise exception using errcode='23514',message='Retry belongs to another entry';end if;return retry.result;end if;
 d:=coalesce((p_payload->>'date')::date,(now() at time zone 'Africa/Lagos')::date);
 if d>(now() at time zone 'Africa/Lagos')::date then raise exception using errcode='22023',message='Use the actual activity date';end if;
 if p_operation='invoice_batch' then
 if jsonb_typeof(p_payload->'rows')<>'array' or jsonb_array_length(p_payload->'rows') not between 1 and 50 then raise exception using errcode='22023',message='One to fifty invoice rows required';end if;
 for item in select value from jsonb_array_elements(p_payload->'rows') loop
 nested:=farm_credit_write(p_actor,'invoice',jsonb_build_object('date',item.value->>'date','customer_id',item.value->>'customer_id','credit',item.value->'credit','cash_receiver',item.value->'cash_receiver','sale',item.value),null,md5(p_request::text||':invoice:'||position::text)::uuid);
 select to_jsonb(s)||jsonb_build_object('total_amount_exact',s.total_amount::text,'invoice_number',nested->>'number') into sale from farm_sales s where s.id=(nested->>'sale_id')::uuid;
 batch_results:=batch_results||jsonb_build_array(sale);position:=position+1;
 end loop;result:=jsonb_build_object('id',p_request,'rows',batch_results);
 elsif p_operation='customer' then
 insert into farm_customers(name,phone,notes,actor_id,period_id) values(p_payload->>'name',p_payload->>'phone',p_payload->>'notes',p_actor,(c->>'periodId')::uuid) returning to_jsonb(farm_customers.*) into result;
 elsif p_operation in ('terms','assign') then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can approve customer terms or assignments with a reason';end if;
 if p_operation='terms' then insert into farm_customer_terms(customer_id,days,actor_id,reason) values(p_id,(p_payload->>'days')::integer,p_actor,p_payload->>'reason') returning to_jsonb(farm_customer_terms.*) into result;
 else
 if not exists(select 1 from manager_periods where id=(p_payload->>'period_id')::uuid and business='farm' and status='active') then raise exception using errcode='23514',message='Choose an active farm responsibility';end if;
 insert into farm_customer_assignments(customer_id,period_id,actor_id) values(p_id,(p_payload->>'period_id')::uuid,p_actor) returning to_jsonb(farm_customer_assignments.*) into result;end if;
 elsif p_operation='invoice' then
 select * into customer from farm_customers where id=(p_payload->>'customer_id')::uuid;
 if not operations_private.customer_allowed(p_actor,customer.id,(c->>'periodId')::uuid) then raise exception using errcode='42501',message='Choose an assigned customer';end if;
 perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');credit:=coalesce((p_payload->>'credit')::boolean,false);
 select * into terms from farm_customer_terms where customer_id=customer.id order by created_at desc,id desc limit 1;
 if credit and coalesce(terms.days,0)<=0 then raise exception using errcode='23514',message='Bimbo must approve payment terms in days before a credit sale';end if;
 days:=case when credit then terms.days else 0 end;
 insert into farm_invoices(customer_id,date,due_date,terms_id,credit_days,actor_id,period_id) values(customer.id,d,d+days,case when credit then terms.id end,days,p_actor,(c->>'periodId')::uuid) returning * into invoice;
 perform set_config('farm.creating_invoice',invoice.id::text,true);
 sale:=farm_v2_write(p_actor,'sale','create',(p_payload->'sale')||jsonb_build_object('date',d,'customer_name',customer.name),null,null,md5(p_request::text||':sale')::uuid);
 perform set_config('farm.creating_invoice',coalesce(old_context,''),true);
 if not credit then
 perform farm_credit_write(p_actor,'receipt',jsonb_build_object('customer_id',customer.id,'date',d,'amount',sale->>'total_amount','cash_receiver',p_payload->'cash_receiver','notes','Payment recorded with invoice'),null,md5(p_request::text||':receipt')::uuid);
 -- Existing older debt has priority; a new cash invoice may remain unpaid after FIFO.
 end if;
 select to_jsonb(i)||jsonb_build_object('total_exact',sale->>'total_amount') into result from farm_invoices i where id=invoice.id;
 elsif p_operation='receipt' then
 select * into customer from farm_customers where id=(p_payload->>'customer_id')::uuid;
 if not operations_private.customer_allowed(p_actor,customer.id,(c->>'periodId')::uuid) then raise exception using errcode='42501',message='Choose an assigned customer';end if;
 if exists(select 1 from farm_customer_receipts where customer_id=customer.id and voided_at is null and date>d) or exists(select 1 from farm_credit_notes n join farm_invoices i on i.id=n.invoice_id where i.customer_id=customer.id and n.voided_at is null and n.date>d) then raise exception using errcode='40001',message='Later customer activity is already posted. Retain this actual date and ask Bimbo to reconcile those entries first';end if;
 perform farm_v2_lock_date(d,is_admin,p_payload->>'reason');amount_value:=(p_payload->>'amount')::numeric;
 insert into farm_customer_receipts(customer_id,date,amount,actor_id,period_id,notes) values(customer.id,d,amount_value,p_actor,(c->>'periodId')::uuid,p_payload->>'notes') returning * into receipt;
 perform operations_private.business_cash_effect(p_actor,'farm_customer_receipt','receipt','create',to_jsonb(receipt),p_payload,receipt.period_id,null);
 remaining:=receipt.amount;
 for item in select i.id from farm_invoices i join farm_sales s on s.id=i.sale_id where i.customer_id=customer.id and i.currency=receipt.currency and i.date<=d and s.voided_at is null order by i.date,i.created_at,i.id for update of i loop
 due:=operations_private.invoice_due(item.id);part:=least(remaining,due);
 if part>0 then insert into farm_receipt_allocations(receipt_id,invoice_id,amount) values(receipt.id,item.id,part);remaining:=remaining-part;end if;
 exit when remaining<=0;
 end loop;
 result:=to_jsonb(receipt)||jsonb_build_object('amount_exact',receipt.amount::text,'unapplied_exact',remaining::text);
 elsif p_operation='void_receipt' then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can reverse a receipt with a reason';end if;
 select * into receipt from farm_customer_receipts where id=p_id for update;
 if receipt.id is null or receipt.voided_at is not null then raise exception using errcode='40001',message='Receipt missing or already reversed';end if;
 if exists(select 1 from farm_customer_refunds where receipt_id=receipt.id and voided_at is null) then raise exception using errcode='23514',message='Reconcile the linked refunds before reversing this receipt';end if;
 before_value:=to_jsonb(receipt);perform set_config('operations.period',coalesce(receipt.period_id::text,''),true);perform farm_v2_lock_date(receipt.date,true,p_payload->>'reason');
 update farm_customer_receipts set voided_at=now(),voided_by=p_actor,void_reason=p_payload->>'reason',revision=revision+1 where id=p_id returning * into receipt;
 perform operations_private.business_cash_effect(p_actor,'farm_customer_receipt','receipt','void',to_jsonb(receipt),p_payload,receipt.period_id,p_payload->>'reason');result:=to_jsonb(receipt);
 elsif p_operation in ('refund','void_refund') then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can confirm an actual refund with a reason';end if;
 if p_operation='refund' then
 select * into receipt from farm_customer_receipts where id=p_id and voided_at is null for update;
 if receipt.id is null or d<receipt.date then raise exception using errcode='23514',message='Choose an active receipt and actual refund date';end if;
 amount_value:=(p_payload->>'amount')::numeric;
 remaining:=receipt.amount-coalesce((select sum(amount) from farm_receipt_allocations where receipt_id=receipt.id),0)-coalesce((select sum(amount) from farm_customer_refunds where receipt_id=receipt.id and voided_at is null),0);
 if amount_value>remaining then raise exception using errcode='23514',message='Refund cannot exceed unapplied customer credit';end if;
 perform set_config('operations.period',coalesce(receipt.period_id::text,''),true);perform farm_v2_lock_date(d,true,p_payload->>'reason');
 select e.target_account_id into payer from operations_cash_events e where e.resource='farm_customer_receipts' and e.record_id=receipt.id and not exists(select 1 from operations_cash_events x where x.corrects_id=e.id);
 insert into farm_customer_refunds(receipt_id,date,amount,reason,actor_id,period_id) values(receipt.id,d,amount_value,p_payload->>'reason',p_actor,receipt.period_id) returning * into refund;
 perform operations_private.business_cash_effect(p_actor,'farm_customer_refund','expense','create',to_jsonb(refund),jsonb_build_object('cash_payer_account_id',payer),refund.period_id,p_payload->>'reason');
 else
 select * into refund from farm_customer_refunds where id=p_id and voided_at is null for update;
 if refund.id is null then raise exception using errcode='40001',message='Refund missing or already reversed';end if;
 before_value:=to_jsonb(refund);perform set_config('operations.period',coalesce(refund.period_id::text,''),true);perform farm_v2_lock_date(refund.date,true,p_payload->>'reason');
 update farm_customer_refunds set voided_at=now(),voided_by=p_actor,void_reason=p_payload->>'reason',revision=revision+1 where id=p_id returning * into refund;
 perform operations_private.business_cash_effect(p_actor,'farm_customer_refund','expense','void',to_jsonb(refund),p_payload,refund.period_id,p_payload->>'reason');end if;
 result:=to_jsonb(refund);
 elsif p_operation='void_credit' then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can reverse a credit with a reason';end if;
 select * into note from farm_credit_notes where id=p_id and voided_at is null for update;
 if note.id is null then raise exception using errcode='40001',message='Credit missing or already reversed';end if;
 before_value:=to_jsonb(note);perform set_config('operations.period',coalesce(note.period_id::text,''),true);perform farm_v2_lock_date(note.date,true,p_payload->>'reason');
 update farm_credit_notes set voided_at=now(),voided_by=p_actor,void_reason=p_payload->>'reason' where id=p_id returning to_jsonb(farm_credit_notes.*) into result;
 elsif p_operation='credit_note' then
 if not is_admin or nullif(trim(p_payload->>'reason'),'') is null then raise exception using errcode='42501',message='Only Bimbo can credit an invoice with a reason';end if;
 select * into invoice from farm_invoices where id=p_id for update;
 if invoice.id is null or d<invoice.date then raise exception using errcode='23514',message='Use an existing invoice and actual credit date';end if;
 amount_value:=(p_payload->>'amount')::numeric;
 if amount_value>operations_private.invoice_due(invoice.id) then raise exception using errcode='23514',message='Credit cannot exceed the unpaid invoice balance; reconcile receipts first';end if;
 perform set_config('operations.period',coalesce(invoice.period_id::text,''),true);perform farm_v2_lock_date(d,true,p_payload->>'reason');
 insert into farm_credit_notes(product,invoice_id,date,amount,reason,actor_id,period_id) values((select product from farm_sales where id=invoice.sale_id),invoice.id,d,amount_value,p_payload->>'reason',p_actor,invoice.period_id) returning to_jsonb(farm_credit_notes.*) into result;
 else raise exception using errcode='22023',message='Unknown customer operation';end if;
 if p_operation in ('receipt','refund') then perform operations_private.attach_farm_evidence(p_actor,case when p_operation='receipt' then 'farm_customer_receipts' else 'farm_customer_refunds' end,(result->>'id')::uuid,p_payload->'evidence_ids');end if;
 insert into farm_operation_events(record_type,record_id,operation,actor_id,before_value,after_value,reason) values('credit',(result->>'id')::uuid,p_operation,p_actor,before_value,result,p_payload->>'reason');
 insert into farm_credit_retries values(p_actor,p_request,fp,result);return result;
end $$;
create function public.farm_credit_read(p_actor uuid,p_period uuid default null,p_date date default (now() at time zone 'Africa/Lagos')::date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;customers jsonb;invoices jsonb;receipts jsonb;summary jsonb;credit_notes jsonb;refunds jsonb;
begin
 c:=manager_context(p_actor,'farm',p_period);
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('credit_days',(select days from farm_customer_terms where customer_id=t.id order by created_at desc,id desc limit 1)) order by t.name,t.id),'[]') into customers from farm_customers t where operations_private.customer_allowed(p_actor,t.id,(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'number',i.number,'customer_id',i.customer_id,'customer_name',cu.name,'sale_id',i.sale_id,'date',i.date,'due_date',i.due_date,'credit_days',i.credit_days,'total',s.total_amount::text,'owed',operations_private.invoice_due(i.id,p_date)::text,'voided_at',s.voided_at,'overdue_days',case when operations_private.invoice_due(i.id,p_date)>0 then greatest(0,p_date-i.due_date) else 0 end) order by i.date desc,i.created_at desc),'[]') into invoices from farm_invoices i join farm_sales s on s.id=i.sale_id join farm_customers cu on cu.id=i.customer_id where i.date<=p_date and operations_private.customer_allowed(p_actor,i.customer_id,(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('amount',r.amount::text,'customer_name',(select name from farm_customers where id=r.customer_id),'allocations',(select coalesce(jsonb_agg(jsonb_build_object('invoice_id',a.invoice_id,'amount',a.amount::text)),'[]') from farm_receipt_allocations a where a.receipt_id=r.id)) order by r.date desc,r.created_at desc),'[]') into receipts from farm_customer_receipts r where r.date<=p_date and operations_private.record_visible(p_actor,'farm_customer_receipts',to_jsonb(r),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('amount',n.amount::text) order by n.date desc,n.created_at desc),'[]') into credit_notes from farm_credit_notes n where n.date<=p_date and operations_private.record_visible(p_actor,'farm_credit_notes',to_jsonb(n),(c->>'periodId')::uuid);
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('amount',r.amount::text) order by r.date desc,r.created_at desc),'[]') into refunds from farm_customer_refunds r where r.date<=p_date and operations_private.record_visible(p_actor,'farm_customer_refunds',to_jsonb(r),(c->>'periodId')::uuid);
 select jsonb_build_object('revenue',coalesce((select sum(s.total_amount) from farm_invoices i join farm_sales s on s.id=i.sale_id where i.date<=p_date and s.voided_at is null and operations_private.record_visible(p_actor,'farm_invoices',to_jsonb(i),(c->>'periodId')::uuid)),0)::text,'collected',coalesce((select sum(r.amount) from farm_customer_receipts r where r.date<=p_date and r.voided_at is null and operations_private.record_visible(p_actor,'farm_customer_receipts',to_jsonb(r),(c->>'periodId')::uuid)),0)::text,'owed',coalesce((select sum((value->>'owed')::numeric) from jsonb_array_elements(invoices)),0)::text,'unapplied',coalesce((select sum(r.amount-coalesce((select sum(a.amount) from farm_receipt_allocations a where a.receipt_id=r.id),0)-coalesce((select sum(f.amount) from farm_customer_refunds f where f.receipt_id=r.id and f.voided_at is null and f.date<=p_date),0)) from farm_customer_receipts r where r.date<=p_date and r.voided_at is null and operations_private.record_visible(p_actor,'farm_customer_receipts',to_jsonb(r),(c->>'periodId')::uuid)),0)::text) into summary;
 return jsonb_build_object('customers',customers,'invoices',invoices,'receipts',receipts,'credit_notes',credit_notes,'refunds',refunds,'summary',summary||jsonb_build_object('refunded',coalesce((select sum((value->>'amount')::numeric) from jsonb_array_elements(refunds) where value->>'voided_at' is null),0)::text));
end $$;
do $$ declare d text;signature regprocedure;needle text:='select coalesce(sum(p.amount) filter(where a.bucket=''owner''),0)';begin
 select p.oid::regprocedure into signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='manager_report_snapshot';
 d:=pg_get_functiondef(signature);if position(needle in d)=0 then raise exception 'Report credit reconciliation precondition changed';end if;
 execute replace(d,needle,'select sales_total-coalesce((select sum(total_amount) from farm_sales where invoice_id is not null and voided_at is null and date<=until_date),0)+coalesce((select sum(amount) from farm_customer_receipts where voided_at is null and date<=until_date),0)-coalesce((select sum(amount) from farm_customer_refunds where voided_at is null and date<=until_date),0) into sales_total; '||needle);
end $$;
alter table farm_evidence drop constraint farm_evidence_target_resource_check;
alter table farm_evidence add constraint farm_evidence_target_resource_check check(target_resource in ('farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks','farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions','farm_stock_counts','farm_egg_movements','farm_customer_receipts','farm_customer_refunds'));
do $$ declare d text;begin
 d:=pg_get_functiondef('operations_private.farm_thread_source(uuid,text,uuid)'::regprocedure);
 if position('''farm_egg_movements''' in d)=0 then raise exception 'Discussion precondition changed';end if;
 execute replace(d,'''farm_egg_movements''','''farm_egg_movements'',''farm_customer_receipts'',''farm_customer_refunds''');
end $$;
revoke all on function operations_private.resources(),operations_private.resources_before_credit(),operations_private.customer_allowed(uuid,uuid,uuid),operations_private.invoice_due(uuid,date),operations_private.link_credit_sale(),operations_private.write_resource(text,text),operations_private.write_resource_before_credit(text,text) from public,anon,authenticated,service_role;
revoke all on function farm_credit_write(uuid,text,jsonb,uuid,uuid),farm_credit_read(uuid,uuid,date) from public,anon,authenticated;
grant execute on function farm_credit_write(uuid,text,jsonb,uuid,uuid),farm_credit_read(uuid,uuid,date) to service_role;
commit;
