import { createServerClient } from "@/lib/supabase/server";
import { calculateFarmFinance, type FinancialRow } from "./farm-finance-calculations";
import {allManagerRecords} from "./manager-read-api";
import type {ManagerScope} from "./manager-period-types";
import {getCashSummary} from "./operations-cash";
import {sumMoney,subtractMoney,moneyNumber} from "./money";
export { calculateFarmFinance } from "./farm-finance-calculations";
export async function getFarmFinance(scope: { date: string; from?: string; to?: string },manager?:ManagerScope) {
 const supabase = createServerClient(); if (!supabase) throw new Error("Database not configured");
 async function all(table: string): Promise<FinancialRow[]> {
  const rows: FinancialRow[] = []; const maxDate = (scope.to ?? scope.date) > scope.date ? scope.to! : scope.date;
  if(manager&&manager.mode!=="admin_all"&&manager.periodId){
   const scoped=await allManagerRecords(manager,table,{to:maxDate});
   return scoped.map(row=>({...row,amount:row.amount_exact??row.amount,cost:row.cost_exact??row.cost,total_amount:row.total_amount_exact??row.total_amount})) as unknown as FinancialRow[];
  }
  for (let offset = 0; ; offset += 500) {
   const columns: Record<string,string> = {farm_sales:"date,product,total_amount::text,voided_at",farm_expenses:"date,category,amount::text,expense_source,voided_at",farm_feed_purchases:"date,cost::text",farm_fund_transfers:"date,amount::text,voided_at"};
   const { data, error } = await supabase!.from(table).select(columns[table]).lte("date", maxDate).order("id").range(offset, offset + 499);
   // The client type parser does not model PostgREST numeric-to-text casts.
   if (error) throw error; rows.push(...((data ?? []) as unknown as FinancialRow[])); if (!data || data.length < 500) return rows;
  }
 }
 const [transfers, expenses, feed, sales] = await Promise.all([all("farm_fund_transfers"), all("farm_expenses"), all("farm_feed_purchases"), all("farm_sales")]);
 const result=calculateFarmFinance({ transfers, expenses, feed, sales }, scope);
 if(manager?.mode!=="personal")return result;
 const cash=await getCashSummary(manager,{from:scope.date,to:scope.date}),own=cash.accounts.filter(a=>a.holder_type==="manager"&&a.currency==="NGN"),owner=own.filter(a=>a.bucket==="owner");
 const sum=(key:"opening"|"closing"|"funds_received"|"funds_received_total"|"paid_spending"|"paid_spending_total")=>sumMoney(owner.map(a=>a[key]));
 const closing=sum("closing"),salesHeld=sumMoney(own.filter(a=>a.bucket==="sales").map(a=>a.closing));
 return {...result,opening_balance:moneyNumber(sum("opening")),closing_balance:moneyNumber(closing),transferred_today:moneyNumber(sum("funds_received")),total_transferred:moneyNumber(sum("funds_received_total")),total_spent_today:moneyNumber(sum("paid_spending")),total_spent_before:moneyNumber(subtractMoney(sum("paid_spending_total"),sum("paid_spending"))),total_owner_spent:moneyNumber(sum("paid_spending_total")),sales_cash_balance:moneyNumber(salesHeld),net_position:moneyNumber(sumMoney([closing,salesHeld])),personal_cash:cash};
}
