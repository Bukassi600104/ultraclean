import {moneyNumber, subtractMoney, sumMoney, type MoneyInput} from "./money";
export interface OverviewRow { [key: string]: string | number | boolean | null | undefined }
export interface OverviewScope { from: string; to: string }
const inPeriod = (date: unknown, scope: OverviewScope) => typeof date === "string" && date.slice(0,10) >= scope.from && date.slice(0,10) <= scope.to;
function amount(row: OverviewRow) { return sumMoney([(row.amount_exact ?? row.amount) as MoneyInput]); }
/** Account observations are snapshots, never sums across posts or dates. */
export function summarizeContent(rows: { records: OverviewRow[]; performance: OverviewRow[]; leads: OverviewRow[]; sales: OverviewRow[] }, scope: OverviewScope) {
 const latest=new Map<string,OverviewRow>();
 for(const row of rows.performance) {
  if(row.content_id || String(row.metric_date)>scope.to) continue;
  const key=String(row.platform)+":"+String(row.account_id??""), prior=latest.get(key);
  if(!prior || String(row.metric_date)>String(prior.metric_date)) latest.set(key,row);
 }
 const sales=new Map<string,{currency:string;mentorship:string;affiliate:string}>();
 for(const row of rows.sales.filter(r=>inPeriod(r.sale_date,scope))) {
  const currency=String(row.currency), group=sales.get(currency)??{currency,mentorship:"0",affiliate:"0"};
  if(row.sale_type==="mentorship") group.mentorship=sumMoney([group.mentorship,amount(row)]);
  else if(row.sale_type==="affiliate") group.affiliate=sumMoney([group.affiliate,amount(row)]);
  sales.set(currency,group);
 }
 const analytics = Array.from(new Set(rows.sales.map(r=>String(r.currency)))).map(currency=>ledgerAnalytics(rows.sales.filter(r=>r.currency===currency).map(r=>({date:String(r.sale_date),amount:amount(r),category:String(r.sale_type),kind:"income" as const})),scope,currency));
 const audience_growth = Array.from(latest.values()).map(row=>{const baseline=rows.performance.filter(r=>!r.content_id&&r.platform===row.platform&&String(r.account_id??"")===String(row.account_id??"")&&String(r.metric_date)<scope.from).sort((a,b)=>String(b.metric_date).localeCompare(String(a.metric_date)))[0];return {platform:row.platform,account_id:row.account_id??"",change:baseline?.followers!=null&&row.followers!=null&&String(row.metric_date)>=scope.from?Number(row.followers)-Number(baseline.followers):null};});
 const leads_by_status = Object.entries(rows.leads.filter(r=>inPeriod(r.lead_date,scope)).reduce<Record<string,number>>((acc,r)=>{const key=String(r.status??"unknown");acc[key]=(acc[key]??0)+1;return acc;},{})).map(([name,value])=>({name,value}));
 const attribution=new Map<string,{currency:string;contentId:string|null;value:string}>();
 for(const row of rows.sales.filter(r=>inPeriod(r.sale_date,scope))) {
  const currency=String(row.currency),contentId=row.content_id==null?null:String(row.content_id),key=JSON.stringify([currency,contentId]);
  const group=attribution.get(key)??{currency,contentId,value:"0"};group.value=sumMoney([group.value,amount(row)]);attribution.set(key,group);
 }
 const sales_by_content=Array.from(attribution.values(),group=>{
  const record=rows.records.find(row=>row.id===group.contentId),duplicate=record&&rows.records.some(row=>row.id!==record.id&&row.title===record.title);
  const title=record?String(record.title)+(duplicate?` (${record.platform??"Unknown platform"} · ${record.id})`:""):group.contentId?`Unknown content (${group.contentId})`:"Unattributed";
  return {name:group.currency+" · "+title,value:moneyNumber(group.value)};
 });
 return {analytics,audience_growth,leads_by_status,sales_by_content,published:rows.records.filter(r=>r.status==="published"&&inPeriod(r.published_at,scope)).length,leads:rows.leads.filter(r=>inPeriod(r.lead_date,scope)).length,accounts:Array.from(latest.values()).sort((a,b)=>String(a.platform).localeCompare(String(b.platform))),sales:Array.from(sales.values()).map(group=>({...group,mentorship:moneyNumber(group.mentorship),affiliate:moneyNumber(group.affiliate)})).sort((a,b)=>a.currency.localeCompare(b.currency))};
}
/** Rent and expense ledgers are authoritative. Maintenance cost is an estimate, not a second expense. */
export function summarizeProperties(rows: { properties:OverviewRow[];units:OverviewRow[];rent:OverviewRow[];expenses:OverviewRow[];maintenance:OverviewRow[];tenancies?:OverviewRow[] }, scope:OverviewScope) {
 const finances=new Map<string,{currency:string;rent:string;expenses:string}>();
 for(const [key,list,date] of [["rent",rows.rent,"payment_date"],["expenses",rows.expenses,"expense_date"]] as const) {
  for(const row of list.filter(r=>inPeriod(r[date],scope))) {
   const currency=String(row.currency),group=finances.get(currency)??{currency,rent:"0",expenses:"0"};group[key]=sumMoney([group[key],amount(row)]);finances.set(currency,group);
  }
 }
 const propertyName=(row:OverviewRow,rent=false)=>{const tenancy=rent?(rows.tenancies??[]).find(t=>t.id===row.tenancy_id):null;const unit=rows.units.find(u=>u.id===tenancy?.unit_id);const id=rent?unit?.property_id:row.property_id;return String(rows.properties.find(p=>p.id===id)?.name??"Unknown property");};
 const analytics=Array.from(new Set([...rows.rent,...rows.expenses].map(r=>String(r.currency)))).map(currency=>ledgerAnalytics([...rows.rent.filter(r=>r.currency===currency).map(r=>({date:String(r.payment_date),amount:amount(r),category:propertyName(r,true),kind:"income" as const})),...rows.expenses.filter(r=>r.currency===currency).map(r=>({date:String(r.expense_date),amount:amount(r),category:propertyName(r),kind:"expense" as const}))],scope,currency));
 const occupied=rows.units.filter(r=>r.status==="occupied").length;
 return {analytics,occupied,occupancy_rate:rows.units.length?occupied/rows.units.length*100:null,overdue_rent:null,properties:rows.properties.filter(r=>r.status==="active").length,units:rows.units.length,vacancies:rows.units.filter(r=>r.status==="vacant").length,openRepairs:rows.maintenance.filter(r=>r.category==="repair"&&r.status!=="resolved").length,openMaintenance:rows.maintenance.filter(r=>r.category==="maintenance"&&r.status!=="resolved").length,finances:Array.from(finances.values()).map(group=>({currency:group.currency,rent:moneyNumber(group.rent),expenses:moneyNumber(group.expenses),net:moneyNumber(subtractMoney(group.rent,group.expenses))})).sort((a,b)=>a.currency.localeCompare(b.currency))};
}


