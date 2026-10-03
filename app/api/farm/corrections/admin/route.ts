import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { farmRecordTypeSchema, parseFarmCorrection } from "@/lib/farm-corrections";
import { z } from "zod";
export const runtime = "nodejs";
const schema = z.object({ record_type: farmRecordTypeSchema, record_id: z.string().uuid(), operation: z.enum(["update","void","archive"]), changes: z.record(z.string(),z.unknown()), reason: z.string().trim().min(1).max(1000), request_id: z.string().uuid() });
export async function POST(request: NextRequest) {
  let profile;
  try { profile = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin access required" }, { status: 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid correction" }, { status: 400 });
  const body = parsed.data;
  if ((body.operation==='void' && !['sale','expense','fund'].includes(body.record_type)) || (body.operation==='archive' && body.record_type!=='supply')) return NextResponse.json({error:"Invalid removal operation"},{status:400});
  const changes = body.operation==='update' ? parseFarmCorrection(body.record_type,body.changes) : z.object({ expected_revision:z.number().int().nonnegative() }).safeParse(body.changes);
  if (!changes.success) return NextResponse.json({ error: "Invalid correction fields. Refresh and verify the values." }, { status:400 });
  const {data,error} = await farmWrite(profile,body.record_type,body.operation,changes.data,{id:body.record_id,reason:body.reason,requestId:body.request_id});
  if(error) return farmErrorResponse(error);
  return NextResponse.json(data);
}
