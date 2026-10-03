import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { farmErrorResponse, farmWrite } from "@/lib/farm-v2";
import { FARM_RECORD_TABLES, farmRecordTypeSchema, type FarmRecordType } from "@/lib/farm-corrections";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const db = createServerClient();
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  let query = db.from("farm_correction_requests").select("*", { count: "exact" }).order("requested_at", { ascending: false }).range((page-1)*30,page*30-1);
  if (profile.role !== "admin") query = query.eq("requested_by", profile.id);
  const { data, error, count } = await query;
  if (error) return farmErrorResponse(error);
  const rows = await Promise.all((data ?? []).map(async row => {
    const table = FARM_RECORD_TABLES[row.record_type as FarmRecordType];
    if (!table) return row;
    const [{ data: record, error: targetError }, { data: actor }] = await Promise.all([
      db.from(table).select("*").eq("id",row.record_id).maybeSingle(),
      db.from("profiles").select("name").eq("id",row.requested_by).maybeSingle(),
    ]);
    if (targetError) throw targetError;
    return { ...row, current_record: record, requester_name: actor?.name ?? null };
  })).catch(() => null);
  if (!rows) return NextResponse.json({ error: "Unable to load correction targets" }, { status: 500 });
  return NextResponse.json({ data: rows, total: count });
}
const schema = z.object({ record_type: farmRecordTypeSchema.exclude(["fund"]), record_id: z.string().uuid(), requested_change: z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 4000), reason: z.string().trim().min(1).max(1000), request_id: z.string().uuid().optional() });
export async function POST(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Describe a valid correction and reason" }, { status: 400 });
  const { request_id, ...payload } = parsed.data;
  const { data, error } = await farmWrite(profile,"request","request",payload,{ requestId: request_id });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
