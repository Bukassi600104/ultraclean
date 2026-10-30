import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {managerReadError} from '@/lib/manager-read-api';
import {verifySummarySender} from '@/lib/farm-summary-delivery';
const schema=z.object({channel:z.enum(['email','whatsapp']),enabled:z.boolean(),recipient:z.string().trim().min(3).max(320),timezone:z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),delivery_time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),reason:z.string().trim().min(1).max(2000)}).strict();
export async function GET(){try{
 await requireAdmin();const db=createServerClient();if(!db)throw Error();
 const [settings,deliveries]=await Promise.all([db.from('farm_summary_settings').select('*').order('created_at',{ascending:false}),db.from('farm_summary_deliveries').select('id,channel,recipient,report_date,status,attempts,error,created_at').order('created_at',{ascending:false}).limit(100)]);
 if(settings.error||deliveries.error)throw Error();return NextResponse.json({settings:settings.data,deliveries:deliveries.data},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
export async function POST(request:Request){try{
 const actor=await requireAdmin(),parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Check the recipient, timezone and delivery time'},{status:400});const p=parsed.data;
 if(!(p.channel==='email'?z.string().email().safeParse(p.recipient).success:/^\+[1-9]\d{7,14}$/.test(p.recipient)))return NextResponse.json({error:'Enter a valid email address or international WhatsApp number'},{status:400});
 const db=createServerClient();if(!db)throw Error();let sender:string;
 if(p.enabled){try{sender=await verifySummarySender(p.channel);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sender not verified'},{status:409});}}
 else{const old=await db.from('farm_summary_settings').select('sender').eq('actor_id',actor.id).eq('channel',p.channel).order('created_at',{ascending:false}).limit(1).maybeSingle();if(old.error)throw old.error;if(!old.data)return NextResponse.json({error:'This channel is already disabled'},{status:409});sender=old.data.sender;}
 const {data,error}=await db.rpc('farm_summary_configure',{p_actor:actor.id,p_payload:{...p,sender,recipient:p.channel==='email'?p.recipient.toLowerCase():p.recipient}});if(error)throw error;return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
