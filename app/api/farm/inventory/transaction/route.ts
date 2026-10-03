import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { farmInventoryTransactionSchema } from "@/lib/validations";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";

export const runtime = "nodejs";

// Managers may inspect their operational movements to request corrections.
export async function GET(request: NextRequest) {
  let profile;
  try {
    profile = await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  let query = supabase
    .from("farm_inventory_transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (profile.role === "manager") query = query.limit(200);

  if (action) {
    query = query.eq("action", action);
  }

  if (profile.role === "admin") {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      let pageQuery = supabase.from("farm_inventory_transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (action) pageQuery = pageQuery.eq("action", action);
      const { data, error } = await pageQuery;
      if (error) return farmErrorResponse(error);
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    return NextResponse.json({ data: rows });
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST — manager: record a new inventory transaction
export async function POST(request: NextRequest) {
  let profile;
  try {
    profile = await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = farmInventoryTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (profile.role === "manager" && !["add", "mortality"].includes(parsed.data.action)) {
    return NextResponse.json({ error: "Request an inventory correction through Bimbo" }, { status: 403 });
  }
  const { data, error } = await farmWrite(profile, "inventory_transaction", "create", parsed.data, { requestId: parsed.data.request_id });

  if (error) {
    return farmErrorResponse(error);
  }

  return NextResponse.json(data, { status: 201 });
}
