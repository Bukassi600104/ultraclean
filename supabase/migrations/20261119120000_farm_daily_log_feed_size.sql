begin;
set local lock_timeout='5s';

-- The size describes an actual feeding observation. It never changes stored bag counts or stock.
alter table public.farm_batch_records
  add column feed_size_mm smallint,
  drop constraint farm_batch_records_check3,
  add constraint farm_batch_records_observation_check check (
    feed_size_mm is not null or feed_kg is not null or deaths is not null or eggs is not null
    or sample_weight_kg is not null or daily_feed_id is not null or coalesce(length(trim(notes)),0)>0
  ),
  add constraint farm_batch_feed_size_check check (
    feed_size_mm is null or (feed_size_mm in (2,3,4,6,9) and feed_kg is distinct from 0)
  );

do $migration$
declare
  definition text:=replace(pg_get_functiondef('public.farm_validate_report(jsonb)'::regprocedure),chr(13),'');
  observation_loop constant text:=$sql$  for field,value in select * from jsonb_each(p_sections->'observations') loop$sql$;
  sized_loop constant text:=$sql$  if (p_sections->'observations')?'feed_size_mm' then
   if area not like 'farm1_pond%' and area not like 'farm2_vat%' then
    raise exception using errcode='22023',message='Feed size is only available for catfish logs';
   end if;
   if p_sections#>'{observations,feed_size_mm}' not in ('2'::jsonb,'3'::jsonb,'4'::jsonb,'6'::jsonb,'9'::jsonb) then
    raise exception using errcode='22023',message='Choose a feed size of 2, 3, 4, 6 or 9 mm.';
   end if;
   if (p_sections#>'{observations,feed_kg}')='0'::jsonb then
    raise exception using errcode='22023',message='Clear the feed size when no feed was used.';
   end if;
   observed:=true;
  end if;
  for field,value in select * from jsonb_each((p_sections->'observations')-'feed_size_mm') loop$sql$;
begin
  if strpos(definition,observation_loop)=0 then
    raise exception 'Location report validation differs from the reviewed version';
  end if;
  execute replace(definition,observation_loop,sized_loop);
end
$migration$;

do $migration$
declare
  definition text:=replace(pg_get_functiondef('public.farm_batch_record_write(uuid,text,jsonb,uuid,uuid)'::regprocedure),chr(13),'');
  batch_boundary constant text:=$sql$ d:=(p_payload->>'date')::date;$sql$;
  check_size constant text:=$sql$ if p_payload?'feed_size_mm' and p_payload->'feed_size_mm'<>'null'::jsonb then
  if b.product<>'catfish' then raise exception using errcode='22023',message='Feed size is only available for catfish logs';end if;
  if p_payload->'feed_size_mm' not in ('2'::jsonb,'3'::jsonb,'4'::jsonb,'6'::jsonb,'9'::jsonb) then
   raise exception using errcode='22023',message='Choose a feed size of 2, 3, 4, 6 or 9 mm.';
  end if;
  if (p_payload->>'feed_kg')::numeric=0 then
   raise exception using errcode='22023',message='Clear the feed size when no feed was used.';
  end if;
 end if;
$sql$;
  batch_columns constant text:='insert into farm_batch_records(batch_id,date,period_id,actor_id,feed_kg,';
  batch_values constant text:=$sql$values(b.id,d,(c->>'periodId')::uuid,p_actor,(p_payload->>'feed_kg')::numeric,death_count,$sql$;
  sized_values constant text:=$sql$values(b.id,d,(c->>'periodId')::uuid,p_actor,(p_payload->>'feed_kg')::numeric,
  case when p_payload?'feed_size_mm' then (p_payload->>'feed_size_mm')::numeric::smallint
       when b.id=prior.batch_id and b.product='catfish' and (p_payload->>'feed_kg')::numeric is distinct from 0 then prior.feed_size_mm
  end,death_count,$sql$;
begin
  if strpos(definition,batch_boundary)=0 or strpos(definition,batch_columns)=0 or strpos(definition,batch_values)=0 then
    raise exception 'Batch report writer differs from the reviewed version';
  end if;
  -- Omission by an older app keeps the recorded size unless the batch changes or the feed is set to zero.
  definition:=replace(definition,batch_boundary,check_size||batch_boundary);
  definition:=replace(definition,batch_columns,batch_columns||'feed_size_mm,');
  execute replace(definition,batch_values,sized_values);
end
$migration$;

commit;
