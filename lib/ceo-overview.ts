import { createServerClient } from "@/lib/supabase/server";
import { getFarmFinance } from "@/lib/farm-finance";
import { activeMortality } from "@/lib/farm-inventory";
import { summarizeContent, summarizeProperties, type OverviewRow, type OverviewScope } from "@/lib/ceo-calculations";
import type { FarmInventoryTransaction } from "@/types";

export async function getCeoOverview(scope: OverviewScope) {
 const db=createServerClient(); if(!db) throw new Error("Database not configured");
 async function all(table:string):Promise<OverviewRow[]> {
  const rows:OverviewRow[]=[];
  for(let offset=0;;offset+=500) {
   const {data,error}=await db!.from(table).select("*").order("id").range(offset,offset+499);
   if(error) throw error;
   rows.push(...(data??[]));if(!data||data.length<500)return rows;
  }
 }
 // A failed business query is unavailable, never a fabricated zero. Independent sections still load.
 async function section<T>(read:()=>Promise<T>):Promise<{data:T;error:null}|{data:null;error:string}> {
  try{return {data:await read(),error:null};}catch{return {data:null,error:"Data could not be loaded. Retry or check database migration/configuration."};}
 }
 const [content,properties,farm,operations,crm]=await Promise.all([
  section(async()=>{const [records,performance,leads,sales]=await Promise.all([all("content_records"),all("content_performance"),all("content_leads"),all("content_sales")]);return summarizeContent({records,performance,leads,sales},scope);}),
  section(async()=>{const [properties,units,rent,expenses,maintenance]=await Promise.all([all("property_properties"),all("property_units"),all("property_rent_payments"),all("property_expenses"),all("property_maintenance")]);return summarizeProperties({properties,units,rent,expenses,maintenance},scope);}),
  section(async()=>{
   const [finance,inventory,supplies,movements,sales]=await Promise.all([getFarmFinance({date:scope.to,...scope}),all("farm_inventory"),all("farm_supply_inventory"),all("farm_inventory_transactions"),all("farm_sales")]);
   const mortality=activeMortality(movements as unknown as FarmInventoryTransaction[]).filter(r=>r.date>=scope.from&&r.date<=scope.to);
   const mortalityByProduct=Object.entries(mortality.reduce<Record<string,number>>((total,row)=>{total[row.product]=(total[row.product]??0)+Number(row.quantity);return total;},{})).map(([product,quantity])=>({product,quantity}));
   return {finance,inventory,fish:inventory.filter(r=>r.product==="catfish"),livestock:inventory.filter(r=>["goat","ram","cattle","pig","chicken","turkey"].includes(String(r.product))),feed:supplies.filter(r=>r.category==="feed"&&!r.archived_at),mortality:mortalityByProduct,salesCount:sales.filter(r=>!r.voided_at&&String(r.date)>=scope.from&&String(r.date)<=scope.to).length,productionCost:{available:false,reason:"Production cost allocation has not been defined. Operational expenses are shown separately."}};
  }),
  section(async()=>{
   const [reports,requests]=await Promise.all([all("farm_daily_reports"),all("farm_operational_requests")]);
   return {pending:requests.filter(r=>r.status==="pending"||r.status==="approved").sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),recentReports:reports.filter(r=>r.status==="submitted").sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0,5)};
  }),
  section(async()=>{
   const [leads,posts,appointments,dbaSales]=await Promise.all([all("leads"),all("blog_posts"),all("appointments"),all("dba_sales")]);
   const within=(date:unknown)=>typeof date==="string"&&date.slice(0,10)>=scope.from&&date.slice(0,10)<=scope.to;
   return {leads:leads.filter(r=>within(r.created_at)).length,publishedPosts:posts.filter(r=>r.status==="published").length,pendingAppointments:appointments.filter(r=>r.status==="pending").length,dbaSalesCount:dbaSales.filter(r=>within(r.created_at)).length,recentLeads:[...leads].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5),leadsByStatus:Object.entries(leads.filter(r=>within(r.created_at)).reduce<Record<string,number>>((acc,row)=>{const key=String(row.status);acc[key]=(acc[key]??0)+1;return acc;},{})).map(([name,count])=>({name,count}))};
  })
 ]);
 return {scope,generatedAt:new Date().toISOString(),content,properties,farm,operations,crm};
}
