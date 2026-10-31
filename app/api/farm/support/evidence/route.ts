import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getCurrentUser} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {managerReadError} from '@/lib/manager-read-api';
export async function GET(request:Request){try{
 const actor=await getCurrentUser();if(!actor||actor.suspended||actor.role!=='farm_vet')throw Object.assign(Error('Assigned health evidence access required'),{code:'42501'});
 const task=z.string().uuid().safeParse(new URL(request.url).searchParams.get('task_id'));if(!task.success)return NextResponse.json({error:'Choose a health task'},{status:400});
 const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc('farm_support_evidence_read',{p_actor:actor.id,p_task:task.data});if(error)throw error;
 const photos=await Promise.all(data.map(async(e:{id:string;object_path:string;activity_date:string;record_id:string})=>{const signed=await db.storage.from('farm-evidence').createSignedUrl(e.object_path,120);if(signed.error)throw signed.error;return {id:e.id,date:e.activity_date,record_id:e.record_id,url:signed.data.signedUrl};}));
 return NextResponse.json({photos},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return managerReadError(e);}}
