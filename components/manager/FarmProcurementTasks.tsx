"use client";
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {useOfflineSync} from '@/hooks/useOfflineSync';
import {useQueueIdentity} from '@/contexts/ManagerPeriodContext';
import {queueIdentityKey} from '@/lib/offline-storage';
import {farmDateToday} from '@/lib/farm-products';
import {formatExactCurrency} from '@/lib/money';
import {purchaseSchema,type ProcurementTask,type PurchaseData} from '@/lib/farm-purchases';
import {FarmPhotoPicker} from './FarmPhotoPicker';
import {CashPayerSelect} from './CashPartySelect';
const input='mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
const button='inline-flex min-h-11 items-center rounded-lg border border-emerald-800 px-3 text-sm font-semibold text-emerald-900';
type Action='assign_procurement'|'procure'|'dispatch'|'payment';
const titles:Record<Action,string>={assign_procurement:'Assign Sales and Procurement',procure:'Record purchase',dispatch:'Record items sent',payment:'Record actual payment'};
function ActionForm({task,action,data,admin,onSaved}:{task:ProcurementTask;action:Action;data:PurchaseData;admin:boolean;onSaved:(message:string)=>void}){
 const identity=useQueueIdentity(),{submitOrQueue,isSyncing}=useOfflineSync();
 const key=identity&&'farm-procurement:'+queueIdentityKey(identity)+':'+task.request_id+':'+action;
 const [restored]=useState(()=>{
  const defaults={date:farmDateToday(),supplier:task.details.supplier||'',prices:task.details.items.map(()=>''),period:task.assignment?.period_id||'',previousId:task.assignment?.id??null,line:'',qty:'',notes:'',amount:'',payer:'',source:task.details.purchase_category==='feed'?'owner_fund':'',media:[] as string[],retry:crypto.randomUUID()};
  try{const saved=key&&localStorage.getItem(key);if(!saved)return {value:defaults,fault:false};const d=JSON.parse(saved);
   if(typeof d.retry!=='string'||!Array.isArray(d.prices)||!Array.isArray(d.media))throw Error();return {value:{...defaults,...d} as typeof defaults,fault:false};
  }catch{return {value:defaults,fault:true};}
 });
 const [draft,setDraft]=useState(restored.value),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(key&&!restored.fault)try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError('Your draft could not be saved on this device.');}},[key,draft,restored.fault]);
 function change<K extends keyof typeof draft>(field:K,value:typeof draft[K]){setDraft(current=>({...current,[field]:value}));}
 async function save(e:React.FormEvent){e.preventDefault();if(busy||restored.fault)return;setBusy(true);setError('');
  try{
   if(action==='procure'&&data.policy?.require_quote&&!draft.media.length)throw Error('Attach the supplier quotation.');
   if(action==='payment'&&admin&&!draft.payer)throw Error('Choose the person who actually paid.');
   const payload=action==='assign_procurement'?{period_id:draft.period||null,previous_id:draft.previousId}:action==='procure'?{date:draft.date,supplier:draft.supplier,prices:draft.prices}:action==='dispatch'?{date:draft.date,line_id:draft.line,quantity:draft.qty,notes:draft.notes}:{date:draft.date,amount:draft.amount,recipient:draft.supplier,expense_source:draft.source,...(draft.payer==='review'?{cash_payer_review:true}:draft.payer?{cash_payer_account_id:draft.payer}:{})};
   const body=purchaseSchema.safeParse({operation:action,id:action==='payment'?task.order_id:task.request_id,request_id:draft.retry,payload});if(!body.success)throw Error(body.error.issues[0]?.message||'Check the details');
   const response=await submitOrQueue('/api/farm/purchases',body.data,{mediaIds:draft.media});
   if(!response.success||response.status==='needs_attention')throw Error(response.error||'Saved for review. Check the pending entry before retrying.');
   if(key)localStorage.removeItem(key);onSaved(response.status==='sent'?'Saved.':'Saved on this device. Waiting to send.');
  }catch(ex){setError(ex instanceof Error?ex.message:'Unable to confirm. Your draft is saved.');}finally{setBusy(false);}
 }
 return <form onSubmit={save}><fieldset className="space-y-3 text-sm" disabled={busy||isSyncing||photoBusy||restored.fault}>
  {action==='assign_procurement'?<label className="block">Account for this request<select className={input} value={draft.period} onChange={e=>change('period',e.target.value)}><option value="">MD handles this request</option>{data.procurement_people?.map(p=><option key={p.period_id} value={p.period_id}>{p.name}</option>)}</select></label>:<label className="block">Actual date<input className={input} type="date" max={farmDateToday()} required value={draft.date} onChange={e=>change('date',e.target.value)}/></label>}
  {(action==='procure'||action==='payment')&&<label className="block">{action==='procure'?'Actual supplier':'Paid to'}<input className={input} required maxLength={200} value={draft.supplier} onChange={e=>change('supplier',e.target.value)}/></label>}
  {action==='procure'&&<>{task.details.items.map((line,i)=><label className="block" key={i}>{line.description} · {line.quantity} {line.unit}<span className="block">Actual price per unit (NGN)</span><input className={input} inputMode="decimal" required value={draft.prices[i]||''} onChange={e=>change('prices',draft.prices.map((p,n)=>n===i?e.target.value:p))}/></label>)}{data.policy?.require_quote&&<p>Attach the supplier quotation.</p>}<FarmPhotoPicker resource="farm_purchases" date={draft.date} value={draft.media} onChange={v=>change('media',v)} onBusyChange={setPhotoBusy}/></>}
  {action==='dispatch'&&<><label className="block">Item<select className={input} required value={draft.line} onChange={e=>change('line',e.target.value)}><option value="">Choose an item</option>{task.lines.filter(l=>Number(l.dispatched)<Number(l.quantity)).map(l=><option key={l.id} value={l.id}>{l.description} · {l.unit}</option>)}</select></label><label className="block">Quantity sent<input inputMode="decimal" className={input} required value={draft.qty} onChange={e=>change('qty',e.target.value)}/></label><label className="block">Delivery notes (optional)<textarea className={input} value={draft.notes} maxLength={2000} onChange={e=>change('notes',e.target.value)}/></label></>}
  {action==='payment'&&<><label className="block">Amount paid (NGN)<input className={input} inputMode="decimal" required value={draft.amount} onChange={e=>change('amount',e.target.value)}/></label><label className="block">Funding source<select className={input} required value={draft.source} onChange={e=>{change('source',e.target.value);change('payer','');}}><option value="">Choose a source</option><option value="owner_fund">Owner funds</option>{task.details.purchase_category!=='feed'&&<option value="sales_cash">Sales money</option>}</select></label>{draft.source&&<CashPayerSelect business="farm" currency="NGN" bucket={draft.source==='sales_cash'?'sales':'owner'} value={draft.payer} onChange={v=>change('payer',v)}/>}</>}
  {restored.fault&&<p role="alert">This earlier draft could not be read. Its contents are still saved.</p>}{error&&<p role="alert" className="text-red-800">{error}</p>}<button className={button+' bg-emerald-50'}>{busy?'Saving…':titles[action]}</button>
 </fieldset></form>;
}
export function FarmProcurementTasks({data,admin,onReceive,onSaved}:{data:PurchaseData;admin:boolean;onReceive:(id:string)=>void;onSaved:(msg:string)=>void}){
 const tasks=data.procurement_tasks||[],[open,setOpen]=useState<{task:ProcurementTask;action:Action}|null>(null);
 if(!tasks.length)return null;
 return <section className="space-y-2" aria-label="Purchase handovers">{tasks.map(t=>{
  const received=t.lines.length>0&&t.lines.every(l=>Number(l.received)>=Number(l.quantity));
  const stage=!t.order_id?'Approved · ready to purchase':received?'Delivered':t.lines.some(l=>Number(l.received)>0)?'Partly delivered':t.lines.some(l=>Number(l.dispatched)>0)?'Sent · awaiting receipt':'Purchased · awaiting delivery';
  const act=(action:Action)=>setOpen({task:t,action});
  return <article key={t.request_id} id={'request-'+t.request_id} className="space-y-2 rounded-xl border bg-white p-4"><h3 className="font-bold text-emerald-950">{t.description}</h3><p className="text-sm">{stage}{t.supplier&&' · '+t.supplier}</p><p className="text-sm text-slate-600">Needed {t.details.needed_on}{t.requester_name&&' · '+t.requester_name}{t.assignment?.name&&' · Buyer: '+t.assignment.name}</p>
   {t.order_id&&<><ul className="text-sm">{t.lines.map(l=><li key={l.id}>{l.description} · {l.received} / {l.quantity} {l.unit} received{Number(l.dispatched)>0&&' · '+l.dispatched+' sent'}</li>)}</ul><p className="text-sm">Paid {formatExactCurrency(t.paid||'0','NGN')}</p></>}
   <div className="flex flex-wrap gap-2">{admin&&<button className={button} onClick={()=>act('assign_procurement')}>{t.assignment?.name?'Change buyer':'Assign Sales and Procurement'}</button>}
    {t.can_procure&&!t.order_id&&<button className={button} onClick={()=>act('procure')}>Record purchase</button>}
    {t.can_procure&&t.order_id&&<><button className={button} onClick={()=>act('payment')}>Record actual payment</button>{!received&&t.lines.some(l=>Number(l.dispatched)<Number(l.quantity))&&<button className={button} onClick={()=>act('dispatch')}>Record items sent</button>}</>}
    {t.order_id&&data.purchases.some(p=>p.id===t.order_id)&&<button className={button} onClick={()=>onReceive(t.order_id!)}>{received?'View delivery details':'View delivery and confirm receipt'}</button>}
   </div></article>;
 })}<Dialog open={!!open} onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent><DialogTitle>{open&&titles[open.action]}</DialogTitle><DialogDescription>{open?.task.description}</DialogDescription>{open&&<ActionForm key={open.task.request_id+open.action} task={open.task} action={open.action} data={data} admin={admin} onSaved={m=>{setOpen(null);onSaved(m);}}/>}</DialogContent></Dialog></section>;
}
