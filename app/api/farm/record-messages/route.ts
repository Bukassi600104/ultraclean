import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {discussionResource,recordMessageSchema} from '@/lib/farm-record-messages';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm'),params=new URL(request.url).searchParams;
 const parsed=z.object({resource:discussionResource,record_id:z.string().uuid()}).safeParse({resource:params.get('resource'),record_id:params.get('record_id')});
 if(!parsed.success)return NextResponse.json({error:'Choose a valid farm record'},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Discussion unavailable'});
 const {data,error}=await db.rpc('farm_record_messages_read',{p_actor:scope.actorId,p_resource:parsed.data.resource,p_record:parsed.data.record_id});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return managerReadError(error);}}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager(),parsed=recordMessageSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the message and its record'},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Discussion unavailable'});
 const {request_id,...payload}=parsed.data;
 const {data,error}=await managerRpc(db,'farm_record_message_write',{p_actor:profile.id,p_payload:payload,p_request:request_id});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
