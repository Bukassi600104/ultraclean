import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const inventoryUpdateSchema = z.object({
  item_name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  current_quantity: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  reorder_level: z.number().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const parsed = inventoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ultratidy_inventory")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { error } = await supabase.from("ultratidy_inventory").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
