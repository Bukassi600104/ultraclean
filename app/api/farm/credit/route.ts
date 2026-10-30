import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {farmDateToday} from '@/lib/farm-products';
import {creditSchema} from '@/lib/farm-credit';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm'),db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Customer records unavailable'});
 const {data,error}=await db.rpc('farm_credit_read',{p_actor:scope.actorId,p_period:scope.periodId,p_date:farmDateToday()});if(error)return farmErrorResponse(error);return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager(),parsed=creditSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Check the customer entry',details:parsed.error.flatten()},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Customer records unavailable'});
 const {operation,payload,request_id}=parsed.data;const {data,error}=await managerRpc(db,'farm_credit_write',{p_actor:profile.id,p_operation:operation,p_payload:payload,p_id:'id' in parsed.data?parsed.data.id:null,p_request:request_id});if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
