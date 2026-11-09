import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {readManagerRecords} from '@/lib/manager-periods';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {sumMoney,subtractMoney} from '@/lib/money';
import {batchWriteSchema} from '@/lib/farm-batches';

export const runtime='nodejs';
const querySchema=z.object({resource:z.enum(['farm_sites','farm_batches','farm_batch_movements']),page:z.coerce.number().int().nonnegative(),limit:z.coerce.number().int().min(1).max(500)});
export async function GET(request:Request){
 try{
  const scope=await requestManagerScope(request,'farm');
  const params=new URL(request.url).searchParams;
  if(params.get('resource')==='availability'){
   await requireAdmin();
   const id=z.string().uuid().safeParse(params.get('batch_id'));
   if(!id.success)return NextResponse.json({error:'Choose a farm group'},{status:400});
   const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Stock availability unavailable'});
   const batch=await db.from('farm_batches').select('id,product,stock_group_id').eq('id',id.data).maybeSingle();
   if(batch.error)return farmErrorResponse(batch.error);
   if(!batch.data)return NextResponse.json({error:'Farm group not found'},{status:404});
   const balances=await db.rpc('farm_livestock_balances');if(balances.error)return farmErrorResponse(balances.error);
   const quantities:string[]=[];
   for(let page=0;;page++){
    let query=db.from('farm_batch_movements').select('quantity,batch:farm_batches!inner(product,stock_group_id)').eq('batch.product',batch.data.product);
    query=batch.data.stock_group_id?query.eq('batch.stock_group_id',batch.data.stock_group_id):query.is('batch.stock_group_id',null);
    const rows=await query.order('id').range(page*500,page*500+499);
    if(rows.error)return farmErrorResponse(rows.error);
    quantities.push(...(rows.data||[]).map(row=>String(row.quantity)));
    if((rows.data?.length||0)<500)break;
   }
   const balance=(balances.data as {id:string|null;product:string;quantity:string|number}[]).find(row=>row.product===batch.data!.product&&(row.id||null)===(batch.data!.stock_group_id||null));
   return NextResponse.json({available:subtractMoney(String(balance?.quantity??0),sumMoney(quantities)),as_of:new Date().toISOString()},{headers:{'Cache-Control':'private, no-store'}});
  }
  const query=querySchema.safeParse({resource:params.get('resource')||'farm_batches',page:params.get('page')||0,limit:params.get('limit')||100});
  if(!query.success)return NextResponse.json({error:'Invalid batch filters'},{status:400});
  const {resource,page,limit}=query.data;
  return NextResponse.json(await readManagerRecords(scope,resource,{page,limit}),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return managerReadError(error);}
}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireAdmin();
 const parsed=batchWriteSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the batch details',details:parsed.error.flatten().fieldErrors},{status:400});
 const db=createServerClient();
 if(!db)return farmErrorResponse({code:'503',message:'Database not configured'});
 const {operation,payload,request_id}=parsed.data;
 const {data,error}=await managerRpc(db,'farm_batch_write',{p_actor:profile.id,p_operation:operation,p_payload:payload,p_request:request_id});
 if(error)return farmErrorResponse(error);
 return NextResponse.json({data},{status:201});
},true);}
