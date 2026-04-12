import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// PUT — update restock threshold (admin only) or item details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.restock_threshold !== undefined) {
    updates.restock_threshold = body.restock_threshold === "" ? null : Number(body.restock_threshold);
  }
  if (body.item_name !== undefined) updates.item_name = body.item_name.trim();
  if (body.category !== undefined) updates.category = body.category;
  if (body.unit !== undefined) updates.unit = body.unit.trim();
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const { data, error } = await supabase
    .from("farm_supply_inventory")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
