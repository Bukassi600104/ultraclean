import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {storeSchema} from '@/lib/farm-stock-counts';
import {farmDateToday} from '@/lib/farm-products';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm'),db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Stores unavailable'});
 const {data,error}=await db.rpc('farm_store_read',{p_actor:scope.actorId,p_period:scope.periodId,p_date:farmDateToday()});
 if(error)return farmErrorResponse(error);return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager(),parsed=storeSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the stock entry',details:parsed.error.flatten()},{status:400});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Stores unavailable'});
 const body=parsed.data;
 const {data,error}=await managerRpc(db,'farm_store_write',{p_actor:profile.id,p_operation:body.operation,p_payload:body.payload,p_id:'id' in body?body.id:null,p_request:body.request_id});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
