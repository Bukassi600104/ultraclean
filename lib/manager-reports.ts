import {sumMoney} from "./money";
import {createServerClient} from "@/lib/supabase/server";
import {calculateFarmFinance,applyPersonalFarmCash,type FinancialRow} from "./farm-finance-calculations";
import {summarizeContent,summarizeProperties,type OverviewRow} from "./ceo-calculations";
import type {Business,ManagerScope} from "./manager-period-types";
import type {CashSummary} from "./operations-cash-validation";
export type ReportRow=Record<string,unknown>;
export type ManagerPeriod={id:string;manager_id:string;business:Business;mode:"legacy"|"personal";starts_on:string|null;status:"active"|"awaiting_handover"|"closed";ended_at:string|null;created_at:string;manager_name:string|null};
export type CashBridge={currency:string;owner_ledger:string;tracked_owner:string;unallocated_owner:string;sales_ledger:string;tracked_sales:string;unallocated_sales:string};
export type ManagerSnapshot={scope:ManagerScope;manager:{id:string;name:string|null;suspended:boolean}|null;periods:ManagerPeriod[];from:string;to:string;asOf:string;records:Record<string,ReportRow[]>;assets:Record<string,ReportRow[]>;cash:CashSummary;cash_daily?:CashSummary;bridge:CashBridge|null;decisions:{handovers:ReportRow[];operational_requests?:ReportRow[];corrections?:ReportRow[]}};
export async function getManagerSnapshot(scope:ManagerScope,dates:{from?:string;to?:string}={}):Promise<ManagerSnapshot>{
 if(scope.featureEnabled!==true)throw Object.assign(Error("The updated reports are being prepared. Existing records remain available."),{code:"503"});
 const db=createServerClient();if(!db)throw Error("Reports are unavailable");const {data,error}=await db.rpc("manager_report_snapshot",{p_actor:scope.actorId,p_business:scope.business,p_period_id:scope.periodId,p_from:dates.from??null,p_to:dates.to??null});if(error)throw error;
 if(!data||!data.records||!data.assets||!data.cash||!Array.isArray(data.periods)||data.scope?.actorId!==scope.actorId||data.scope?.business!==scope.business||data.scope?.periodId!==scope.periodId)throw Error("The report scope could not be verified");return data;
}
export function summarizeManagerSnapshot(snapshot:ManagerSnapshot){
 const r=snapshot.records,rows=(key:string)=>(r[key]||[]) as OverviewRow[],range={from:snapshot.from,to:snapshot.to};
 const financial=(key:string)=>(r[key]||[]).map(row=>({...row,amount:row.amount_exact??row.amount,cost:row.cost_exact??row.cost,total_amount:row.total_amount_exact??row.total_amount})) as unknown as FinancialRow[];
 const farmWork=snapshot.scope.business==="farm"?calculateFarmFinance({transfers:financial("farm_fund_transfers"),expenses:financial("farm_expenses"),feed:financial("farm_feed_purchases"),sales:financial("farm_sales"),purchases:financial("farm_purchase_payments")},{date:snapshot.to,...range}):null;
 const farm=farmWork&&snapshot.scope.mode==="personal"?applyPersonalFarmCash(farmWork,snapshot.cash_daily||snapshot.cash):farmWork;
 const property=snapshot.scope.business==="property"?summarizeProperties({properties:rows("property_properties"),units:rows("property_units"),tenancies:rows("property_tenancies"),rent:rows("property_rent_payments"),expenses:rows("property_expenses"),maintenance:rows("property_maintenance")},range):null;
 const publications=[...rows("content_records")],seen=new Set(publications.map(r=>r.id));
 // A newly published assigned post is proven by its own audited change, never by assignment alone.
 for(const asset of snapshot.assets.content_records||[]){if(asset.status!=="published"||seen.has(String(asset.id)))continue;const proved=(r.content_audit||[]).some(audit=>{const before=audit.before_value as ReportRow|null,after=audit.after_value as ReportRow|null;return !!after&&after.id===asset.id&&after.published_at===asset.published_at&&after.published_at!==before?.published_at;});if(proved){publications.push(asset as OverviewRow);seen.add(String(asset.id));}}
 const content=snapshot.scope.business==="content"?summarizeContent({records:publications,performance:rows("content_performance"),leads:rows("content_leads"),sales:rows("content_sales")},range):null;
 const tracked=new Set((r.operations_cash_events||[]).map(e=>`${e.resource}:${e.record_id}`)),funds=new Set((r.operations_cash_events||[]).map(e=>e.fund_transfer_id));
 const financialResources=snapshot.scope.business==="farm"?["farm_sales","farm_expenses","farm_feed_purchases","farm_fund_transfers","farm_purchase_payments"]:snapshot.scope.business==="property"?["property_rent_payments","property_expenses"]:["content_sales"];
 const unallocated=financialResources.flatMap(resource=>{const missing=(r[resource]||[]).filter(row=>!row.voided_at&&!(resource==="farm_fund_transfers"?funds.has(row.id):tracked.has(`${resource}:${row.id}`)));return Array.from(new Set(missing.map(row=>String(row.currency||"NGN")))).map(currency=>{const rows=missing.filter(row=>String(row.currency||"NGN")===currency);return {resource,currency,count:rows.length,recorded_amount:sumMoney(rows.map(row=>String(row.amount_exact??row.cost_exact??row.total_amount_exact??row.amount??row.cost??row.total_amount)))};});});
 const records=Object.fromEntries(Object.entries(r).map(([name,list])=>[name,list.map(row=>{const visible={...row};delete visible._source_json;return visible;})]));
 return {...snapshot,records,farm,property,content,unallocated};
}
export async function getManagerReport(scope:ManagerScope,dates:{from?:string;to?:string}={}){return summarizeManagerSnapshot(await getManagerSnapshot(scope,dates));}
export type ManagerReportData=Awaited<ReturnType<typeof getManagerReport>>;
