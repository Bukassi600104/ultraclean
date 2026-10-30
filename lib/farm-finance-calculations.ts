import {moneyNumber, subtractMoney, sumMoney, type MoneyInput} from "./money";
export interface FinancialRow { date: string; amount?: MoneyInput; cost?: MoneyInput; total_amount?: MoneyInput; expense_source?: string | null; product?: string; category?: string; voided_at?: string | null }
export function calculateFarmFinance(rows: {transfers: FinancialRow[]; expenses: FinancialRow[]; feed: FinancialRow[]; sales: FinancialRow[]; purchases?: FinancialRow[]}, scope: {date: string; from?: string; to?: string}) {
 const {date, from = "0000-01-01", to = date} = scope;
 const active = (r: FinancialRow) => !r.voided_at;
 const sum = (rs: FinancialRow[], key: "amount" | "cost" | "total_amount") => sumMoney(rs.map(r => r[key] as MoneyInput));
 const transfers = rows.transfers.filter(active), expenses = [...rows.expenses,...(rows.purchases||[]).filter(r=>r.category!=="feed")].filter(active), sales = rows.sales.filter(active), feed = [...rows.feed,...(rows.purchases||[]).filter(r=>r.category==="feed"&&active(r)).map(r=>({...r,cost:r.amount}))];
 const before = (r: FinancialRow) => r.date < date, through = (r: FinancialRow) => r.date <= date, today = (r: FinancialRow) => r.date === date, range = (r: FinancialRow) => r.date >= from && r.date <= to;
 // NULL legacy sources retain the established owner-funded interpretation.
 const owner = (r: FinancialRow) => r.expense_source !== "sales_cash";
 const total_transferred = sum(transfers.filter(through),"amount"), transferred_today = sum(transfers.filter(today),"amount");
 const total_spent_before = sumMoney([sum(expenses.filter(r=>before(r)&&owner(r)),"amount"),sum(feed.filter(before),"cost")]);
 const opening_balance = subtractMoney(sum(transfers.filter(before),"amount"),total_spent_before);
 const total_spent_today = sumMoney([sum(expenses.filter(r=>today(r)&&owner(r)),"amount"),sum(feed.filter(today),"cost")]);
 const total_sales_today = sum(sales.filter(today),"total_amount"), total_sales_cash_expenses = sum(expenses.filter(r=>today(r)&&!owner(r)),"amount");
 const closing_balance = subtractMoney(sumMoney([opening_balance,transferred_today]),total_spent_today);
 const sales_cash_balance = subtractMoney(sum(sales.filter(through),"total_amount"),sum(expenses.filter(r=>through(r)&&!owner(r)),"amount"));
 const range_sales = sales.filter(range), range_expenses = expenses.filter(range), range_feed = feed.filter(range);
 const revenue = sum(range_sales,"total_amount"), general_expenses = sum(range_expenses,"amount"), feed_expenses = sum(range_feed,"cost");
 const grouped = (rs: FinancialRow[], field: "product" | "category", key: "total_amount" | "amount") => Object.entries(rs.reduce<Record<string,MoneyInput[]>>((acc,r)=>{(acc[r[field]??"Unknown"]??=[]).push(r[key] as MoneyInput);return acc;},{})).map(([name,values])=>({name,value:moneyNumber(sumMoney(values))}));
 const expenses_by_category = grouped([...range_expenses,...range_feed.map(r=>({date:r.date,category:"feed",amount:r.cost}))],"category","amount");
 const opening_owner_balance = subtractMoney(sum(transfers.filter(r=>r.date<from),"amount"),sum(expenses.filter(r=>r.date<from&&owner(r)),"amount"),sum(feed.filter(r=>r.date<from),"cost"));
 const opening_sales_cash_balance = subtractMoney(sum(sales.filter(r=>r.date<from),"total_amount"),sum(expenses.filter(r=>r.date<from&&!owner(r)),"amount"));
 const owner_transfers = sum(transfers.filter(range),"amount"), owner_general_expenses = sum(range_expenses.filter(owner),"amount"), sales_funded_expenses = sum(range_expenses.filter(r=>!owner(r)),"amount");
 const closing_owner_balance = subtractMoney(sumMoney([opening_owner_balance,owner_transfers]),owner_general_expenses,feed_expenses), closing_sales_cash_balance = subtractMoney(sumMoney([opening_sales_cash_balance,revenue]),sales_funded_expenses);
 const period_reconciliation = {opening_owner_balance:moneyNumber(opening_owner_balance),owner_transfers:moneyNumber(owner_transfers),owner_general_expenses:moneyNumber(owner_general_expenses),feed_expenses:moneyNumber(feed_expenses),closing_owner_balance:moneyNumber(closing_owner_balance),opening_sales_cash_balance:moneyNumber(opening_sales_cash_balance),sales:moneyNumber(revenue),sales_funded_expenses:moneyNumber(sales_funded_expenses),closing_sales_cash_balance:moneyNumber(closing_sales_cash_balance),owner_rounding_adjustment:moneyNumber(subtractMoney(moneyNumber(closing_owner_balance),subtractMoney(sumMoney([moneyNumber(opening_owner_balance),moneyNumber(owner_transfers)]),moneyNumber(owner_general_expenses),moneyNumber(feed_expenses)))),sales_rounding_adjustment:moneyNumber(subtractMoney(moneyNumber(closing_sales_cash_balance),subtractMoney(sumMoney([moneyNumber(opening_sales_cash_balance),moneyNumber(revenue)]),moneyNumber(sales_funded_expenses))))};
 const daily = Array.from(new Set([...range_sales,...range_expenses,...range_feed].map(r=>r.date))).sort().map(day=>{const income=sum(range_sales.filter(r=>r.date===day),"total_amount"),costs=sumMoney([sum(range_expenses.filter(r=>r.date===day),"amount"),sum(range_feed.filter(r=>r.date===day),"cost")]);return {date:day,revenue:moneyNumber(income),total_expenses:moneyNumber(costs),operational_net:moneyNumber(subtractMoney(income,costs))};});
 const latest = (rs: FinancialRow[]) => rs.filter(r=>r.date<=to).map(r=>r.date).sort().at(-1)??null;
 const last_entries = {sales:latest(sales),general_expenses:latest(expenses),feed:latest(feed),transfers:latest(transfers)};
 const amounts = {opening_balance,closing_balance,transferred_today,total_transferred,total_spent_before,total_spent_today,total_sales_today,total_sales_cash_expenses,sales_cash_balance,total_owner_spent:sumMoney([total_spent_before,total_spent_today]),net_position:sumMoney([closing_balance,sales_cash_balance]),revenue,general_expenses,feed_expenses,total_expenses:sumMoney([general_expenses,feed_expenses]),operational_net:subtractMoney(revenue,general_expenses,feed_expenses),today_total_expenses:sumMoney([total_spent_today,total_sales_cash_expenses]),today_operational_net:subtractMoney(total_sales_today,total_spent_today,total_sales_cash_expenses)};
 return {...Object.fromEntries(Object.entries(amounts).map(([key,value])=>[key,moneyNumber(value)])) as {[K in keyof typeof amounts]:number},daily,period_reconciliation,last_entries,sales_by_product:grouped(range_sales,"product","total_amount"),expenses_by_category};
}

export function applyPersonalFarmCash(result:ReturnType<typeof calculateFarmFinance>,cash:import("./operations-cash-validation").CashSummary){
 const own=cash.accounts.filter(a=>a.holder_type==="manager"&&a.currency==="NGN"),owner=own.filter(a=>a.bucket==="owner");
 const sum=(key:"opening"|"closing"|"funds_received"|"funds_received_total"|"paid_spending"|"paid_spending_total")=>sumMoney(owner.map(a=>a[key]));
 const closing=sum("closing"),salesHeld=sumMoney(own.filter(a=>a.bucket==="sales").map(a=>a.closing));
 return {...result,period_reconciliation:undefined,opening_balance:moneyNumber(sum("opening")),closing_balance:moneyNumber(closing),transferred_today:moneyNumber(sum("funds_received")),total_transferred:moneyNumber(sum("funds_received_total")),total_spent_today:moneyNumber(sum("paid_spending")),total_spent_before:moneyNumber(subtractMoney(sum("paid_spending_total"),sum("paid_spending"))),total_owner_spent:moneyNumber(sum("paid_spending_total")),sales_cash_balance:moneyNumber(salesHeld),net_position:moneyNumber(sumMoney([closing,salesHeld])),personal_cash:cash};
}
