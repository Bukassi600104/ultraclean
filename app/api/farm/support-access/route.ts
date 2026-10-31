import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {managerReadError} from '@/lib/manager-read-api';
import {supportGrant} from '@/lib/farm-support';
export async function GET(){try{const actor=await requireAdmin(),db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_support_admin_read',{p_actor:actor.id});if(error)throw error;return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});}catch(e){return managerReadError(e);}}
export async function POST(request:Request){try{const actor=await requireAdmin(),parsed=supportGrant.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Choose the account, scope and reason'},{status:400});const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_support_access_write',{p_actor:actor.id,p_operation:parsed.data.operation,p_payload:parsed.data.payload,p_id:parsed.data.id||null});if(error)throw error;return NextResponse.json({data},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return managerReadError(e);}}
