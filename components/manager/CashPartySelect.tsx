"use client";
import {formatExactCurrency,subtractMoney} from "@/lib/money";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {useManagerPeriod, useOperationsFeature} from "@/contexts/ManagerPeriodContext";
import {useAuth} from "@/contexts/AuthContext";
import {useOperationsFunds} from "@/hooks/useOperationsFunds";
import {cashReceiver,type CashReceiver} from "@/lib/operations-cash-validation";
import type {Business} from "@/lib/manager-period-types";
import {farmPaymentDestinations, farmPaymentReceiver, farmSupervisorChoice} from "@/lib/farm-payment-receiver";
import {farmDateToday} from "@/lib/farm-products";

type ReceiverProps = {business:Business; value:string; onChange:(value:string)=>void; disabled?:boolean; hidden?:boolean; keepExisting?:boolean; paymentDate?:string};
const selectClass = "mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm";

export function selectedCashReceiver(choice:string):CashReceiver|undefined {
  if (!choice) return undefined;
  const farm = farmPaymentReceiver(choice);
  if (farm) return farm;
  if (choice.startsWith('farm')) throw Error('Choose who received the payment.');
  return cashReceiver.parse(choice==="self"?{type:"self"}:choice.startsWith("manager:")?{type:"manager",period_id:choice.slice(8)}:choice.startsWith("ceo:")?{type:"ceo",profile_id:choice.slice(4)}:{type:"custodian",account_id:choice.slice(10)});
}

export function CashReceiverSelect(props:ReceiverProps) {
 const {enabled}=useOperationsFeature();
 if(enabled!==true)return null;
 if(props.business==='farm')return <FarmReceiverSelect {...props}/>;
 return props.hidden ? null : <OtherReceiverSelect {...props}/>;
}

function FarmReceiverSelect({value, onChange, disabled, hidden, keepExisting, paymentDate=farmDateToday()}:ReceiverProps) {
  const scope = useManagerPeriod();
  const receiver = farmPaymentReceiver(value);
  const isSupervisor = value === farmSupervisorChoice || receiver?.type === 'farm_supervisor';
  const ownPeriod = scope?.mode === 'personal' && scope.status === 'active' && scope.startsOn &&
    scope.startsOn <= paymentDate ? scope.periodId : null;
  const pinned = receiver?.type === 'farm_supervisor' ? receiver.period_id : '';
  const scopeKey = [scope?.actorId,scope?.mode,scope?.periodId].join(':');
  const lastSelection = useRef({scopeKey, paymentDate});
  const [recheckPeriod,setRecheckPeriod] = useState('');
  useLayoutEffect(() => {
    const previous = lastSelection.current;
    lastSelection.current = {scopeKey, paymentDate};
    if (disabled || !isSupervisor) return;
    if (previous.scopeKey !== scopeKey) {
      setRecheckPeriod('');
      onChange('');
    } else if (previous.paymentDate !== paymentDate && pinned && pinned !== ownPeriod) {
      setRecheckPeriod(pinned);
      onChange(ownPeriod ? '' : farmSupervisorChoice);
    } else if (ownPeriod && pinned !== ownPeriod) {
      onChange(pinned ? '' : 'farm_supervisor:' + ownPeriod);
    }
  }, [scopeKey, paymentDate, disabled, isSupervisor, ownPeriod, pinned, onChange]);
  if (hidden) return null;
  return <div className="space-y-2">
    <label className="block text-sm font-semibold">Who actually received the money?
      <select aria-label="Who actually received the money?" required={!keepExisting} disabled={disabled} className={selectClass}
        value={isSupervisor ? farmSupervisorChoice : receiver ? value : ''}
        onChange={event => {
          const next = event.target.value;
          setRecheckPeriod('');
          onChange(next === farmSupervisorChoice && ownPeriod ? 'farm_supervisor:' + ownPeriod : next);
        }}>
        <option value="">{keepExisting ? 'Keep the recorded recipient' : disabled && value && !receiver ? 'Previously saved recipient' : 'Choose who received the payment'}</option>
        {farmPaymentDestinations.map(option => <option key={option.id} value={'farm:' + option.id}>{option.label}</option>)}
        <option value={farmSupervisorChoice}>Farm Supervisor</option>
      </select>
    </label>
    {isSupervisor && !ownPeriod && !disabled && (paymentDate ? <DatedFarmSupervisor key={paymentDate} date={paymentDate} pinned={pinned} recheckPeriod={recheckPeriod} onChange={onChange}/> : <p className="text-sm">Enter the payment date to find the supervisor.</p>)}
  </div>;
}

