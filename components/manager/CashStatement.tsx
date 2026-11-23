"use client";

import {useCallback,useEffect,useState} from "react";
import {useAuth} from "@/contexts/AuthContext";
import {useManagerFetch} from "@/contexts/ManagerPeriodContext";
import type {CashStatementData,StatementMovement} from "@/lib/cash-statement";
import {farmDateToday} from "@/lib/farm-products";
import type {Business} from "@/lib/manager-period-types";
import {formatExactCurrency} from "@/lib/money";

const control="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const dayFormat=new Intl.DateTimeFormat("en-NG",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const dayLabel=(date:string)=>dayFormat.format(new Date(date+"T00:00:00Z"));
const bucketLabel=(bucket:"owner"|"sales")=>bucket==="owner"?"Owner funds":"Sales money";
const money=(amount:string,currency:string)=>formatExactCurrency(amount,currency);

function movementLabel(row:StatementMovement){
  if(row.phase==="reversal")return "Reversed entry";
  if(row.operation==="correct")return "Corrected entry";
  switch(row.kind){
    case "fund":return "Owner transfer";
    case "receive":return "Receipt confirmed";
    case "handoff":return "Money handed over";
    case "inflow":return "Payment received";
    case "spend":return row.resource==="farm_customer_refunds"?"Customer refund":"Payment out";
    case "legacy_assignment":return "Earlier funds assigned";
    default:return "Cash movement";
  }
}

const dispatchLabels={
  awaiting:"Awaiting receipt",partial:"Partly received",received:"Received",cancelled:"Cancelled",
};

