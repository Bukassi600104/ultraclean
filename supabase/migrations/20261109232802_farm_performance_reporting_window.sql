-- Preconditions: deployed farm_performance_read, batch movements and manager assignments.
-- Read-only replacement: adds expected_dates to already-authorized batch results.
-- No rows, amounts, accounts, policies or legacy attribution are changed or backfilled.
-- NULL dates do not invent an opening count; days without stock are not missing feed logs.
-- Uses actual operational dates (including backdated stock), Lagos dates and responsibility bounds.
-- Function replacement takes a brief catalog lock; lock_timeout aborts rather than waiting.
-- Rollback can restore the previous read function; consumers tolerate absent expected_dates.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create or replace function farm_performance_read(p_actor uuid,p_period uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c jsonb;batches jsonb;records jsonb;sales jsonb;expenses jsonb;feed jsonb;payments jsonb;credits jsonb;deaths jsonb; item jsonb; enriched jsonb:='[]'; expected jsonb; first_day date; last_day date; assigned_day date; recorded_day date; responsibility manager_periods;
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
 -- Only derive reporting dates from existing stock, assignment and observation facts.
 if (c->>'periodId') is not null then select * into responsibility from manager_periods where id=(c->>'periodId')::uuid;end if;
 for item in select value from jsonb_array_elements(batches) loop
  select min(date) into first_day from farm_batch_movements where batch_id=(item->>'id')::uuid and quantity>0;
  select min((r->>'date')::date) into recorded_day from jsonb_array_elements(records) r where r->>'batch_id'=item->>'id';
  if first_day is null and recorded_day is null then
   enriched:=enriched||jsonb_build_array(item||jsonb_build_object('expected_dates','[]'::jsonb));
   continue;
  end if;
  assigned_day:=null;
  if c->>'mode'='personal' then
   select (assigned_at at time zone 'Africa/Lagos')::date into assigned_day from manager_asset_assignments
    where period_id=responsibility.id and resource='farm_batches' and record_id=(item->>'id')::uuid;
  end if;
  first_day:=greatest(p_from,least(first_day,recorded_day),responsibility.starts_on,least(assigned_day,recorded_day));
  last_day:=least(p_to,(now() at time zone 'Africa/Lagos')::date,
    ((item->>'archived_at')::timestamptz at time zone 'Africa/Lagos')::date,
    (responsibility.ended_at at time zone 'Africa/Lagos')::date);
  select coalesce(jsonb_agg(d::date order by d),'[]') into expected
   from generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') d
   where coalesce((select sum(quantity) from farm_batch_movements where batch_id=(item->>'id')::uuid and date<=d::date),0)>0
    or exists(select 1 from farm_batch_movements where batch_id=(item->>'id')::uuid and date=d::date)
    or exists(select 1 from jsonb_array_elements(records) r where r->>'batch_id'=item->>'id' and (r->>'date')::date=d::date);
  enriched:=enriched||jsonb_build_array(item||jsonb_build_object('expected_dates',expected));
 end loop;
 batches:=enriched;
 return jsonb_build_object('batches',batches,'records',records,'sales',sales,'expenses',expenses,'feed',feed,'payments',payments,'credits',credits,'deaths',deaths,'from',p_from,'to',p_to);
end $$;
revoke all on function farm_performance_read(uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function farm_performance_read(uuid,uuid,date,date) to service_role;

commit;
