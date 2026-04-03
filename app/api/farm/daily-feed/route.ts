import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";

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
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));

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

  const body = await request.json();
  const { date, feed_type, num_bags, feed_source, notes } = body;

  if (!date || !feed_type || !num_bags || num_bags <= 0) {
    return NextResponse.json({ error: "date, feed_type and num_bags are required" }, { status: 400 });
  }

  const source = feed_source === "foreign" ? "foreign" : "local";

  const { data, error } = await supabase
    .from("farm_daily_feed")
    .insert({ date, feed_type, num_bags: Number(num_bags), feed_source: source, notes: notes || null, created_by: profile.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
