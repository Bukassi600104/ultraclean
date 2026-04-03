import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const transactionSchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
  item_name: z.string().min(1).max(200),
  action: z.enum(["add", "remove", "adjust"]),
  quantity: z.number().positive("Quantity must be positive"),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  let q = supabase
    .from("ultratidy_inventory_transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (action && action !== "all") q = q.eq("action", action);

  const { data, error } = await q;
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

  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ultratidy_inventory_transactions")
    .insert({ ...parsed.data, created_by: profile.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
