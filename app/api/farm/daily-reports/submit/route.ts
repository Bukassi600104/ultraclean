import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {dailyReportSubmissionSchema} from '@/lib/daily-report-submission';
export const runtime='nodejs';
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const actor=await requireManager();
 const parsed=dailyReportSubmissionSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the report fields',details:parsed.error.flatten()},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Reports are temporarily unavailable'});
 const {request_id,...payload}=parsed.data;
 const {data,error}=await managerRpc(db,'farm_daily_report_submit',{p_actor:actor.id,p_payload:payload,p_request:request_id});
 if(error)return farmErrorResponse(error);
 return NextResponse.json({data},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
