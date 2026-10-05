export interface OverviewRow { [key: string]: string | number | boolean | null | undefined }
export interface OverviewScope { from: string; to: string }
const inPeriod = (date: unknown, scope: OverviewScope) => typeof date === "string" && date.slice(0,10) >= scope.from && date.slice(0,10) <= scope.to;
function amount(row: OverviewRow) { const value=Number(row.amount); if(!Number.isFinite(value)) throw new Error("Invalid saved financial amount"); return value; }
/** Account observations are snapshots, never sums across posts or dates. */
export function summarizeContent(rows: { records: OverviewRow[]; performance: OverviewRow[]; leads: OverviewRow[]; sales: OverviewRow[] }, scope: OverviewScope) {
 const latest=new Map<string,OverviewRow>();
 for(const row of rows.performance) {
  if(row.content_id || String(row.metric_date)>scope.to) continue;
  const key=String(row.platform)+":"+String(row.account_id??""), prior=latest.get(key);
  if(!prior || String(row.metric_date)>String(prior.metric_date)) latest.set(key,row);
 }
 const sales=new Map<string,{currency:string;mentorship:number;affiliate:number}>();
 for(const row of rows.sales.filter(r=>inPeriod(r.sale_date,scope))) {
  const currency=String(row.currency), group=sales.get(currency)??{currency,mentorship:0,affiliate:0};
  if(row.sale_type==="mentorship") group.mentorship+=amount(row);
  else if(row.sale_type==="affiliate") group.affiliate+=amount(row);
  sales.set(currency,group);
 }
 return {published:rows.records.filter(r=>r.status==="published"&&inPeriod(r.published_at,scope)).length,leads:rows.leads.filter(r=>inPeriod(r.lead_date,scope)).length,accounts:Array.from(latest.values()).sort((a,b)=>String(a.platform).localeCompare(String(b.platform))),sales:Array.from(sales.values()).sort((a,b)=>a.currency.localeCompare(b.currency))};
}
/** Rent and expense ledgers are authoritative. Maintenance cost is an estimate, not a second expense. */
export function summarizeProperties(rows: { properties:OverviewRow[];units:OverviewRow[];rent:OverviewRow[];expenses:OverviewRow[];maintenance:OverviewRow[] }, scope:OverviewScope) {
 const finances=new Map<string,{currency:string;rent:number;expenses:number;net:number}>();
 for(const [key,list,date] of [["rent",rows.rent,"payment_date"],["expenses",rows.expenses,"expense_date"]] as const) {
  for(const row of list.filter(r=>inPeriod(r[date],scope))) {
   const currency=String(row.currency),group=finances.get(currency)??{currency,rent:0,expenses:0,net:0};group[key]+=amount(row);group.net=group.rent-group.expenses;finances.set(currency,group);
  }
 }
 return {properties:rows.properties.filter(r=>r.status==="active").length,units:rows.units.length,vacancies:rows.units.filter(r=>r.status==="vacant").length,openRepairs:rows.maintenance.filter(r=>r.category==="repair"&&r.status!=="resolved").length,openMaintenance:rows.maintenance.filter(r=>r.category==="maintenance"&&r.status!=="resolved").length,finances:Array.from(finances.values()).sort((a,b)=>a.currency.localeCompare(b.currency))};
}
