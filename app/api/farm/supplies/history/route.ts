import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET — transaction history, optionally filtered by item_id
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const item_id = searchParams.get("item_id");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const page = parseInt(searchParams.get("page") || "1");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("farm_supply_transactions")
    .select("*, farm_supply_inventory(item_name, unit, category)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (item_id) query = query.eq("item_id", item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
