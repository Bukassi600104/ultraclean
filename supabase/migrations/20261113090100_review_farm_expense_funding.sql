-- Apply a verified source only when posting an ordinary expense; retain the original submission.
begin;
create or replace function public.operations_pending_expense_write(p_actor uuid,p_id uuid,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare entry manager_pending_expenses;before_value jsonb;c jsonb;account operations_cash_accounts;available numeric;result jsonb;posted jsonb;values_to_post jsonb;r manager_write_receipts;fp text; verified_bucket text;
 saved_pending text:=current_setting('operations.resolving_pending',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('manager-period-provisioning',0));
 if not exists(select 1 from profiles where id=p_actor and role='admin' and not suspended) then raise exception using errcode='42501',message='Only the MD/Owner can review this expense';end if;
 if not(select enabled from operations_release_state) then raise exception using errcode='55000',message='Funding decisions are briefly paused for the update';end if;
 select * into entry from manager_pending_expenses where id=p_id for update;
 if entry.id is null then raise exception using errcode='P0002',message='Pending expense not found';end if;
 if (p_payload ? 'business' and p_payload->>'business'<>entry.business) or (p_payload->>'manager_period_id' is not null and (p_payload->>'manager_period_id')::uuid<>entry.period_id) then raise exception using errcode='42501',message='This funding request belongs to a different business or manager period';end if;
 c:=manager_context(p_actor,entry.business,entry.period_id);
 if p_request_id is null or coalesce(p_payload->>'action','') not in ('post','decline') or nullif(trim(p_payload->>'reason'),'') is null or length(p_payload->>'reason')>2000 then raise exception using errcode='22023',message='Choose an action and explain who paid';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array('resolve_pending',p_id,p_payload)::text,'UTF8')),'hex');
 select * into r from manager_write_receipts where actor_id=p_actor and request_id=p_request_id;
 if found then if r.fingerprint<>fp or r.period_id is distinct from entry.period_id or r.business<>entry.business then raise exception using errcode='23514',message='Retry belongs to a different decision';end if;return r.result;end if;
 if entry.status<>'pending' or entry.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception using errcode='40001',message='This pending entry was already reviewed. Refresh before deciding';end if;
 before_value:=to_jsonb(entry);
 verified_bucket:=coalesce(p_payload->>'funding_source',entry.bucket);
 if p_payload ? 'funding_source' and (p_payload->>'action'<>'post' or (p_payload->>'funding_source') is null or verified_bucket not in ('owner','sales')
      or (entry.business,entry.kind,entry.writer) is distinct from ('farm','expense','farm_v2_write') or entry.payload ? 'purchase_id') then
  raise exception using errcode='22023',message='Choose a funding source for an ordinary farm expense';
 end if;
 if p_payload->>'action'='post' then
  select * into account from operations_cash_accounts where id=(p_payload->>'payer_account_id')::uuid for update;
  if account.id is null or (account.business,account.currency,account.bucket) is distinct from (entry.business,entry.currency,verified_bucket) or account.holder_type in ('outside','awaiting') then raise exception using errcode='42501',message='Select the actual confirmed payer in the selected business, currency and funding source';end if;
  if account.holder_type='manager' and account.period_id is distinct from entry.period_id then
   raise exception using errcode='42501',message='This money belongs to a different supervisor period. Choose who paid this expense.';
  end if;
  available:=operations_private.cash_available(account.id,entry.activity_date);
  if available<entry.amount then
   result:=jsonb_build_object('status','pending_funding','id',entry.id,'currency',entry.currency,'shortfall',(entry.amount-available)::text,'message','Still pending. Confirmed funds must be available on the original expense date');
  else
   values_to_post:=entry.payload||jsonb_build_object('manager_period_id',entry.period_id,'cash_payer_account_id',account.id);
   if verified_bucket<>entry.bucket then
    values_to_post:=values_to_post||jsonb_build_object('expense_source',case verified_bucket when 'sales' then 'sales_cash' else 'bimbo_transfer' end);
   end if;
   if entry.feed_activity_id is not null then values_to_post:=values_to_post||jsonb_build_object('delivery_received',true,'feed_activity_id',entry.feed_activity_id);end if;
   perform set_config('operations.resolving_pending',entry.id::text,true);
   execute format('select public.%I($1,$2,''create'',$3,null,$4,$5)',entry.writer) into posted using p_actor,entry.kind,values_to_post,p_payload->>'reason',md5(p_request_id::text||':pending-post')::uuid;
   perform set_config('operations.resolving_pending',coalesce(saved_pending,''),true);
   if posted->>'id' is null then raise exception using errcode='23514',message='The expense could not be confirmed. Review its funding and try again';end if;
   update manager_pending_expenses set status='posted',revision=revision+1,resolved_by=p_actor,resolved_at=now(),resolution_reason=p_payload->>'reason',payer_account_id=account.id,posted_record_id=(posted->>'id')::uuid where id=entry.id returning * into entry;
   insert into manager_pending_decisions(pending_id,actor_id,action,reason,before_value,after_value) values(entry.id,p_actor,'post',p_payload->>'reason',before_value,to_jsonb(entry)||jsonb_build_object('verified_funding_source',verified_bucket));
   result:=jsonb_build_object('status','posted','data',posted,'pending_id',entry.id);
  end if;
 else
  update manager_pending_expenses set status='declined',revision=revision+1,resolved_by=p_actor,resolved_at=now(),resolution_reason=p_payload->>'reason' where id=entry.id returning * into entry;
  insert into manager_pending_decisions(pending_id,actor_id,action,reason,before_value,after_value) values(entry.id,p_actor,'decline',p_payload->>'reason',before_value,to_jsonb(entry));
  result:=jsonb_build_object('status','posted','decision','declined','data',to_jsonb(entry));
 end if;
 insert into manager_write_receipts(actor_id,request_id,business,period_id,fingerprint,result) values(p_actor,p_request_id,entry.business,entry.period_id,fp,result);
 return result;
end $$;
notify pgrst,'reload schema';
commit;
