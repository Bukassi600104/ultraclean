import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {isSupportRole} from '@/lib/manager-accounts';
import {createServerClient} from '@/lib/supabase/server';
import {managerReadError} from '@/lib/manager-read-api';
import {supportRecommendation,supportFinance,type SupportData} from '@/lib/farm-support';
import {cashDate} from '@/lib/operations-cash-validation';
import {farmDateToday} from '@/lib/farm-products';
async function actor(){const p=await getCurrentUser();if(!p||p.suspended||!isSupportRole(p.role))throw Object.assign(Error('Assigned support access required'),{code:'42501'});return p;}
export async function GET(request:Request){try{
 const p=await actor(),q=new URL(request.url).searchParams,today=farmDateToday(),from=q.get('from')||today.slice(0,7)+'-01',to=q.get('to')||today;
 if(!cashDate.safeParse(from).success||!cashDate.safeParse(to).success||from>to)return NextResponse.json({error:'Choose valid report dates'},{status:400});
 const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_support_read',{p_actor:p.id,p_from:from,p_to:to});if(error)throw error;
 return NextResponse.json({...data,finance:supportFinance(data as SupportData)},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
export async function POST(request:Request){try{
 const p=await actor();if(p.role!=='farm_vet')throw Object.assign(Error('Read-only financial access'),{code:'42501'});
 const parsed=supportRecommendation.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Choose the task and enter your recommendation'},{status:400});
 const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_support_recommend',{p_actor:p.id,p_task:parsed.data.task_id,p_body:parsed.data.body,p_request:parsed.data.request_id});if(error)throw error;return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
