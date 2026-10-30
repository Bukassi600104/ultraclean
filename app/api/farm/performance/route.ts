import {NextResponse} from 'next/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {createServerClient} from '@/lib/supabase/server';
import {farmErrorResponse} from '@/lib/farm-v2';
import {cashDate} from '@/lib/operations-cash-validation';
import {farmDateToday} from '@/lib/farm-products';
import {batchPerformance,type PerformanceSource} from '@/lib/farm-batch-performance';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm'),params=new URL(request.url).searchParams,today=farmDateToday(),from=params.get('from')||today.slice(0,7)+'-01',to=params.get('to')||today;
 if(!cashDate.safeParse(from).success||!cashDate.safeParse(to).success||from>to)return NextResponse.json({error:'Choose a valid date range'},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Batch reporting unavailable'});
 const {data,error}=await db.rpc('farm_performance_read',{p_actor:scope.actorId,p_period:scope.periodId,p_from:from,p_to:to});if(error)return farmErrorResponse(error);return NextResponse.json(batchPerformance(data as PerformanceSource),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
