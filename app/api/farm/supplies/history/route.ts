import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

import { requireManager } from "@/lib/auth";

export const runtime = "nodejs";

// GET — transaction history, optionally filtered by item_id
export async function GET(request: NextRequest) {
  try { await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const item_id = searchParams.get("item_id");
  const limit = Math.max(1, Math.min(Math.floor(Number(searchParams.get("limit"))) || 50, 200));
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("farm_supply_transactions")
    .select("*, farm_supply_inventory(item_name, unit, category)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (item_id) query = query.eq("item_id", item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const actorIds = Array.from(new Set((data || []).map((row) => row.created_by).filter(Boolean)));
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, name").in("id", actorIds) : { data: [] };
  const names = new Map((actors || []).map((actor) => [actor.id, actor.name]));
  return NextResponse.json({ data: (data || []).map((row) => ({ ...row, created_by_name: names.get(row.created_by) || null })) });
}
