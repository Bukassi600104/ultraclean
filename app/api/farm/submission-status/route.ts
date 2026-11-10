import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {readManagerRecords} from '@/lib/manager-periods';
import {createServerClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,parsed=z.object({kind:z.enum(['report','request']),request_id:z.string().uuid()}).safeParse({kind:query.get('kind'),request_id:query.get('request_id')});
 if(!parsed.success)return NextResponse.json({error:'Choose the original saved submission.'},{status:400,headers});
 try{
  const scope=await requestManagerScope(request,'farm'),db=createServerClient();if(!db)throw Error('Unavailable');
  const expectedActor=request.headers.get('X-Manager-Actor'),expectedPeriod=request.headers.get('X-Manager-Period');
  if((expectedActor&&expectedActor!==scope.actorId)||(expectedPeriod&&expectedPeriod!==(scope.periodId||'legacy')))throw Object.assign(Error('Open the original account and responsibility period to check this entry.'),{code:'42501'});
  // Report submission commits its final receipt under the existing derived identifier.
  const id=parsed.data.kind==='report'?createHash('md5').update(parsed.data.request_id.toLowerCase()+':submit').digest('hex').replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5'):parsed.data.request_id;
  const {data:receipt,error}=await db.from('farm_operation_receipts').select('result,created_at').eq('actor_id',scope.actorId).eq('request_id',id).maybeSingle();
  if(error)throw error;
  const recordId=receipt?.result?.id;
  if(!receipt||typeof recordId!=='string')return NextResponse.json({status:'unknown'},{headers});
  const resource=parsed.data.kind==='report'?'farm_daily_reports':'farm_operational_requests';
  const records=await readManagerRecords(scope,resource,{id:recordId,page:0,limit:1});
  const row=records.data.find(item=>item.id===recordId);
  if(!row||(parsed.data.kind==='report'&&!['submitted','reviewed'].includes(String(row.status))))return NextResponse.json({status:'unknown'},{headers});
  return NextResponse.json({status:'confirmed',record_id:recordId,confirmed_at:receipt.created_at},{headers});
 }catch(error){return managerReadError(error);}
}
