import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";

export const runtime = "nodejs";

// POST — record a supply transaction (purchase / use / adjustment)
export async function POST(request: NextRequest) {
  let profile;
  try {
    profile = await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json();
  const { item_id, action, quantity, notes } = body;

  if (!item_id) return NextResponse.json({ error: "item_id is required" }, { status: 400 });
  if (!action || !["purchase", "use", "adjustment"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const qty = Number(quantity);
  if (!qty || isNaN(qty)) {
    return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 });
  }

  // use = negative change, purchase/adjustment = positive change
  const quantity_change = action === "use" ? -Math.abs(qty) : Math.abs(qty);

  // Guard: don't allow going below zero for "use"
  if (action === "use") {
    const { data: item } = await supabase
      .from("farm_supply_inventory")
      .select("current_quantity, item_name")
      .eq("id", item_id)
      .single();

    if (item && item.current_quantity + quantity_change < 0) {
      return NextResponse.json(
        { error: `Cannot use more than available stock (${item.current_quantity} ${item.item_name})` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("farm_supply_transactions")
    .insert({
      item_id,
      action,
      quantity_change,
      notes: notes?.trim() || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
