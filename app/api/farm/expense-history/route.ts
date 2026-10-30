import {managerReadResponse} from "@/lib/manager-read-api";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { farmReadDates } from "@/lib/farm-read-filters";
export const runtime = "nodejs";
async function legacyGET(request: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin access required" }, { status: 403 }); }
  const params = new URL(request.url).searchParams;
  let dates: ReturnType<typeof farmReadDates>;
  try { dates = farmReadDates(params); } catch { return NextResponse.json({ error: "Invalid date range" }, { status: 400 }); }
  const page = Number(params.get("page") || 1), limit = Number(params.get("limit") || 20), category = params.get("category") || "all";
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(page * limit)) return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  const db = createServerClient();
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  type Row = { id: string; date: string; created_at: string; [key: string]: unknown };
  async function source(type: "expense" | "feed" | "purchase") {
    if ((category === "feed" && type === "expense") || (category !== "all" && category !== "feed" && type === "feed")) return { rows: [], total: 0 };
    const rows: {_type: "expense" | "feed" | "purchase"; data: Row}[] = [];
    let total = 0;
    for (let offset = 0; offset < page * limit; offset += 500) {
      let q = db!.from(type === "expense" ? "farm_expenses" : type === "feed" ? "farm_feed_purchases" : "farm_purchase_payments").select("*", { count: "exact" });
      if (type !== "feed") q = q.is("voided_at", null);
      if ((category !== "all" && category !== "feed") || (category === "feed" && type === "purchase")) q = q.eq("category", category);
      if (dates.date) q = q.eq("date", dates.date);
      if (dates.from) q = q.gte("date", dates.from);
      if (dates.to) q = q.lte("date", dates.to);
      const { data, count, error } = await q.order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, Math.min(offset + 499, page * limit - 1));
      if (error) throw error;
      total = count ?? 0;
      rows.push(...(data ?? []).map(row => ({ _type: type, data: row as Row })));
      if (rows.length >= total || !data?.length) break;
    }
    return { rows, total };
  }
  try {
    const [expenses, feed, purchases] = await Promise.all([source("expense"), source("feed"),source("purchase")]);
    const rows = [...expenses.rows, ...feed.rows,...purchases.rows].sort((a, b) => b.data.date.localeCompare(a.data.date) || b.data.created_at.localeCompare(a.data.created_at) || b.data.id.localeCompare(a.data.id) || b._type.localeCompare(a._type));
    return NextResponse.json({ data: rows.slice((page - 1) * limit, page * limit), total: expenses.total + feed.total + purchases.total, page, limit }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Expense history unavailable. Please retry." }, { status: 500 }); }
}

export async function GET(request: NextRequest) {
 const scoped=await managerReadResponse(request,"farm","farm_expenses","expenses",true);
 return scoped ?? legacyGET(request);
}
