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

    // All expenses BEFORE the given date (exclude sales_cash expenses from balance calc)
    const { data: expensesBefore, error: ee } = await supabase
      .from("farm_expenses")
      .select("amount")
      .lt("date", date)
      .neq("expense_source", "sales_cash");

    if (ee) throw ee;

    // All feed purchases BEFORE the given date
    const { data: feedBefore, error: fe } = await supabase
      .from("farm_feed_purchases")
      .select("cost")
      .lt("date", date);

    if (fe) throw fe;

    // Expenses ON the given date (exclude sales_cash from balance)
    const { data: expensesToday, error: et } = await supabase
      .from("farm_expenses")
      .select("amount, expense_source")
      .eq("date", date);

    if (et) throw et;

    // Feed purchases ON the given date
    const { data: feedToday, error: ft } = await supabase
      .from("farm_feed_purchases")
      .select("cost")
      .eq("date", date);

    if (ft) throw ft;

    // Farm sales ON the given date
    const { data: salesToday, error: st } = await supabase
      .from("farm_sales")
      .select("total_amount")
      .eq("date", date);

    if (st) throw st;

    const total_transferred = (transfers || []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount || 0),
      0
    );
    const total_spent_before =
      (expensesBefore || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0) +
      (feedBefore || []).reduce((s: number, r: { cost: number }) => s + (r.cost || 0), 0);

    const opening_balance = total_transferred - total_spent_before;

    const total_spent_today =
      (expensesToday || []).filter((r: { amount: number; expense_source?: string }) => r.expense_source !== "sales_cash").reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0) +
      (feedToday || []).reduce((s: number, r: { cost: number }) => s + (r.cost || 0), 0);

    const total_sales_cash_expenses =
      (expensesToday || []).filter((r: { amount: number; expense_source?: string }) => r.expense_source === "sales_cash").reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);

    const closing_balance = opening_balance - total_spent_today;

    const total_sales_today = (salesToday || []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount || 0), 0);

    const net_position = total_transferred + total_sales_today - total_spent_before - total_spent_today - total_sales_cash_expenses;

    return NextResponse.json({
      opening_balance,
      closing_balance,
      total_transferred,
      total_spent_before,
      total_spent_today,
      total_sales_today,
      total_sales_cash_expenses,
      net_position,
    });
  } catch (err) {
    console.error("balance GET error:", err);
    return NextResponse.json({ error: "Failed to compute balance" }, { status: 500 });
  }
}
