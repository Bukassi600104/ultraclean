import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite} from '@/lib/manager-write-api';
import {createServerClient} from '@/lib/supabase/server';
import {farmErrorResponse} from '@/lib/farm-v2';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const completion=z.object({message_id:z.string().uuid(),request_id:z.string().uuid()}).strict();

export async function GET(request:Request){
 try{
  const scope=await requestManagerScope(request,'farm');
  const offset=new URL(request.url).searchParams.get('offset')??'0';
  if(!/^[0-9]+$/.test(offset)||Number(offset)>2147483647)return NextResponse.json({error:'Invalid page.'},{status:400,headers});
  const db=createServerClient();
  if(!db)return farmErrorResponse({code:'503',message:'Follow-ups are unavailable.'});
  const {data,error}=await db.rpc('farm_log_followups_read',{p_actor:scope.actorId,p_period:scope.periodId||null,p_offset:Number(offset)});
  if(error)return farmErrorResponse(error);
  if(!Number.isSafeInteger(data?.total)||data.total<0||!Array.isArray(data.items))return NextResponse.json({error:'Follow-ups could not be loaded. Try again.'},{status:503,headers});
  return NextResponse.json(data,{headers});
 }catch(error){return managerReadError(error);}
}

export async function POST(request:Request){
 return withManagerWrite(request,'farm',async scope=>{
  const parsed=completion.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a valid follow-up.'},{status:400,headers});
  const db=createServerClient();
  if(!db)return farmErrorResponse({code:'503',message:'Follow-ups are unavailable.'});
  const {message_id,request_id}=parsed.data;
  const {data,error}=await db.rpc('farm_log_followup_complete',{p_actor:scope.actorId,p_period:scope.periodId||null,p_message:message_id,p_request:request_id});
  if(error)return farmErrorResponse(error);
  if(data?.message_id!==message_id||!data.completed_at)return NextResponse.json({error:'Completion could not be confirmed. Try again.'},{status:503,headers});
  return NextResponse.json({data},{headers});
 });
}
