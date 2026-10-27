export interface FinancialRow { date: string; amount?: number; cost?: number; total_amount?: number; expense_source?: string | null; product?: string; category?: string; voided_at?: string | null }
export function calculateFarmFinance(rows: { transfers: FinancialRow[]; expenses: FinancialRow[]; feed: FinancialRow[]; sales: FinancialRow[] }, scope: { date: string; from?: string; to?: string }) {
 const { date, from = "0000-01-01", to = date } = scope;
 const active = (r: FinancialRow) => !r.voided_at;
 const sum = (rs: FinancialRow[], key: "amount" | "cost" | "total_amount") => rs.reduce((n,r) => n + Number(r[key] ?? 0), 0);
 const transfers = rows.transfers.filter(active), expenses = rows.expenses.filter(active), sales = rows.sales.filter(active), feed = rows.feed;
 const before = (r: FinancialRow) => r.date < date, through = (r: FinancialRow) => r.date <= date, today = (r: FinancialRow) => r.date === date, range = (r: FinancialRow) => r.date >= from && r.date <= to;
 // NULL legacy sources retain the established owner-funded interpretation; no stored values are backfilled.
 const owner = (r: FinancialRow) => r.expense_source !== "sales_cash";
 const total_transferred = sum(transfers.filter(through), "amount"), transferred_today = sum(transfers.filter(today), "amount");
 const total_spent_before = sum(expenses.filter(r => before(r) && owner(r)), "amount") + sum(feed.filter(before), "cost");
 const opening_balance = sum(transfers.filter(before), "amount") - total_spent_before;
 const total_spent_today = sum(expenses.filter(r => today(r) && owner(r)), "amount") + sum(feed.filter(today), "cost");
 const total_sales_today = sum(sales.filter(today), "total_amount"), total_sales_cash_expenses = sum(expenses.filter(r => today(r) && !owner(r)), "amount");
 const closing_balance = opening_balance + transferred_today - total_spent_today;
 const sales_cash_balance = sum(sales.filter(through), "total_amount") - sum(expenses.filter(r => through(r) && !owner(r)), "amount");
 const range_sales = sales.filter(range), range_expenses = expenses.filter(range), range_feed = feed.filter(range);
 const revenue = sum(range_sales, "total_amount"), general_expenses = sum(range_expenses, "amount"), feed_expenses = sum(range_feed, "cost");
 const grouped = (rs: FinancialRow[], field: "product" | "category", value: "total_amount" | "amount") => Object.entries(rs.reduce<Record<string, number>>((acc,r) => { const key = r[field] ?? "Unknown"; acc[key] = (acc[key] ?? 0) + Number(r[value] ?? 0); return acc; }, {})).map(([name,value]) => ({ name,value }));
 const expenses_by_category = grouped(range_expenses, "category", "amount");
 if (feed_expenses) { const existing = expenses_by_category.find(r => r.name === "feed"); if (existing) existing.value += feed_expenses; else expenses_by_category.push({ name: "feed", value: feed_expenses }); }
 const opening_owner_balance = sum(transfers.filter(r => r.date < from), "amount") - sum(expenses.filter(r => r.date < from && owner(r)), "amount") - sum(feed.filter(r => r.date < from), "cost");
 const opening_sales_cash_balance = sum(sales.filter(r => r.date < from), "total_amount") - sum(expenses.filter(r => r.date < from && !owner(r)), "amount");
 const owner_transfers = sum(transfers.filter(range), "amount"), owner_general_expenses = sum(range_expenses.filter(owner), "amount"), sales_funded_expenses = sum(range_expenses.filter(r => !owner(r)), "amount");
 const period_reconciliation = {opening_owner_balance, owner_transfers, owner_general_expenses, feed_expenses, closing_owner_balance: opening_owner_balance + owner_transfers - owner_general_expenses - feed_expenses, opening_sales_cash_balance, sales: revenue, sales_funded_expenses, closing_sales_cash_balance: opening_sales_cash_balance + revenue - sales_funded_expenses};
 const daily = Array.from(new Set([...range_sales, ...range_expenses, ...range_feed].map(r => r.date))).sort().map(date => {const revenue = sum(range_sales.filter(r => r.date === date), "total_amount"), total_expenses = sum(range_expenses.filter(r => r.date === date), "amount") + sum(range_feed.filter(r => r.date === date), "cost");return {date, revenue, total_expenses, operational_net: revenue - total_expenses};});
 const latest = (rs: FinancialRow[]) => rs.filter(r => r.date <= to).map(r => r.date).sort().at(-1) ?? null;
 const last_entries = {sales: latest(sales), general_expenses: latest(expenses), feed: latest(feed), transfers: latest(transfers)};
 return { daily, period_reconciliation, last_entries, opening_balance, closing_balance, transferred_today, total_transferred, total_spent_before, total_spent_today, total_sales_today, total_sales_cash_expenses, sales_cash_balance, net_position: closing_balance + sales_cash_balance, revenue, general_expenses, feed_expenses, total_expenses: general_expenses + feed_expenses, operational_net: revenue - general_expenses - feed_expenses, today_total_expenses: total_spent_today + total_sales_cash_expenses, today_operational_net: total_sales_today - total_spent_today - total_sales_cash_expenses, sales_by_product: grouped(range_sales, "product", "total_amount"), expenses_by_category };
}
