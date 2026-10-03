import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";
import { FARM_PRODUCT_KEYS, FARM_PRODUCTS } from "@/lib/farm-products";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";

export const runtime = "nodejs";

const saleItemSchema = z.object({
  product: z.enum(FARM_PRODUCT_KEYS),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().positive("Unit price must be positive"),
  pricing_basis: z.enum(["per_kg", "per_head", "per_unit"]).optional(),
  weight_kg: z.number().positive().optional().nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  other_product_name: z.string().max(100).optional().nullable(),
  customer_name: z.string().max(200).optional().nullable(),
  payment_method: z.enum(["cash", "transfer", "pos"]).default("cash"),
  notes: z.string().max(1000).optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

const batchSaleSchema = z.array(saleItemSchema.refine(item => (item.pricing_basis ?? FARM_PRODUCTS.find(product => product.key === item.product)!.pricingBasis) !== "per_kg" || !!item.weight_kg, { message: "Weight is required for sales priced per kg", path: ["weight_kg"] })).min(1).max(50);

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
    .select("*", { count: "exact" }).is("voided_at", null);

  if (date) query = query.eq("date", date);
  const product = searchParams.get("product");
  if (product) query = query.eq("product", product);

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

  const rows = parsed.data.map((item) => ({ ...item, pricing_basis: item.pricing_basis ?? (FARM_PRODUCTS.find(product => product.key === item.product)!.pricingBasis) }));
  const { data, error } = await farmWrite(profile, "sale", "create", rows, { requestId: request.headers.get("X-Request-ID") || (Array.isArray(body) ? body[0]?.request_id : (body as { request_id?: string })?.request_id) || undefined });
  if (error) return farmErrorResponse(error);
  return NextResponse.json({ data }, { status: 201 });
}
