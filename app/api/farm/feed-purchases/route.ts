import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const feedItemSchema = z
  .object({
    feed_type: z.enum(["fish", "goat"]),
    feed_source: z.enum(["local", "foreign"]),
    weight_unit: z.enum(["tons", "kg"]),
    weight_amount: z.number().positive("Weight must be positive"),
    num_bags: z.number().int().positive("Number of bags must be positive"),
    cost: z.number().positive("Cost must be positive"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  })
  .refine(
    (d) =>
      (d.feed_source === "local" && d.weight_unit === "tons") ||
      (d.feed_source === "foreign" && d.weight_unit === "kg"),
    { message: "Local feed must use tons; foreign feed must use kg" }
  );

const batchFeedSchema = z.array(feedItemSchema).min(1).max(50);

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
    .from("farm_feed_purchases")
    .select("*", { count: "exact" });

  if (date) query = query.eq("date", date);

  query = query
    .order("date", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("farm_feed_purchases GET error:", error);
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

  const parsed = batchFeedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const rows = parsed.data.map((item) => ({
    ...item,
    created_by: profile.id,
  }));

  const { data, error } = await supabase
    .from("farm_feed_purchases")
    .insert(rows)
    .select();

  if (error) {
    console.error("farm_feed_purchases POST error:", error);
    return NextResponse.json({ error: "Failed to save records" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
