import {withManagerWrite} from "@/lib/manager-write-api";
import {managerReadResponse} from "@/lib/manager-read-api";
import { farmReadDates } from "@/lib/farm-read-filters";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { z } from "zod";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import {cashPayerFields} from "@/lib/operations-cash-validation";
import {financialResponse} from "@/lib/operations-cash";

export const runtime = "nodejs";

const expenseItemSchema = z.object({
  ...cashPayerFields,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: z.enum(["labor", "utilities", "veterinary", "transport", "equipment", "produce"]),
  expense_source: z.enum(["bimbo_transfer", "sales_cash"]).default("bimbo_transfer"),
  amount: z.number().positive("Amount must be positive"),
  paid_to: z.string().max(200).optional().nullable(),
  payment_method: z.enum(["cash", "transfer", "pos"]).default("cash"),
  item_name: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const batchExpenseSchema = z.array(expenseItemSchema).min(1).max(50);


async function legacyGET(request: NextRequest) {
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
  let dates;
  try { dates = farmReadDates(searchParams); } catch { return NextResponse.json({ error: "Invalid date range" }, { status: 400 }); }
  const { date, from, to } = dates;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));

  let query = supabase
    .from("farm_expenses")
    .select("*", { count: "exact" }).is("voided_at", null);

  if (category) query = query.eq("category", category);
  if (date) query = query.eq("date", date);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  query = query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("farm_expenses GET error:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}

async function legacyPOST(request: NextRequest) {
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

  const isBatch = Array.isArray(body);
  const parsed = (isBatch ? batchExpenseSchema : expenseItemSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await farmWrite(profile, "expense", "create", parsed.data, { requestId: request.headers.get("X-Request-ID") || (Array.isArray(body) ? body[0]?.request_id : (body as { request_id?: string })?.request_id) || undefined });
  if (error) return farmErrorResponse(error);
  return financialResponse(data,201,isBatch);
}

export async function GET(request: NextRequest) {
 const scoped=await managerReadResponse(request,"farm","farm_expenses","list",false);
 return scoped ?? legacyGET(request);
}

export async function POST(request: NextRequest) { return withManagerWrite(request,"farm",()=>legacyPOST(request)); }