function DatedFarmSupervisor({date,pinned,recheckPeriod,onChange}:{date:string; pinned:string; recheckPeriod:string; onChange:(value:string)=>void}) {
  const scope = useManagerPeriod();
  const query = new URLSearchParams({from:date, to:date, limit:'1'});
  const {data,loading,error,refresh} = useOperationsFunds('farm', '&' + query);
  const eligible = data?.business === 'farm' && data.from === date && data.to === date &&
    data.periodId === (scope?.periodId ?? null) ? data.farm_supervisor_receivers : undefined;
  useEffect(() => {
    if (!eligible) return;
    if (pinned && !eligible.some(person => person.period_id === pinned)) onChange('');
    else if (!pinned && recheckPeriod) onChange(eligible.some(person => person.period_id === recheckPeriod) ? 'farm_supervisor:' + recheckPeriod : '');
    else if (!pinned && eligible.length === 1) onChange('farm_supervisor:' + eligible[0].period_id);
  }, [eligible, pinned, recheckPeriod, onChange]);
  if (loading) return <p className="text-sm" role="status">Checking supervisor for this date…</p>;
  if (error || !eligible) return <p className="text-sm" role="alert">The supervisor list could not be loaded. <button type="button" className="min-h-11 underline" onClick={refresh}>Retry</button></p>;
  if (!eligible.length) return <p className="text-sm" role="status">Check the payment date or confirm with the MD/Owner who was assigned to the farm that day.</p>;
  if (eligible.length === 1) return null;
  const names = eligible.map(person => person.name?.trim().toLowerCase());
  if (names.some(name => !name) || new Set(names).size !== names.length) {
    return <p className="text-sm" role="status">Choose the supervisor under Change filters on the farm overview, then open Customers and payments.</p>;
  }
  return <label className="block text-sm font-medium">Which farm supervisor received it?
    <select className={selectClass} required value={pinned} onChange={e=>onChange(e.target.value ? 'farm_supervisor:' + e.target.value : farmSupervisorChoice)}>
      <option value="">Choose the supervisor</option>
      {eligible.map(person => <option key={person.period_id} value={person.period_id}>{person.name}</option>)}
    </select>
  </label>;
}

