import { createServerClient } from "@/lib/supabase/server";
import { calculateFarmFinance, type FinancialRow } from "./farm-finance-calculations";
export { calculateFarmFinance } from "./farm-finance-calculations";
export async function getFarmFinance(scope: { date: string; from?: string; to?: string }) {
 const supabase = createServerClient(); if (!supabase) throw new Error("Database not configured");
 async function all(table: string): Promise<FinancialRow[]> {
  const rows: FinancialRow[] = []; const maxDate = (scope.to ?? scope.date) > scope.date ? scope.to! : scope.date;
  for (let offset = 0; ; offset += 500) {
   const { data, error } = await supabase!.from(table).select("*").lte("date", maxDate).order("id").range(offset, offset + 499);
   if (error) throw error; rows.push(...(data ?? [])); if (!data || data.length < 500) return rows;
  }
 }
 const [transfers, expenses, feed, sales] = await Promise.all([all("farm_fund_transfers"), all("farm_expenses"), all("farm_feed_purchases"), all("farm_sales")]);
 return calculateFarmFinance({ transfers, expenses, feed, sales }, scope);
}
