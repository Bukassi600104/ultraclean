'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { FarmControlData } from '@/lib/farm-control';
import { farmDateToday } from '@/lib/farm-products';
import { formatExactCurrency, sumMoney } from '@/lib/money';
import { displayConversion } from '@/lib/farm-summary';
import { FarmOverviewPanels, overviewDate } from '@/components/manager/FarmOverviewPanels';
import { BusinessFinancialCharts } from '../BusinessFinancialCharts';
import { useFarmRecordRefresh } from '@/hooks/useFarmRecordRefresh';

const field = 'min-h-11 w-full rounded-lg border border-[#cbd7c9] bg-white px-3 py-2 text-sm';
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-[#bdcdbd] bg-white px-4 py-2 text-sm font-semibold text-[#24583f] hover:bg-[#f2f6f0] disabled:opacity-50';
const card = 'rounded-xl border border-[#d5ded3] bg-white p-4 sm:p-5';
const pages = [['batches','Sites and named batches'],['today','Batch daily logs'],['daily-reports','Daily reports'],['purchases','Purchases and deliveries'],['stores','Stores and counts'],['credit','Customers and payments'],['health','Health tasks'],['performance','Batch performance'],['inventory','Livestock inventory'],['sales','Sales records'],['expenses','Expense records'],['feed-stock','Feed inventory'],['supplies','Supplies'],['operational-requests','Requests']] as const;

export function FarmControl({compact=false,range,name}:{compact?:boolean;range?:{from:string;to:string};name?:string|null}) {
  const today=farmDateToday(),[from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[period,setPeriod]=useState('');
  const [result,setResult]=useState<{query:string;data:FarmControlData}|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const revision=useFarmRecordRefresh();
  const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(''),[periods,setPeriods]=useState<FarmControlData['report']['periods']>([]);
  useEffect(()=>{
    if(compact)return;
    if(window.location.hash==='#corrections'){window.location.replace('/dashboard/farm/history'+window.location.search+'#corrections');return;}
    const q=new URLSearchParams(window.location.search);
    if(/^\d{4}-\d{2}-\d{2}$/.test(q.get('from')||''))setFrom(q.get('from')!);
    if(/^\d{4}-\d{2}-\d{2}$/.test(q.get('to')||''))setTo(q.get('to')!);
    if(q.get('period_id'))setPeriod(q.get('period_id')!);
  },[compact]);
  function filter(key:string,value:string){
    const q=new URLSearchParams(window.location.search);
    if(value)q.set(key,value);else q.delete(key);
    window.history.replaceState(window.history.state,'',window.location.pathname+'?'+q);
    window.dispatchEvent(new Event('dashboard-report-filters'));
  }
  const query=new URLSearchParams({from:range?.from||from,to:range?.to||to,...(period?{period_id:period}:{})}).toString();
  const data=result?.query===query?result.data:null;
  useEffect(()=>{
    const controller=new AbortController();setError('');
    fetch('/api/farm/control?'+query,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
      .then(async r=>{const d=await r.json();if(!r.ok||!d.overview)throw Error(d.error||'Farm overview unavailable');if(!controller.signal.aborted){setResult({query,data:d});setPeriods(old=>Array.from(new Map([...old,...d.report.periods].map(p=>[p.id,p])).values()));}})
      .catch(()=>{if(!controller.signal.aborted)setError('Farm figures could not be loaded. Check your connection and try again.');});
    return()=>controller.abort();
  },[query,version,revision]);
  useEffect(()=>{setCopied(false);setCopyError('');},[query]);
  const actorId=data?.report.scope.actorId;
  useEffect(()=>{
    if(compact||!actorId)return;
    try{const saved=sessionStorage.getItem('farm-control-scroll:'+actorId+':'+query);if(saved!==null){const top=Number(saved);if(Number.isFinite(top)&&top>=0)requestAnimationFrame(()=>document.querySelector('main')?.scrollTo({top}));}}catch{}
  },[compact,actorId,query]);
  function reportLink(href:string) {
    const url=new URL(href.startsWith('/')?href:'/dashboard/farm/'+href,'https://farm.local');
    url.searchParams.set('from',range?.from||from);url.searchParams.set('to',range?.to||to);
    if(period)url.searchParams.set('period_id',period);
    if(url.pathname==='/dashboard/funds'){
      url.searchParams.set('business','farm');
      if(data?.report.scope.managerId)url.searchParams.set('manager_id',data.report.scope.managerId);
    }
    return url.pathname+url.search+url.hash;
  }
  const finance=data?.report.farm,money=(value:string|number)=>formatExactCurrency(value,'NGN');
  const funds=data?sumMoney(data.report.cash.accounts.filter(a=>a.currency==='NGN'&&a.holder_type!=='awaiting').map(a=>a.closing)):'0';
  const financials=data&&finance?[['Sales after credits',money(finance.revenue)],['Actual collections',money(finance.collections)],['Paid operating expenses',money(finance.total_expenses)],['Customer debt',money(data.credit.summary.owed)],['Tracked money held',money(funds)]]:[];
  return <section className="min-w-0 space-y-4 text-slate-900" aria-label="Farm control centre" data-farm-report={!compact?'true':undefined} onClickCapture={e=>{
    if(compact||!data||!(e.target instanceof Element)||!e.target.closest('a[href^="/dashboard/"]'))return;
    try{sessionStorage.setItem('farm-control-scroll:'+data.report.scope.actorId+':'+query,String(e.currentTarget.closest('main')?.scrollTop||0));}catch{}
  }}>
    {!compact&&<header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-medium text-[#536856]">{overviewDate(today)} · Primefield Farm</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#172c1d] sm:text-[32px]">{name?'Welcome, '+name.split(' ')[0]:'Farm activity'}</h2></div>
      <button className={button+' print:hidden'} onClick={()=>setVersion(v=>v+1)}>Refresh</button>
    </header>}
    {!compact&&<details className="rounded-lg border border-[#c9d5c6] bg-[#f7f9f5] px-3 print:hidden"><summary className="min-h-11 cursor-pointer content-center py-2 text-sm font-semibold text-[#36563c]">{data?.report.manager?.name||'Whole farm'} · {from&&to?overviewDate(from)+' to '+overviewDate(to):'Choose dates'} · Change filters</summary>
      <div className="grid gap-3 pb-3 sm:grid-cols-3"><label className="text-sm">From<input type="date" className={field} value={from} onChange={e=>{setFrom(e.target.value);filter('from',e.target.value);}}/></label><label className="text-sm">To<input type="date" className={field} value={to} onChange={e=>{setTo(e.target.value);filter('to',e.target.value);}}/></label><label className="text-sm">Manager responsibility<select className={field} value={period} onChange={e=>{setPeriod(e.target.value);filter('period_id',e.target.value);}}><option value="">Whole farm</option>{periods.map(p=><option key={p.id} value={p.id}>{p.manager_name||'Name not recorded'} · {p.starts_on||'Earlier records'} · {p.status==='awaiting_handover'?'Awaiting handover':p.status}</option>)}</select></label></div>
    </details>}
    {error&&<div role="alert" className={card}>{error} {data&&'Showing the last figures loaded.'} <button className={button} onClick={()=>setVersion(v=>v+1)}>Try again</button></div>}
    {!data?!error&&<p role="status">Loading farm records…</p>:finance&&<>
      {compact?<>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">{financials.map(([label,value])=><div key={label} className={card}><p className="text-sm text-slate-600">{label}</p><p className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p></div>)}</div>
        <div className={card}><h3 className="font-bold">Needs attention now</h3>{data.alerts.length?<ul className="divide-y">{data.alerts.slice(0,3).map(a=><li key={a.id}><Link className="block min-h-11 py-2 text-sm text-emerald-950" href={reportLink(a.href)}><strong>{a.title}</strong> · {a.detail}</Link></li>)}</ul>:<p className="mt-2 text-sm">No recorded decisions require attention.</p>}</div>
        <Link className={button} href={'/dashboard/farm/control?'+query}>Open farm reports and controls</Link>
      </>:<>
        <FarmOverviewPanels data={data.overview} alerts={data.alerts} link={reportLink}/>
        <section className={card}><h3 className="text-lg font-bold">Farm finances</h3><dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Paid operating expenses',money(finance.total_expenses)],['Recorded operating result',money(finance.operational_net)],['Tracked money held',money(funds)]].map(([label,value])=><div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="break-words text-xl font-bold tabular-nums">{value}</dd></div>)}</dl><Link href={reportLink('/dashboard/funds')} className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900">Funds and reconciliation</Link>
          <details className="text-sm text-slate-600"><summary className="min-h-11 cursor-pointer content-center font-semibold">How these figures work</summary><p>Sales include invoiced sales and established historical sales. Collections include recorded payments and historical cash sales. Customer debt is the unpaid invoice balance at the end date. Tracked money shows recorded custody. Stock quantities show current inventory.</p></details>
          {data.config?.display_currency&&<p className="mt-2 text-sm">Sales: {displayConversion(String(finance.revenue),data.config,data.today)}</p>}
        </section>
        {data.currentPerformance.batches.length===0&&!period&&<div className={card}><h3 className="font-bold">Farm groups</h3><p className="mt-1 text-sm text-slate-600">Link livestock to its pond, pen or flock to track each group’s production.</p><div className="mt-3 flex flex-wrap gap-2"><Link className={button} href={reportLink('batches')}>Set up farm groups</Link><Link className={button} href="/dashboard/managers">Assign a manager</Link></div></div>}
        <details className={card}><summary className="min-h-11 cursor-pointer content-center text-lg font-bold">Financial charts</summary><BusinessFinancialCharts title="Farm financial activity" data={{currency:'NGN',daily:finance.daily,income_breakdown:finance.sales_by_product,expense_breakdown:finance.expenses_by_category}}/></details>
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 print:hidden" aria-label="Farm sections">{pages.map(([path,label])=><Link key={path} className={button} href={reportLink(path)}>{label}</Link>)}<Link className={button} href="/dashboard/managers">Manage accounts and assignments</Link><Link className={button} href="/dashboard/farm/support">Vet and accountant access</Link><Link className={button} href="/dashboard/farm/configuration">Farm configuration</Link><Link className={button} href={'/dashboard/farm/history?'+new URLSearchParams({from,to})}>Whole-farm history and transfers</Link></nav>
        <section className={card}><h3 className="text-lg font-bold">Summary and exports</h3><details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Read daily summary</summary><pre className="my-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">{data.summary}</pre></details><div className="flex flex-wrap gap-2 print:hidden"><button className={button} onClick={async()=>{setCopyError('');try{await navigator.clipboard.writeText(data.summary);setCopied(true);}catch{setCopyError('Copy unavailable. Open the daily summary and select its text to copy it.');}}}>{copied?'Copied':'Copy for WhatsApp'}</button><a className={button} href={'/api/farm/control/export?'+query}>Download Excel</a><button className={button} onClick={()=>window.print()}>Print / save PDF</button></div><p role="status" className="mt-2 text-sm text-amber-900">{copyError}</p></section>
      </>}
    </>}
  </section>;
}
