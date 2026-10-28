"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type BusinessAnalytics = {
  currency: string | null;
  daily: { date: string; revenue: number; total_expenses: number; operational_net: number }[];
  income_breakdown: { name: string; value: number }[];
  expense_breakdown: { name: string; value: number }[];
};
export function businessMoney(value: number, currency: string | null = "NGN") {
  return currency ? formatCurrency(value, currency) : `${value.toLocaleString("en", {minimumFractionDigits:2,maximumFractionDigits:2})} (currency not recorded)`;
}
export function FinancialPeriodForm({from,to,note="Current stock is a present-day snapshot."}:{from:string;to:string;note?:string}) {
  return <form method="get" className="flex flex-wrap items-end gap-3" key={`${from}:${to}`}>
    <label className="text-xs">From<input aria-label="Financial period start" name="from" type="date" defaultValue={from} className="block border rounded-lg p-2 min-h-11"/></label>
    <label className="text-xs">To<input aria-label="Financial period end" name="to" type="date" defaultValue={to} required className="block border rounded-lg p-2 min-h-11"/></label>
    <button className="border rounded-lg px-4 min-h-11">Apply period</button>
    <p className="text-xs text-slate-500 w-full">{from ? `Reporting period: ${from} to ${to}` : `All recorded history through ${to}`}. {note}</p>
  </form>;
}
export function BusinessFinancialCharts({data,title,incomeOnly=false}:{data:BusinessAnalytics;title:string;incomeOnly?:boolean}) {
  const money=(value:number)=>businessMoney(value,data.currency);
  return <div className="space-y-5 mt-6 border-t pt-5 min-w-0">
    <h3 className="text-sm font-semibold">{title} · {data.currency ?? "currency not recorded"}</h3>
    {!data.daily.length ? <p className="text-sm text-slate-500">No financial entries recorded in this period.</p> : <>
      <div className="h-64 w-full min-w-0" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily} margin={{left:0,right:20,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis width={68} tick={{fontSize:10}}/><Tooltip formatter={(value:number)=>money(value)}/><Line type="linear" dataKey="revenue" name="Recorded income" stroke="#0f766e" dot={false}/>{!incomeOnly&&<><Line type="linear" dataKey="total_expenses" name="Recorded expenses" stroke="#b45309" strokeDasharray="5 3" dot={false}/><Line type="linear" dataKey="operational_net" name="Recorded operating result" stroke="#4338ca" dot={false}/></>}</LineChart></ResponsiveContainer></div>
      <p className="text-xs text-slate-500">Recorded activity by date. Income is teal{!incomeOnly&&", expenses are dashed amber and operating result is indigo"}. Missing entries are not proof of no spending.</p>
      <div className="grid gap-5 lg:grid-cols-2">{[["Income breakdown",data.income_breakdown],["Expense breakdown",incomeOnly?[]:data.expense_breakdown]].map(([name,items])=>{
        const rows=items as {name:string;value:number}[];return rows.length?<section key={String(name)} className="min-w-0"><h4 className="text-sm font-medium mb-2">{String(name)}</h4><div className="h-52" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{left:0,right:10,bottom:10}}><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={68} tick={{fontSize:10}}/><Tooltip formatter={(value:number)=>money(value)}/><Bar dataKey="value" fill={String(name).startsWith("Income")?"#0f766e":"#b45309"}/></BarChart></ResponsiveContainer></div><ul className="text-xs divide-y">{rows.map(row=><li className="flex flex-wrap justify-between gap-2 py-2" key={row.name}><span className="break-words">{row.name.replaceAll("_"," ")}</span><strong>{money(row.value)}</strong></li>)}</ul></section>:null;
      })}</div>
      <details className="text-xs"><summary className="cursor-pointer min-h-11 flex items-center underline">View financial data table</summary><div className="overflow-x-auto"><table className="w-full text-left"><caption className="text-left py-2">{title}; recorded dates only; amounts in {data.currency??"unrecorded currency"}</caption><thead><tr><th className="p-2">Date</th><th className="p-2">Income</th>{!incomeOnly&&<><th className="p-2">Expenses</th><th className="p-2">Operating result</th></>}</tr></thead><tbody>{data.daily.map(row=><tr key={row.date}><td className="p-2">{row.date}</td><td className="p-2">{money(row.revenue)}</td>{!incomeOnly&&<><td className="p-2">{money(row.total_expenses)}</td><td className="p-2">{money(row.operational_net)}</td></>}</tr>)}</tbody></table></div></details>
    </>}
  </div>;
}