type CashEntry = {date: string; amount: MoneyInput; category: string; kind: "income" | "expense"};
function ledgerAnalytics(entries: CashEntry[], scope: OverviewScope, currency: string | null) {
 const period = entries.filter(row => inPeriod(row.date, scope)), daily = new Map<string,{date:string;revenue:string;total_expenses:string}>();
 const income = new Map<string,string>(), expenses = new Map<string,string>();
 let revenue = "0", total_expenses = "0";
 for (const row of period) {
  const day = daily.get(row.date) ?? {date:row.date,revenue:"0",total_expenses:"0"};
  if (row.kind === "income") {revenue=sumMoney([revenue,row.amount]);day.revenue=sumMoney([day.revenue,row.amount]);income.set(row.category,sumMoney([income.get(row.category)??"0",row.amount]));} else {total_expenses=sumMoney([total_expenses,row.amount]);day.total_expenses=sumMoney([day.total_expenses,row.amount]);expenses.set(row.category,sumMoney([expenses.get(row.category)??"0",row.amount]));}
  daily.set(row.date,day);
 }
 const breakdown = (map:Map<string,string>) => Array.from(map,([name,value])=>({name,value:moneyNumber(value)}));
 const last = (kind:string) => entries.filter(r=>r.kind===kind&&r.date<=scope.to).map(r=>r.date).sort().at(-1)??null;
 return {currency,revenue:moneyNumber(revenue),total_expenses:moneyNumber(total_expenses),operational_net:moneyNumber(subtractMoney(revenue,total_expenses)),daily:Array.from(daily.values()).map(day=>({...day,revenue:moneyNumber(day.revenue),total_expenses:moneyNumber(day.total_expenses),operational_net:moneyNumber(subtractMoney(day.revenue,day.total_expenses))})).sort((a,b)=>a.date.localeCompare(b.date)),income_breakdown:breakdown(income),expense_breakdown:breakdown(expenses),last_income_date:last("income"),last_expense_date:last("expense"),income_count:period.filter(r=>r.kind==="income").length};
}
export function summarizeUltraTidy(rows:{inflow:OverviewRow[];expenses:OverviewRow[]},scope:OverviewScope) {
 return ledgerAnalytics([...rows.inflow.map(r=>({date:String(r.date),amount:amount(r),category:String(r.service),kind:"income" as const})),...rows.expenses.map(r=>({date:String(r.date),amount:amount(r),category:String(r.category),kind:"expense" as const}))],scope,"CAD");
}
export function summarizeDba(rows:{sales:OverviewRow[];products:OverviewRow[]},scope:OverviewScope) {
 const analytics=ledgerAnalytics(rows.sales.map(r=>({date:String(r.created_at).slice(0,10),amount:amount(r),category:String(rows.products.find(p=>p.id===r.product_id)?.name??"Unknown product"),kind:"income" as const})),scope,null);
 return {...analytics,profit:null,by_product:analytics.income_breakdown};
}
