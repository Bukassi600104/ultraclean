import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { dbaSaleSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const { data, count, error } = await supabase
    .from("dba_sales")
    .select("*, product:dba_products(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json();
  const parsed = dbaSaleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Insert sale + increment download_count
  const { data, error } = await supabase
    .from("dba_sales")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment download count (non-critical)
  try {
    await supabase
      .from("dba_products")
      .update({
        download_count: (
          await supabase
            .from("dba_products")
            .select("download_count")
            .eq("id", parsed.data.product_id)
            .single()
        ).data?.download_count + 1 || 1,
      })
      .eq("id", parsed.data.product_id);
  } catch {
    // Non-critical
  }

  return NextResponse.json(data, { status: 201 });
}
