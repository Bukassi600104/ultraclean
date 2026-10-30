import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {readManagerRecords} from '@/lib/manager-periods';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {batchWriteSchema} from '@/lib/farm-batches';

export const runtime='nodejs';
const querySchema=z.object({resource:z.enum(['farm_sites','farm_batches','farm_batch_movements']),page:z.coerce.number().int().nonnegative(),limit:z.coerce.number().int().min(1).max(500)});
export async function GET(request:Request){
 try{
  const scope=await requestManagerScope(request,'farm');
  const params=new URL(request.url).searchParams;
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
