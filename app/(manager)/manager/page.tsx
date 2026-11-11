'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, EyeOff, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerFetch, useManagerPeriod } from '@/contexts/ManagerPeriodContext';
import { PWAInstallPrompt } from '@/components/manager/PWAInstallPrompt';
import { FarmOverviewPanels, overviewDate } from '@/components/manager/FarmOverviewPanels';
import { formatExactCurrency } from '@/lib/money';
import { farmDateToday } from '@/lib/farm-products';
import type { FarmOverview } from '@/lib/farm-overview';
import type { FarmAlert } from '@/lib/farm-summary';
import { useFarmRecordRefresh } from '@/hooks/useFarmRecordRefresh';

const action='inline-flex min-h-11 items-center justify-center rounded-lg border border-[#bdcdbd] bg-white px-4 py-2 text-sm font-semibold text-[#24583f] hover:bg-[#f2f6f0]';
const cash=(value:number)=>formatExactCurrency(value,'NGN').replace('NGN ','₦');

export default function ManagerHomePage() {
  const {profile}=useAuth(), scope=useManagerPeriod(), managerFetch=useManagerFetch(), pathname=usePathname();
  const identity=scope?.actorId+':'+scope?.periodId;
  const [saved,setSaved]=useState<{identity:string;overview:FarmOverview;alerts:FarmAlert[]}|null>(null);
  const [error,setError]=useState(''),[retry,setRetry]=useState(0),[visible,setVisible]=useState(true);
  const revision=useFarmRecordRefresh();
  useEffect(()=>{
    const controller=new AbortController();
    setError('');
    managerFetch('/api/farm/overview',{signal:controller.signal}).then(async response=>{
      const result=await response.json();
      if(!response.ok||!result.overview||!Array.isArray(result.alerts))throw Error();
      if(!controller.signal.aborted)setSaved({identity,...result});
    }).catch(()=>{if(!controller.signal.aborted)setError('Farm figures could not be loaded. Your recording tools are available below.');});
    return()=>controller.abort();
  },[managerFetch,identity,retry,revision]);
  const data=saved?.identity===identity?saved:null;
  function link(path:string) {
    const base=pathname==='/manager'||pathname.startsWith('/manager/')?'/manager':'';
    if(path==='/dashboard/funds')return base+'/cash';
    const target=path.replace(/^\/dashboard\/farm\//,'').replace(/^daily-reports(?=[?#]|$)/,'daily-report/history');
    return base+'/'+target;
  }
  return <div className="mx-auto max-w-7xl space-y-4 rounded-xl bg-[#edf2ea] p-3 text-[#203328] sm:p-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-medium text-[#536856]">{overviewDate(farmDateToday())} · Primefield Farm</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-[32px]">{profile?.name?'Welcome, '+profile.name.split(' ')[0]:'Farm activity'}</h2>
        <p className="mt-1 text-sm text-[#455749]">{data?'Your work · '+overviewDate(data.overview.from)+' to '+overviewDate(data.overview.to):'Your farm records'}</p></div>
      <div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#295e40] px-4 py-2 text-sm font-bold text-white hover:bg-[#204c33]" href={link('expenses')}><Receipt className="h-4 w-4"/>Record Today’s Expenses</Link><Link className={action} href={link('today')}>Open today’s log</Link></div>
    </header>
    {error&&<div role="alert" className="rounded-lg border bg-white p-4">{error} {data&&'Showing the last figures loaded.'} <button className={action} onClick={()=>setRetry(n=>n+1)}>Try again</button></div>}
    {data?<>
      <FarmOverviewPanels data={data.overview} alerts={data.alerts} link={link} supervisor/>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-[#d5ded3] bg-white p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#455749]">Owner funds available</h3><button className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#edf2ea]" aria-label={visible?'Hide balance':'Show balance'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div><p className="break-words text-2xl font-bold tabular-nums">{visible?cash(data.overview.funds):'••••••'}</p></section>
        <section className="rounded-xl border border-[#d5ded3] bg-white p-4"><h3 className="flex min-h-11 items-center text-sm font-semibold text-[#455749]">Expenses this week</h3><p className="break-words text-2xl font-bold tabular-nums">{cash(data.overview.expenses)}</p></section>
      </div>
    </>:!error&&<p role="status">Loading your farm records…</p>}
    <nav aria-label="Farm shortcuts" className="grid grid-cols-1 gap-2 sm:grid-cols-3">{[
      ['sales','Record Today’s Sales'],['supplies','Farm Supplies'],['inventory','View Inventory'],['records','View Past Records'],['cash','Today’s Finances Summary'],['operational-requests','Operational Requests'],
    ].map(([path,label])=><Link className={action} href={link(path)} key={path}>{label}</Link>)}</nav>
    <PWAInstallPrompt/>
  </div>;
}
