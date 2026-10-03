import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { farmWrite,farmErrorResponse } from "@/lib/farm-v2";
import { farmRecordTypeSchema, parseFarmCorrection } from "@/lib/farm-corrections";
import { z } from "zod";
export const runtime="nodejs";
const schema=z.object({ action:z.enum(['apply','decline']),operation:z.enum(['update','void','archive']).default('update'),changes:z.record(z.string(),z.unknown()).default({}),reason:z.string().trim().min(1).max(1000),request_id:z.string().uuid() });
export async function PUT(request:NextRequest,{params}:{params:{id:string}}) {
  let profile;try{profile=await requireAdmin();}catch{return NextResponse.json({error:'Admin access required'},{status:403});}
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success || !z.string().uuid().safeParse(params.id).success)return NextResponse.json({error:'Invalid correction resolution'},{status:400});
  const db=createServerClient();if(!db)return NextResponse.json({error:'Database not configured'},{status:503});
  const {data:target,error:readError}=await db.from('farm_correction_requests').select('record_type').eq('id',params.id).maybeSingle();
  if(readError)return farmErrorResponse(readError);if(!target)return NextResponse.json({error:'Request not found'},{status:404});
  const kind=farmRecordTypeSchema.safeParse(target.record_type);if(!kind.success)return NextResponse.json({error:'Invalid target type'},{status:400});
  const body=parsed.data;
  if(body.action==='apply'){
    if((body.operation==='void'&&!['sale','expense','fund'].includes(kind.data))||(body.operation==='archive'&&kind.data!=='supply'))return NextResponse.json({error:'Invalid removal operation'},{status:400});
    const changes=body.operation==='update'?parseFarmCorrection(kind.data,body.changes):z.object({expected_revision:z.number().int().nonnegative()}).safeParse(body.changes);
    if(!changes.success)return NextResponse.json({error:'Verify the correction fields before applying'},{status:400});
    body.changes=changes.data as Record<string,unknown>;
  }
  const {data,error}=await farmWrite(profile,'request',body.action,{operation:body.operation,changes:body.changes},{id:params.id,reason:body.reason,requestId:body.request_id});
  if(error)return farmErrorResponse(error);return NextResponse.json(data);
}
