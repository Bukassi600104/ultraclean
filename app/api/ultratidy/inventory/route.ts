import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const inventoryItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required").max(200),
  category: z.string().max(100).optional().default("supplies"),
  current_quantity: z.number().min(0).default(0),
  unit: z.string().max(50).optional().default("units"),
  reorder_level: z.number().min(0).optional().default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

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
  let profile;
  try { profile = await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const parsed = inventoryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ultratidy_inventory")
    .insert({ ...parsed.data, created_by: profile.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
