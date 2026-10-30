import {NextResponse} from 'next/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {getFarmControl} from '@/lib/farm-control';
import {cashDate} from '@/lib/operations-cash-validation';
import {farmDateToday} from '@/lib/farm-products';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm',true),p=new URL(request.url).searchParams,today=farmDateToday(),from=p.get('from')||today.slice(0,7)+'-01',to=p.get('to')||today;
 if(!cashDate.safeParse(from).success||!cashDate.safeParse(to).success||from>to)return NextResponse.json({error:'Choose valid report dates'},{status:400});
 return NextResponse.json(await getFarmControl(scope,from,to),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
