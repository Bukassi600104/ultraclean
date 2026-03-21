import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("ultratidy_inventory")
    .select("*")
    .order("item_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { item_name, category, current_quantity, unit, reorder_level } = body;

  if (!item_name) return NextResponse.json({ error: "Item name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ultratidy_inventory")
    .insert({ item_name, category: category || "supplies", current_quantity: parseFloat(current_quantity) || 0, unit: unit || "units", reorder_level: parseFloat(reorder_level) || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
