import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {cashDate} from '@/lib/operations-cash-validation';
import {batchRecordSchema} from '@/lib/farm-batch-records';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm');
 const params=new URL(request.url).searchParams;
 const date=cashDate.safeParse(params.get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
 if(!date.success)return NextResponse.json({error:'Choose a valid activity date'},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Farm records unavailable'});
 const {data,error}=await db.rpc('farm_today_read',{p_actor:scope.actorId,p_period:scope.periodId,p_date:date.data});
 if(error)return farmErrorResponse(error);
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return managerReadError(error);}}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager();
 const parsed=batchRecordSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the batch record',details:parsed.error.flatten()},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Farm records unavailable'});
 const {operation,payload,id,request_id}=parsed.data;
 const {data,error}=await managerRpc(db,'farm_batch_record_write',{p_actor:profile.id,p_operation:operation,p_payload:payload,p_id:id||null,p_request:request_id});
 if(error)return farmErrorResponse(error);
 return NextResponse.json({data},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
