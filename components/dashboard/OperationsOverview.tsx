"use client";
import Link from "next/link";
import {useOperationsFeature} from "@/contexts/ManagerPeriodContext";
import {useCallback,useEffect,useRef,useState,type ReactNode} from "react";
import {RefreshCw} from "lucide-react";
import {DashboardHeader} from "./DashboardHeader";
import {BusinessFinancialCharts,FinancialPeriodForm,businessMoney} from "./BusinessFinancialCharts";
import {farmDateToday} from "@/lib/farm-products";
import type {getCeoOverview} from "@/lib/ceo-overview";

type Overview=Awaited<ReturnType<typeof getCeoOverview>>;
const panel="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 min-w-0";
function Metric({label,value}:{label:string;value:ReactNode}) {
 return <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 break-words text-2xl font-bold text-slate-900">{value}</p></div>;
}
function Counts({title,rows}:{title:string;rows:{name:string;value:number}[]}) {
 return <section className={panel}><h2 className="font-semibold">{title}</h2>{rows.length?<dl className="mt-4 divide-y text-sm">{rows.map(row=><div key={row.name} className="flex justify-between gap-4 py-3"><dt className="break-words capitalize">{row.name.replaceAll("_"," ")}</dt><dd className="font-semibold">{row.value.toLocaleString()}</dd></div>)}</dl>:<p className="mt-3 text-sm text-slate-500">No records in this reporting period.</p>}</section>;
}