function OtherReceiverSelect({business,value,onChange,disabled=false,keepExisting=false}:ReceiverProps) {
 const {profile}=useAuth(),{data,error,loading,refresh}=useOperationsFunds(business);
 return <div className="space-y-2"><label className="block text-sm font-semibold">Who actually received the money?<select aria-label="Who actually received the money?" required={!keepExisting} disabled={disabled||loading||!!error} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">{keepExisting?"Keep the recorded recipient":"Choose the person who received payment"}</option><option value="self">I received the money</option>{profile?.role==="admin"&&(data?.manager_receivers||[]).map(p=><option key={p.period_id} value={"manager:"+p.period_id}>{p.name||"Manager"} received the money</option>)}{(data?.ceo_receivers||[]).map(p=><option key={p.id} value={"ceo:"+p.id}>{p.name||"CEO"} received the money</option>)}{(data?.sources||[]).filter(p=>p.holder_type==="custodian").filter((p,i,rows)=>rows.findIndex(other=>other.name===p.name)===i).map(p=><option key={p.id} value={"custodian:"+p.id}>{p.name} received the money</option>)}</select></label><p className="text-xs text-slate-600">Recording a sale is separate from holding its cash. Choose the actual recipient, including bank payments.</p>{error&&<p role="alert" className="text-sm text-red-900">{error}<button type="button" className="ml-2 min-h-11 underline" onClick={refresh}>Retry recipients</button></p>}</div>;
}
export function CashPayerSelect({business,currency,bucket,value,onChange,disabled=false,keepExisting=false,expenseDate,expensePeriod,expenseAmount,approvalStage,onVerified}:{business:Business;currency:string;bucket:"owner"|"sales";value:string;onChange:(value:string)=>void;disabled?:boolean;keepExisting?:boolean;expenseDate?:string;expensePeriod?:string|null;expenseAmount?:string;approvalStage?:"approve"|"confirm";onVerified?:(id:string)=>void}){
 const {enabled}=useOperationsFeature();
 const query=expenseDate?new URLSearchParams({from:expenseDate,to:expenseDate,...(expensePeriod?{period_id:expensePeriod}:{})}):null;
 const {profile}=useAuth(),{data,error,loading,refresh}=useOperationsFunds(business,query?"&"+query:"");
 const samePeriod=new Set((data?.accounts||[]).filter(a=>a.holder_type==="manager"&&!!expensePeriod&&a.period_id===expensePeriod).map(a=>a.id));
 const payers=(Array.isArray(data?.sources)?data.sources:[]).filter(p=>p.currency===currency&&p.bucket===bucket&&(p.holder_type==="custodian"||profile?.role==="admin"&&
   (!approvalStage||p.holder_type==="ceo"||p.holder_type==="manager"&&samePeriod.has(p.id))));
 const selected=payers.find(p=>p.id===value);
 const listUnavailable=!!error||!!expenseDate&&(!Array.isArray(data?.sources)||data?.business!==business||data?.from!==expenseDate||data?.to!==expenseDate||!!expensePeriod&&data?.periodId!==expensePeriod);
 const verified=enabled===true&&!loading&&!listUnavailable&&payers.some(p=>p.id===value)?value:"";
 useEffect(()=>{onVerified?.(verified);},[onVerified,verified]);
 if(enabled!==true)return null;
 if(approvalStage){
  const canDefer=approvalStage==="approve";
  return <div className="space-y-2 text-sm">
   {loading?<p role="status">Checking who could pay on the expense date…</p>:listUnavailable?<p role="alert">The payer list could not be loaded. <button type="button" className="min-h-11 underline" onClick={refresh}>Retry</button></p>
    :payers.length?<label className="block font-semibold">Who paid this expense?
     <select aria-label="Who paid this expense?" disabled={disabled} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={verified} onChange={e=>onChange(e.target.value)}>
      <option value="">{canDefer?"Confirm who paid later":"Choose the actual payer"}</option>{payers.map(p=><option key={p.id} value={p.id}>{p.name} · {formatExactCurrency(p.available,currency)} available</option>)}
     </select></label>:<p>No payer is listed for this source on the expense date.</p>}
   {verified&&selected&&expenseAmount&&subtractMoney(selected.available,expenseAmount).startsWith("-")&&<p role="status">This payer had less than the expense amount on that date. Confirming them sends the expense to Funds for review.</p>}
   {value&&!verified&&!loading&&<p role="status">The saved payer still needs verification. {canDefer&&<button type="button" className="min-h-11 font-semibold underline" onClick={()=>onChange("")}>Confirm who paid later</button>}</p>}
   {canDefer&&!value&&<p className="text-slate-700">You can approve now. The expense enters the totals when you confirm who paid.</p>}
  </div>;
 }
 return <div className="space-y-2"><label className="block text-sm font-semibold">Who paid this expense?<select aria-label="Who paid this expense?" disabled={disabled||loading||!!error} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">{keepExisting?"Keep the recorded payer":profile?.role==="admin"?"Choose the actual payer":"I paid from my confirmed funds"}</option>{payers.map(p=><option key={p.id} value={p.id}>{p.name} paid directly</option>)}{profile?.role!=="admin"&&<option value="review">Someone else paid, ask the MD/Owner to confirm</option>}</select></label>{error?<p role="alert" className="text-sm text-red-800">Payers could not be loaded. <button type="button" className="min-h-11 underline" onClick={refresh}>Retry</button></p>:loading?<p className="text-sm">Loading payers…</p>:profile?.role==="admin"&&!payers.length?<p className="text-sm text-amber-900">No payer is recorded for this source. Confirm the actual funding in Funds.</p>:<p className="text-xs text-slate-600">An expense enters the totals when its funding is confirmed.</p>}</div>;
}
