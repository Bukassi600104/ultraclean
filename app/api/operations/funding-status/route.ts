import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {createServerClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,parsed=z.object({business:z.enum(['farm','property','content']),request_id:z.string().uuid()}).safeParse({business:query.get('business'),request_id:query.get('request_id')});
 if(!parsed.success)return NextResponse.json({error:'Choose a saved funding request.'},{status:400});
 try{
  const scope=await requestManagerScope(request,parsed.data.business),db=createServerClient();if(!db)throw Error();
  let receiptQuery=db.from('manager_write_receipts').select('result,period_id').eq('actor_id',scope.actorId).eq('business',scope.business).eq('request_id',parsed.data.request_id);
  if(scope.periodId)receiptQuery=receiptQuery.eq('period_id',scope.periodId);
  const {data:receipt,error}=await receiptQuery.maybeSingle();if(error)throw error;
  let savedResult=receipt?.result;
  if(!receipt&&scope.business==='farm'){
   // Emergency reports use a nested expense receipt; the device retains its original purchase retry ID.
   const {data:purchase,error:purchaseError}=await db.from('farm_purchase_receipts').select('result').eq('actor_id',scope.actorId).eq('request_id',parsed.data.request_id).maybeSingle();
   if(purchaseError)throw purchaseError;savedResult=purchase?.result;
  }
  const result=savedResult as {status?:string;id?:string;results?:{status?:string;id?:string}[]}|undefined;
  const ids=Array.from(new Set([result,...(result?.results||[])].filter(row=>row?.status==='pending_funding'&&typeof row.id==='string').map(row=>row!.id!)));
  if(!ids.length)return NextResponse.json({status:'unknown'},{headers:{'Cache-Control':'private, no-store'}});
  let pendingQuery=db.from('manager_pending_expenses').select('id,status,posted_record_id,resolved_at').eq('business',scope.business).eq('requested_by',scope.actorId).in('id',ids);
  const period=receipt?.period_id||scope.periodId;
  if(period)pendingQuery=pendingQuery.eq('period_id',period);
  else if(scope.mode!=='admin_all')return NextResponse.json({status:'unknown'},{headers:{'Cache-Control':'private, no-store'}});
  const {data:rows,error:readError}=await pendingQuery;
  if(readError)throw readError;
  if(!rows||rows.length!==ids.length)return NextResponse.json({status:'unknown'},{headers:{'Cache-Control':'private, no-store'}});
  const status=rows.some(row=>row.status==='pending')?'pending':rows.some(row=>row.status==='declined')?'declined':'posted';
  return NextResponse.json({status,decisions:rows},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return managerReadError(error);}
}