export function OperationsOverview({business}:{business:"properties"|"content"}) {
 const {enabled}=useOperationsFeature();
 const today=farmDateToday(),[period,setPeriod]=useState({from:today.slice(0,8)+"01",to:today});
 const [data,setData]=useState<Overview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const request=useRef<AbortController|null>(null);
 const load=useCallback(async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;
  const params=new URLSearchParams(window.location.search),from=params.get("from")??farmDateToday().slice(0,8)+"01",to=params.get("to")||farmDateToday();
  setPeriod({from,to});setLoading(true);setError("");
  try {
   const response=await fetch(`/api/ceo/overview?${new URLSearchParams({from:from||"0001-01-01",to})}`,{signal:controller.signal,cache:"no-store"});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Business reports are unavailable.");
   if(result[business].error)throw Error(result[business].error);
   if(!controller.signal.aborted)setData(result);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Business reports are unavailable.");}
  finally{if(!controller.signal.aborted)setLoading(false);}
 },[business]);
 useEffect(()=>{void load();return()=>request.current?.abort();},[load]);
 const property=data?.properties.data,content=data?.content.data;
 return <>
  <DashboardHeader title={business==="properties"?"Properties Overview":"Content Overview"} subtitle="CEO reports from saved operational records" actions={<button onClick={()=>void load()} disabled={loading} aria-label="Refresh business reports" className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button>}/>
  <div className="mx-auto w-full max-w-7xl space-y-6 p-4 text-slate-800 lg:p-8">
   {enabled===true&&<Link href={`/dashboard/funds?business=${business==="properties"?"property":"content"}`} className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold">View funds, individual managers and approvals</Link>}<FinancialPeriodForm {...period} note={business==="properties"?"Occupancy and open work are current snapshots.":"Audience figures are the latest recorded account snapshots as at the end date."}/>
   <p className="text-sm text-slate-600">{business==="properties"?"Rent, expenses, occupancy and work reports from Property Manager.":"Publication, audience, leads and sales reports from Content Manager."} Refresh to load the latest saved records.</p>
   {loading?<p role="status" className={panel}>Loading business reports…</p>:error?<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button className="min-h-11 px-3 underline" onClick={()=>void load()}>Retry</button></div>:<>
    {business==="properties"&&property&&<>
     <section className={panel}><h2 className="mb-5 font-semibold">Current portfolio</h2><div className="grid grid-cols-2 gap-5 xl:grid-cols-4"><Metric label="Active properties" value={property.properties}/><Metric label="Total units" value={property.units}/><Metric label="Occupied units" value={property.occupied}/><Metric label="Vacant units" value={property.vacancies}/></div><p className="mt-5 text-xs text-slate-500">Current occupancy: {property.occupancy_rate==null?"Unavailable":`${property.occupancy_rate.toFixed(1)}%`}. All recorded units, including unavailable units, form the denominator. Historical occupancy and overdue rent require authoritative schedules.</p></section>
     <section className={panel}><h2 className="mb-5 font-semibold">Maintenance and repairs</h2><div className="grid grid-cols-2 gap-5"><Metric label="Open maintenance" value={property.openMaintenance}/><Metric label="Open repairs" value={property.openRepairs}/></div><p className="mt-4 text-xs text-slate-500">Work estimates are separate from expenses actually recorded.</p></section>
     {!property.finances.length?<p className={panel}>No rent payments or expenses are recorded in this reporting period.</p>:property.finances.map(finance=><section key={finance.currency} className={panel} aria-label={`Property finances in ${finance.currency}`}><h2 className="mb-5 font-semibold">Recorded property cash flow · {finance.currency}</h2><div className="grid gap-5 sm:grid-cols-3"><Metric label="Rent received" value={businessMoney(finance.rent,finance.currency)}/><Metric label="Recorded expenses" value={businessMoney(finance.expenses,finance.currency)}/><Metric label="Recorded net cash" value={businessMoney(finance.net,finance.currency)}/></div></section>)}
     {(property.analytics??[]).map(analytics=><section className={panel} key={analytics.currency}><BusinessFinancialCharts title="Property rent and expense reports" data={analytics}/></section>)}
    </>}
    {business==="content"&&content&&<>
     <section className={panel}><h2 className="mb-5 font-semibold">Content activity in period</h2><div className="grid grid-cols-2 gap-5"><Metric label="Content published" value={content.published}/><Metric label="Content leads" value={content.leads}/></div></section>
     <section className={panel}><h2 className="font-semibold">Audience observations</h2>{!content.accounts.length?<p className="mt-3 text-sm text-slate-500">No account snapshots have been recorded.</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2">{content.accounts.map(account=>{const growth=content.audience_growth?.find(row=>row.platform===account.platform&&row.account_id===account.account_id);return <article key={`${account.platform}:${account.account_id??""}`} className="min-w-0 rounded-xl border p-4"><h3 className="break-words font-semibold capitalize">{String(account.platform)}{account.account_id?` · ${String(account.account_id)}`:""}</h3><div className="mt-4 grid grid-cols-2 gap-4"><Metric label="Followers" value={account.followers==null?"Unavailable":Number(account.followers).toLocaleString()}/><Metric label="Reach" value={account.reach==null?"Unavailable":Number(account.reach).toLocaleString()}/></div><p className="mt-4 text-xs text-slate-500">Snapshot: {String(account.metric_date)} · {String(account.source??"Unknown source")}</p><p className="mt-2 text-xs text-slate-500">{growth?.change==null?"Growth unavailable: a comparable starting observation is required.":`Follower change in period: ${growth.change>0?"+":""}${growth.change.toLocaleString()}`}</p></article>})}</div>}<p className="mt-4 text-xs text-slate-500">Followers and reach are account observations, not sums across posts or dates. Official social connection setup remains independent of these saved reports.</p></section>
     {!content.sales.length?<p className={panel}>No mentorship or affiliate sales are recorded in this reporting period.</p>:content.sales.map(sales=><section key={sales.currency} className={panel}><h2 className="mb-5 font-semibold">Recorded content sales · {sales.currency}</h2><div className="grid grid-cols-2 gap-5"><Metric label="Mentorship sales" value={businessMoney(sales.mentorship,sales.currency)}/><Metric label="Affiliate sales" value={businessMoney(sales.affiliate,sales.currency)}/></div><p className="mt-4 text-xs text-slate-500">Currencies remain separate. Recorded sales do not establish full business profit.</p></section>)}
     <Counts title="Current status of leads recorded in period" rows={content.leads_by_status??[]}/>
     <section className={panel}><h2 className="font-semibold">Sales attribution in period</h2>{!content.sales_by_content?.length?<p className="mt-3 text-sm text-slate-500">No sales attribution recorded in this period.</p>:<dl className="mt-4 divide-y text-sm">{content.sales_by_content.map(row=><div className="flex flex-wrap justify-between gap-3 py-3" key={row.name}><dt className="break-words">{row.name}</dt><dd className="font-semibold">{row.value.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}</dd></div>)}</dl>}</section>
     {(content.analytics??[]).map(analytics=><section className={panel} key={analytics.currency}><BusinessFinancialCharts title="Content sales reports" data={analytics} incomeOnly/></section>)}
    </>}
   </>}
  </div>
 </>;
}
