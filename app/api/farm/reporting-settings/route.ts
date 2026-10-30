import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {managerReadError} from '@/lib/manager-read-api';
import {cashDate} from '@/lib/operations-cash-validation';
const schema=z.object({request_id:z.string().uuid(),payload:z.object({timezone:z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),mortality_alert_count:z.number().int().positive().nullable(),feed_alert_days:z.number().positive().nullable(),display_currency:z.string().regex(/^[A-Z]{3}$/).nullable(),exchange_rate:z.string().regex(/^\d+(\.\d{1,12})?$/).refine(v=>Number(v)>0).nullable(),rate_date:cashDate.nullable(),rate_valid_until:cashDate.nullable(),rate_source:z.string().trim().min(1).max(500).nullable(),reason:z.string().trim().min(1).max(2000)}).strict()}).strict();
export async function POST(request:Request){try{
 const actor=await requireAdmin(),parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Check timezone, thresholds and exchange-rate details'},{status:400});
 const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_reporting_config_write',{p_actor:actor.id,p_payload:parsed.data.payload,p_request:parsed.data.request_id});if(error)throw error;
 return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
