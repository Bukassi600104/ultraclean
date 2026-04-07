import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  category: z.enum(["feed", "labor", "utilities", "veterinary", "transport", "equipment"]).optional(),
  amount: z.number().positive().optional(),
  paid_to: z.string().optional(),
  payment_method: z.enum(["cash", "transfer", "pos"]).optional(),
  expense_source: z.enum(["bimbo_transfer", "sales_cash"]).optional(),
  item_name: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try { await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const today = new Date().toISOString().split("T")[0];
  const { data: record } = await supabase
    .from("farm_daily_records")
    .select("status")
    .eq("date", today)
    .maybeSingle();
  if (record?.status === "closed") {
    return NextResponse.json({ error: "Day is closed. Records cannot be edited." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const { data, error } = await supabase
    .from("farm_expenses")
    .update({ ...parsed.data, is_edited: true })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try { await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const today = new Date().toISOString().split("T")[0];
  const { data: record } = await supabase
    .from("farm_daily_records")
    .select("status")
    .eq("date", today)
    .maybeSingle();
  if (record?.status === "closed") {
    return NextResponse.json({ error: "Day is closed. Records cannot be deleted." }, { status: 403 });
  }

  const { error } = await supabase.from("farm_expenses").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
