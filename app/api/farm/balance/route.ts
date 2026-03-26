import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";

export const runtime = "nodejs";

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
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    // All transfers up to and including the given date
    const { data: transfers, error: te } = await supabase
      .from("farm_fund_transfers")
      .select("amount")
      .lte("date", date);

    if (te) throw te;

    // All expenses BEFORE the given date
    const { data: expensesBefore, error: ee } = await supabase
      .from("farm_expenses")
      .select("amount")
      .lt("date", date);

    if (ee) throw ee;

    // All feed purchases BEFORE the given date
    const { data: feedBefore, error: fe } = await supabase
      .from("farm_feed_purchases")
      .select("cost")
      .lt("date", date);

    if (fe) throw fe;

    // Expenses ON the given date
    const { data: expensesToday, error: et } = await supabase
      .from("farm_expenses")
      .select("amount")
      .eq("date", date);

    if (et) throw et;

    // Feed purchases ON the given date
    const { data: feedToday, error: ft } = await supabase
      .from("farm_feed_purchases")
      .select("cost")
      .eq("date", date);

    if (ft) throw ft;

    const total_transferred = (transfers || []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount || 0),
      0
    );
    const total_spent_before =
      (expensesBefore || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0) +
      (feedBefore || []).reduce((s: number, r: { cost: number }) => s + (r.cost || 0), 0);

    const opening_balance = total_transferred - total_spent_before;

    const total_spent_today =
      (expensesToday || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0) +
      (feedToday || []).reduce((s: number, r: { cost: number }) => s + (r.cost || 0), 0);

    const closing_balance = opening_balance - total_spent_today;

    return NextResponse.json({
      opening_balance,
      closing_balance,
      total_transferred,
      total_spent_before,
      total_spent_today,
    });
  } catch (err) {
    console.error("balance GET error:", err);
    return NextResponse.json({ error: "Failed to compute balance" }, { status: 500 });
  }
}
