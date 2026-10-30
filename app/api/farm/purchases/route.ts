import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {purchaseSchema} from '@/lib/farm-purchases';
import {z} from 'zod';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm'),db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Purchases unavailable'});
 const line=new URL(request.url).searchParams.get('line_id');
 if(line){if(!z.string().uuid().safeParse(line).success)return NextResponse.json({error:'Invalid purchase line'},{status:400});const {data,error}=await db.rpc('farm_purchase_delivery_choices',{p_actor:scope.actorId,p_line:line,p_period:scope.periodId});if(error)return farmErrorResponse(error);return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});}
 const {data,error}=await db.rpc('farm_purchase_read',{p_actor:scope.actorId,p_period:scope.periodId});
 if(error)return farmErrorResponse(error);return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager(),parsed=purchaseSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the purchase details',details:parsed.error.flatten()},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Purchases unavailable'});
 const {operation,payload,id,request_id}=parsed.data;
 const {data,error}=await managerRpc(db,'farm_purchase_write',{p_actor:profile.id,p_operation:operation,p_payload:payload,p_id:id||null,p_request:request_id});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:data?.status==='pending_funding'?202:201,headers:{'Cache-Control':'private, no-store'}});
});}
