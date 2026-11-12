import Link from 'next/link';
import type { ReactNode } from 'react';
import type { FarmOverview } from '@/lib/farm-overview';
import type { FarmAlert } from '@/lib/farm-summary';
import { formatExactCurrency } from '@/lib/money';
import { farmProductLabel } from '@/lib/farm-products';
import { areaTitle, reportArea } from '@/lib/farm-report-areas';

const card = 'min-w-0 rounded-xl border border-[#d5ded3] bg-white p-4 sm:p-5';
const heading = 'text-lg font-bold tracking-tight text-[#192d22]';
const action = 'inline-flex min-h-11 items-center text-sm font-semibold text-[#24583f] underline-offset-4 hover:underline';
const count = (value: number) => value.toLocaleString('en-NG', {maximumFractionDigits: 8});
const money = (value: string | number) => formatExactCurrency(value, 'NGN').replace('NGN ', '₦').replace(/\.00$/, '');
export const overviewDate = (date: string) => {
  const day = new Date(date+'T12:00:00Z');
  return Number.isFinite(day.getTime()) ? new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(day) : 'Choose a date';
};

export function FarmOverviewPanels({data, alerts, link, supervisor=false}: {
  data: FarmOverview; alerts: FarmAlert[]; link: (path: string) => string; supervisor?: boolean;
}) {
  const animals = data.produce.filter(p => ['birds','fish','animals'].includes(p.unit));
  const animalUnit = animals.length && animals.every(a => a.unit === animals[0].unit) ? animals[0].unit : 'animals';
  const counted = data.feed.filter(f => f.amount != null);
  const missing = data.feed.length - counted.length;
  const tiles = [
    {label:'Farm produce', value:animals.length?count(animals.reduce((n,p)=>n+Number(p.amount),0))+' '+animalUnit:String(data.produce.length), note:animals.length?animals.map(a=>a.label+' '+count(a.amount!)).join(' · '):'Produce types recorded', href:link('stores?view=animals')},
    {label:'Feed in store', value:counted.length?count(counted.reduce((n,f)=>n+Number(f.amount),0)):missing?'Count needed':data.feedTypesComplete?'No feed recorded':'Unavailable', note:counted.length?(missing?'Bags counted · '+missing+(missing===1?' type needs':' types need')+' a count':'Unopened bags'):'Unopened bags', href:'#feed-quantities'},
    {label:'Mortality', value:count(data.mortality.total), note:'Recorded deaths in period', href:link(supervisor?'mortality':'inventory?tab=mortality')},
    {label:'Sales', value:money(data.sales), note:money(data.collected)+' received', href:link('sales')},
    {label:'Customer debt', value:money(data.debt), note:'Outstanding on '+overviewDate(data.to), href:link('credit')},
    {label:'Requests / purchases', value:count(data.requestCount+data.purchaseCount), note:data.requestCount+' requests · '+data.purchaseCount+' purchases awaiting a decision'+(data.purchaseCount?' · '+money(data.purchaseAmount):''), href:'#overview-attention'},
  ];
  const todayRows = [...data.dailyReports.map(r=>{
    const area=reportArea(r.area);
    return {id:r.id,title:area?areaTitle(area):'Daily report',status:r.status,detail:r.detail,path:'daily-reports?report_id='+r.id};
  }),...data.logs];
  return <section className="min-w-0 space-y-4 text-[#203328]" aria-label="Farm at a glance">
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#cfdacd] bg-[#d9e2d8] sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map(t=><a key={t.label} href={t.href} className="min-w-0 bg-white px-3.5 py-4 hover:bg-[#f4f8f2] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700">
        <span className="block text-sm font-semibold text-[#526355]">{t.label}</span>
        <strong className="my-1.5 block break-words text-2xl font-bold leading-tight tracking-tight tabular-nums [overflow-wrap:anywhere]">{t.value}</strong>
        <span className="block text-xs leading-5 text-[#455749]">{t.note}</span>
      </a>)}
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section id="overview-attention" className={card+' scroll-mt-28'}>
        <div className="flex items-center justify-between gap-2"><h3 className={heading}>Needs your attention</h3><span className="text-sm text-slate-600">{alerts.length} {alerts.length===1?'item':'items'}</span></div>
        {alerts.length?<PreviewRows rows={alerts} render={a=><Link href={link(a.href)} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border-l-4 border-l-amber-600 bg-[#f1f4ee] px-3 py-2 hover:bg-[#e7eee4]">
          <span className="min-w-0"><strong className="block break-words text-sm">{a.title}</strong><span className="block break-words text-sm text-[#455749]">{a.detail}</span></span><span className="shrink-0 text-sm font-semibold text-emerald-900">Open</span>
        </Link>}/>:<p className="mt-3 text-sm text-[#455749]">Nothing needs attention in this view.</p>}
        <div className="mt-2 flex flex-wrap gap-x-4"><Link href={link('operational-requests')} className={action}>View requests</Link><Link href={link('purchases')} className={action}>View purchases</Link></div>
      </section>
      <section className={card}>
        <div className="flex items-center justify-between gap-2"><h3 className={heading}>Today’s records</h3><Link className={action} href={link('today?date='+data.today)}>All logs</Link></div>
        <p className="text-xs text-[#526355]">{overviewDate(data.today)} · Nigeria</p>
        {todayRows.length?<PreviewRows rows={todayRows} render={r=><Link className="flex min-h-12 items-center justify-between gap-3 border-b border-[#dde4d9] py-2 hover:underline" href={link(r.path)}><span className="min-w-0 break-words text-sm"><strong>{r.title}</strong>{r.detail&&<span className="block text-[#455749]">{r.detail}</span>}</span><span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold '+(r.status==='Due today'?'bg-amber-100 text-amber-950':'bg-[#e0eee1] text-[#24583f]')}>{r.status}</span></Link>}/>:data.todayReportsAvailable?<p className="mt-3 text-sm text-[#455749]">No logs submitted today.</p>:null}
        {!data.todayReportsAvailable&&<Link className={action} href={link('daily-reports')}>Daily report list unavailable here. Open reports</Link>}
      </section>
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section id="produce-quantities" className={card+' scroll-mt-28'}>
        <div className="flex items-center justify-between gap-2"><h3 className={heading}>Produce on hand</h3><Link className={action} href={link('stores?view=animals')}>{supervisor?'Record animal count':'Review or correct counts'}</Link></div>
        <QuantityList rows={data.produce} empty="No produce inventory recorded in this view."/>
        {data.mortality.products.length>0&&<p className="mt-3 border-t pt-3 text-sm text-[#455749]"><strong>Mortality in period</strong> · {data.mortality.products.map(m=>farmProductLabel(m.product)+' '+count(m.quantity)).join(' · ')}</p>}
      </section>
      <section id="feed-quantities" className={card+' scroll-mt-28'}>
        <div className="flex items-center justify-between gap-2"><h3 className={heading}>Feed by type</h3><Link className={action} href={link('feed-stock')}>Feed inventory</Link></div>
        <QuantityList rows={data.feed} empty={data.feedTypesComplete?'No feed inventory recorded in this view.':'Feed history unavailable.'}/>
        {!data.feedTypesComplete&&data.feed.length>0&&<p className="mt-2 text-sm text-amber-900">Some feed types could not be loaded. Open feed inventory to check.</p>}
      </section>
    </div>
    <aside className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d5ded3] px-4 py-2 text-sm"><strong>Offers</strong><span className="text-[#455749]">Details to follow</span></aside>
  </section>;
}

function PreviewRows<T extends {id:string}>({rows,render}:{rows:T[];render:(row:T)=>ReactNode}) {
  const list=(entries:T[])=><ul className="mt-2 space-y-1.5">{entries.map(row=><li key={row.id}>{render(row)}</li>)}</ul>;
  return <>{list(rows.slice(0,4))}{rows.length>4&&<details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-emerald-900">Show {rows.length-4} more</summary>{list(rows.slice(4))}</details>}</>;
}

function QuantityList({rows,empty}:{rows:FarmOverview['produce'];empty:string}) {
  return rows.length?<dl className="mt-2 divide-y divide-[#dde4d9]">{rows.map(row=><div key={row.label} className="flex min-h-10 flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm"><dt className="break-words capitalize">{row.label}</dt><dd className="font-bold tabular-nums">{row.amount===null?'Count needed':count(row.amount)+' '+row.unit}{'usableKg' in row&&row.usableKg!=null&&<small className="ml-2 font-normal">({String(row.usableKg)} kg estimated usable)</small>}</dd></div>)}</dl>:<p className="mt-3 text-sm text-[#455749]">{empty}</p>;
}