type Props={business:Business;initialFrom?:string;initialTo?:string;periodId?:string|null;namedHolders?:boolean};
export function CashStatement({business,initialFrom,initialTo,periodId,namedHolders=false}:Props){
  const send=useManagerFetch();
  const actorId=useAuth().profile?.id;
  const end=initialTo||farmDateToday();
  const beginning=initialFrom&&initialFrom!=="0001-01-01"&&initialFrom<=end?initialFrom:end.slice(0,7)+"-01";
  const [draft,setDraft]=useState({from:beginning,to:end});
  const [range,setRange]=useState(draft);
  const [account,setAccount]=useState("");
  const [view,setView]=useState<"entries"|"transfers">("entries");
  const [page,setPage]=useState(0);
  const [version,setVersion]=useState(0);
  const refresh=useCallback(()=>setVersion(value=>value+1),[]);
  const [snapshot,setSnapshot]=useState<{actorId?:string;data:CashStatementData}|null>(null);
  const data=snapshot?.actorId===actorId?snapshot?.data:null;
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const showEntries=view==="entries";
  const count=data?(showEntries?data.total:data.dispatch_total):0;

  useEffect(()=>{
    window.addEventListener("operations-cash-updated",refresh);
    window.addEventListener("focus",refresh);
    return ()=>{
      window.removeEventListener("operations-cash-updated",refresh);
      window.removeEventListener("focus",refresh);
    };
  },[refresh]);

  useEffect(()=>{
    const controller=new AbortController();
    const query=new URLSearchParams({business,...range,page:String(page),limit:"15"});
    if(periodId)query.set("period_id",periodId);
    if(account)query.set("account_id",account);
    setLoading(true);
    setError("");
    send("/api/operations/funds/statement?"+query,{signal:controller.signal}).then(async response=>{
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"Could not load the funds statement.");
      if(![body.accounts,body.balances,body.movements,body.dispatches].every(Array.isArray))throw Error("Could not load the funds statement.");
      if(controller.signal.aborted)return;
      setSnapshot({actorId,data:body});
      const rowCount=showEntries?body.total:body.dispatch_total;
      if(page>0 && page*body.limit>=rowCount)setPage(Math.max(0,Math.ceil(rowCount/body.limit)-1));
    }).catch(e=>{
      if(!controller.signal.aborted)setError(e.message||"Could not load the funds statement.");
    }).finally(()=>{
      if(!controller.signal.aborted)setLoading(false);
    });
    return ()=>controller.abort();
  },[send,actorId,business,range,page,periodId,account,version,showEntries]);

  function selectView(next:"entries"|"transfers"){
    setView(next);
    setPage(0);
  }

  return <section id={namedHolders?"recipient-statement":undefined} tabIndex={namedHolders?-1:undefined} className="scroll-mt-24 space-y-4 rounded-xl border bg-white p-4 md:p-5" aria-busy={loading}>
    <div>
      <h2 className="text-lg font-semibold">{namedHolders?"Funds by recipient":"Funds statement"}</h2>
      <p className="mt-1 text-sm text-slate-600">{namedHolders
        ?"Choose a holder to see their balance. See supervisor transfers and receipt status separately."
        :"See what you received, what you paid out, and what was left."}</p>
    </div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event=>{
      event.preventDefault();
      if(draft.from>draft.to)return;
      setLoading(true);
      setPage(0);
      setRange({...draft});
    }}>
      <label className="min-w-0 text-sm font-medium">From
        <input aria-label="Statement from" className={control+" mt-1 block min-w-0"} type="date" required max={draft.to} value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})}/>
      </label>
      <label className="min-w-0 text-sm font-medium">To
        <input aria-label="Statement to" className={control+" mt-1 block min-w-0"} type="date" required min={draft.from} value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})}/>
      </label>
      <button type="submit" className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Show statement</button>
    </form>
    {namedHolders&&data?.accounts.length? <label className="block text-sm font-medium">Money holder
      <select value={account} className={control+" mt-1 block w-full sm:w-auto"} onChange={event=>{setLoading(true);setAccount(event.target.value);setPage(0);}}>
        <option value="">{showEntries?"Choose a holder":"All recipients"}</option>
        {data.accounts.map(row=><option key={row.id} value={row.id}>{row.name} · {bucketLabel(row.bucket)} · {row.currency}</option>)}
      </select>
    </label>:null}
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={showEntries} className={control+(showEntries?" border-emerald-800 bg-emerald-50 font-semibold":"")} onClick={()=>selectView("entries")}>Money in and out</button>
      <button type="button" aria-pressed={!showEntries} className={control+(!showEntries?" border-emerald-800 bg-emerald-50 font-semibold":"")} onClick={()=>selectView("transfers")}>Supervisor transfers</button>
    </div>
    {loading?<p role="status" className="text-sm text-slate-600">Loading statement…</p>:error?
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error} <button type="button" className="min-h-11 px-2 underline" onClick={refresh}>Retry</button></p>:data&&<>
      <p className="text-sm text-slate-600">{dayLabel(data.from)} to {dayLabel(data.to)}</p>
      {showEntries&&(!namedHolders||account)&&<>
        {data.balances.length>0&&<div className="grid gap-3 md:grid-cols-2">
          {data.balances.map(row=><article key={row.id} className="rounded-lg border bg-slate-50 p-3">
            <h3 className="text-sm font-semibold">{bucketLabel(row.bucket)}{namedHolders?" · "+row.name:""}</h3>
            <dl className="mt-2 space-y-1 text-sm tabular-nums">
              <div className="flex justify-between gap-3"><dt>Opening balance</dt><dd>{money(row.opening,row.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Money in</dt><dd>+ {money(row.money_in,row.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Money out</dt><dd>− {money(row.money_out,row.currency)}</dd></div>
              <div className="flex justify-between gap-3 border-t pt-1 font-semibold"><dt>Closing balance</dt><dd>{money(row.closing,row.currency)}</dd></div>
            </dl>
          </article>)}
        </div>}
        {data.movements.length===0?<p className="text-sm text-slate-600">No confirmed money in or out for these dates.</p>:
          <ol className="divide-y rounded-lg border px-3">
            {data.movements.map(row=><li key={row.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="font-semibold">{movementLabel(row)} · {bucketLabel(row.bucket)}</p>
                <p className="text-slate-600">{dayLabel(row.date)}</p>
                <p className="break-words text-slate-700">From {row.sender} to {row.recipient}</p>
              </div>
              <div className="tabular-nums sm:text-right">
                <p className="font-semibold">{row.amount.startsWith("-")?"− ":"+ "}{money(row.amount.replace(/^-/,""),row.currency)}</p>
                <p className="text-slate-600">Balance {money(row.balance,row.currency)}</p>
              </div>
            </li>)}
          </ol>}
      </>}
      {showEntries&&namedHolders&&!account&&data.accounts.length===0&&<p className="text-sm text-slate-600">There are no named money holders in this selection.</p>}
      {!showEntries&&<>
        {data.dispatches.length===0?<p className="text-sm text-slate-600">No transfers to show for these dates.</p>:
          <ol className="divide-y rounded-lg border px-3">
            {data.dispatches.map(row=><li key={row.id} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="break-words font-semibold">From {row.sender} to {row.recipient}</p>
                  <p className="text-slate-600">{dayLabel(row.date)} · {bucketLabel(row.bucket)}</p></div>
                <p className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{dispatchLabels[row.status]}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 tabular-nums sm:grid-cols-3">
                <div><dt className="text-slate-600">Sent</dt><dd>{money(row.sent,row.currency)}</dd></div>
                <div><dt className="text-slate-600">Confirmed</dt><dd>{money(row.received,row.currency)}</dd></div>
                <div><dt className="text-slate-600">Still awaiting</dt><dd>{money(row.outstanding,row.currency)}</dd></div>
              </dl>
            </li>)}
          </ol>}
        <p className="text-sm text-slate-600">Only confirmed receipts enter the recipient’s balance.{namedHolders?" Earlier transfers without a recorded recipient stay in the farm ledger.":""}</p>
      </>}
      {(!showEntries||!namedHolders||account)&&count>data.limit&&<nav aria-label="Statement pages" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className={control+" disabled:opacity-50"} disabled={page===0} onClick={()=>{setLoading(true);setPage(page-1);}}>Previous</button>
        <span>Page {page+1} of {Math.ceil(count/data.limit)}</span>
        <button type="button" className={control+" disabled:opacity-50"} disabled={(page+1)*data.limit>=count} onClick={()=>{setLoading(true);setPage(page+1);}}>Next</button>
      </nav>}
    </>}
  </section>;
}
