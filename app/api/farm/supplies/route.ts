import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET — list all supply items
export async function GET() {
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { data, error } = await supabase
    .from("farm_supply_inventory")
    .select("*")
    .order("category")
    .order("item_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create a new supply item
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const body = await request.json();
  const { item_name, category, unit, current_quantity, notes } = body;

  if (!item_name?.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (!unit?.trim()) {
    return NextResponse.json({ error: "Unit is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("farm_supply_inventory")
    .insert({
      item_name: item_name.trim(),
      category: category || "other",
      unit: unit.trim(),
      current_quantity: Number(current_quantity) || 0,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
