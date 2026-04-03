import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const expenseItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: z.enum(["labor", "utilities", "veterinary", "transport", "equipment"]),
  amount: z.number().positive("Amount must be positive"),
  paid_to: z.string().max(200).optional().nullable(),
  payment_method: z.enum(["cash", "transfer", "pos"]).default("cash"),
  item_name: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const batchExpenseSchema = z.array(expenseItemSchema).min(1).max(50);


export async function GET(request: NextRequest) {
  // Admin sees all; managers can also fetch for balance display
  try {
    await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const date = searchParams.get("date");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));

  let query = supabase
    .from("farm_expenses")
    .select("*", { count: "exact" });

  if (category) query = query.eq("category", category);
  if (date) query = query.eq("date", date);

  query = query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("farm_expenses GET error:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Support both array (batch) and single object
  const isBatch = Array.isArray(body);

  if (isBatch) {
    const parsed = batchExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const rows = parsed.data.map((item) => ({ ...item, created_by: profile.id }));
    const { data, error } = await supabase
      .from("farm_expenses")
      .insert(rows)
      .select();

    if (error) {
      console.error("farm_expenses POST batch error:", error);
      return NextResponse.json({ error: "Failed to save records" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } else {
    const parsed = expenseItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("farm_expenses")
      .insert({ ...parsed.data, created_by: profile.id })
      .select()
      .single();

    if (error) {
      console.error("farm_expenses POST error:", error);
      return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
}
