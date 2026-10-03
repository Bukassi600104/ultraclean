import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";

export const runtime = "nodejs";
const itemSchema = z.object({
  item_name: z.string().trim().min(1),
  category: z.enum(["feed", "medication", "fuel", "equipment", "other"]).default("other"),
  unit: z.string().trim().min(1),
  current_quantity: z.coerce.number().finite().nonnegative().default(0),
  notes: z.string().trim().nullish(),
});

export async function GET(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  let query = supabase.from("farm_supply_inventory").select("*").order("category").order("item_name");
  if (profile.role !== "admin" || request.nextUrl.searchParams.get("include_archived") !== "true") {
    query = query.is("archived_at", null);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await request.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid supply details" }, { status: 400 });
  const { data, error } = await farmWrite(profile, "supply", "create", parsed.data, { requestId: body.request_id });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
