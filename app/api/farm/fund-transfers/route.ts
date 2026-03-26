import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, requireManager } from "@/lib/auth";
import { z } from "zod";
import { Resend } from "resend";

export const runtime = "nodejs";

const transferSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().max(1000).optional().nullable(),
});

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(request: NextRequest) {
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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));

  const { data, count, error } = await supabase
    .from("farm_fund_transfers")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error("fund_transfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  let profile;
  try {
    profile = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized: admin only" }, { status: 401 });
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

  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("farm_fund_transfers")
    .insert({ ...parsed.data, created_by: profile.id })
    .select()
    .single();

  if (error) {
    console.error("fund_transfers POST error:", error);
    return NextResponse.json({ error: "Failed to save transfer" }, { status: 500 });
  }

  // After insert, check balance and send alert if <= 0
  try {
    const today = new Date().toISOString().split("T")[0];

    const [transfersRes, expensesRes, feedRes] = await Promise.all([
      supabase.from("farm_fund_transfers").select("amount").lte("date", today),
      supabase.from("farm_expenses").select("amount").lte("date", today),
      supabase.from("farm_feed_purchases").select("cost").lte("date", today),
    ]);

    const totalTransferred = (transfersRes.data || []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount || 0),
      0
    );
    const totalExpenses = (expensesRes.data || []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount || 0),
      0
    );
    const totalFeed = (feedRes.data || []).reduce(
      (s: number, r: { cost: number }) => s + (r.cost || 0),
      0
    );
    const currentBalance = totalTransferred - totalExpenses - totalFeed;

    if (currentBalance <= 0 && process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const balStr = escHtml(`₦${Math.abs(currentBalance).toLocaleString()}`);
      await resend.emails.send({
        from: "UltraTidy <hello@ultratidycleaning.com>",
        to: process.env.ADMIN_EMAIL,
        subject: "⚠️ Primefield Farm Balance Alert",
        html: `<p>The farm expense balance has reached ${balStr}. Please send funds to the farm manager.</p>`,
      });
    }
  } catch (alertErr) {
    console.error("Balance alert error (non-critical):", alertErr);
  }

  return NextResponse.json(data, { status: 201 });
}
