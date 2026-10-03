import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {farmErrorResponse} from '@/lib/farm-v2';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  try{await requireAdmin();}catch{return NextResponse.json({error:'Admin access required'},{status:403});}
  const db=createServerClient();if(!db)return NextResponse.json({error:'Database not configured'},{status:503});
  const page=Math.max(1,Number(request.nextUrl.searchParams.get('page'))||1);
  const {data,error,count}=await db.from('farm_activity').select('*,actor:profiles!farm_activity_actor_id_fkey(name)',{count:'exact'}).order('happened_at',{ascending:false}).order('id').range((page-1)*30,page*30-1);
  if(error)return farmErrorResponse(error);return NextResponse.json({data,total:count});
}
