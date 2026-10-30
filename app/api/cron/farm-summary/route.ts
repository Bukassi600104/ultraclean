import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {createServerClient} from '@/lib/supabase/server';
import {resolveManagerScope} from '@/lib/manager-periods';
import type {Profile} from '@/lib/auth';
import {getFarmControl} from '@/lib/farm-control';
import {farmDateToday} from '@/lib/farm-products';
import {deliverFarmSummary,type SummarySetting} from '@/lib/farm-summary-delivery';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 const secret=process.env.FARM_SUMMARY_CRON_SECRET;if(!secret)return NextResponse.json({error:'Farm summary scheduler is disabled'},{status:503});
 const supplied=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=createServerClient();if(!db)return NextResponse.json({error:'Reporting unavailable'},{status:503});
 try{
  const {data,error}=await db.from('farm_summary_settings').select('*').order('created_at',{ascending:false}).order('id',{ascending:false});if(error)throw error;
  const seen=new Set<string>(),settings=(data as SummarySetting[]).filter(s=>{const k=s.actor_id+':'+s.channel;if(seen.has(k))return false;seen.add(k);return s.enabled;});
  const date=new Date(farmDateToday()+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-1);const day=date.toISOString().slice(0,10),results=[];
  for(const setting of settings){
   const actor=await db.from('profiles').select('*').eq('id',setting.actor_id).single();if(actor.error||actor.data.role!=='admin'||actor.data.suspended)continue;
   const scope=await resolveManagerScope(actor.data as Profile,'farm'),report=await getFarmControl(scope,day,day);
   const {data:job,error:claimError}=await db.rpc('farm_summary_claim',{p_setting:setting.id,p_date:day,p_summary:setting.channel==='whatsapp'?report.whatsappSummary:report.summary});if(claimError)throw claimError;if(!job)continue;
   const outcome=await deliverFarmSummary(setting,job),finished=await db.rpc('farm_summary_finish',{p_id:job.id,p_claim:job.claim_id,p_status:outcome.status,p_provider:outcome.provider,p_error:outcome.error});if(finished.error)throw finished.error;results.push({id:job.id,status:outcome.status});
  }
  return NextResponse.json({results},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Summary processing failed. Farm records are unaffected; check delivery status before retrying.'},{status:503});}
}
