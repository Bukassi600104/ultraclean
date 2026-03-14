import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { leadCreateSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_SORT_COLUMNS = [
  "created_at",
  "updated_at",
  "name",
  "status",
  "business",
  "date_needed",
] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const business = searchParams.get("business");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
  const rawSortBy = searchParams.get("sortBy") || "created_at";
  const sortBy = (ALLOWED_SORT_COLUMNS as readonly string[]).includes(rawSortBy)
    ? rawSortBy
    : "created_at";
  const sortDir = searchParams.get("sortDir") === "asc" ? true : false;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (business) query = query.eq("business", business);
  if (search) {
    // Escape Supabase filter special characters to prevent filter injection
    const safeSearch = search.replace(/[%_\\()*,]/g, "\\$&").slice(0, 100);
    query = query.or(
      `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`
    );
  }

  query = query
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = leadCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
