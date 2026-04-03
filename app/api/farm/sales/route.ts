import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const saleItemSchema = z.object({
  product: z.enum(["catfish", "goat", "chicken", "other", "crops"]),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().positive("Unit price must be positive"),
  weight_kg: z.number().positive().optional().nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  other_product_name: z.string().max(100).optional().nullable(),
  customer_name: z.string().max(200).optional().nullable(),
  payment_method: z.enum(["cash", "transfer", "pos"]).default("cash"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

const batchSaleSchema = z.array(saleItemSchema).min(1).max(50);

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
  const date = searchParams.get("date");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));

  void profile;

  let query = supabase
    .from("farm_sales")
    .select("*", { count: "exact" });

  if (date) query = query.eq("date", date);

  query = query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("farm_sales GET error:", error);
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

  const parsed = batchSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const rows = parsed.data.map((item) => ({
    ...item,
    total_amount: item.quantity * item.unit_price,
    created_by: profile.id,
  }));

  const { data, error } = await supabase
    .from("farm_sales")
    .insert(rows)
    .select();

  if (error) {
    console.error("farm_sales POST error:", error);
    return NextResponse.json({ error: "Failed to save records" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
