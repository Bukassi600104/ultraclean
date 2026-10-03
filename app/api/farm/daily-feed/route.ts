import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  void profile;
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));

  let query = supabase.from("farm_daily_feed").select("*", { count: "exact" });
  if (date) query = query.eq("date", date);
  query = query.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), feed_type: z.enum(["fish", "goat", "chicken", "pig", "turkey", "cattle", "other"]), num_bags: z.number().positive(), feed_source: z.enum(["local", "foreign"]).default("local"), notes: z.string().max(1000).nullable().optional() });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await farmWrite(profile, "daily_feed", "create", parsed.data, { requestId: request.headers.get("X-Request-ID") || undefined });
  if (error) return farmErrorResponse(error);
  return NextResponse.json({ data }, { status: 201 });
}
