"use client";
import Link from 'next/link';
import {useFarmRecordAnchor} from "@/hooks/useFarmRecordAnchor";
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {FarmCustomerBalances} from './FarmCustomerBalances';
import {useManagerFetch,useManagerPeriod,useQueueIdentity} from '@/contexts/ManagerPeriodContext';
import {useOfflineSync} from '@/hooks/useOfflineSync';
import {getPendingItems,getSubmissionStatus,queueIdentityKey,removePending} from '@/lib/offline-storage';
import {EGG_SALE_PRODUCT,FARM_PRODUCTS,farmDateToday} from '@/lib/farm-products';
import {farmSupervisorChoice,isFarmReceiverChoice} from '@/lib/farm-payment-receiver';
import {formatExactCurrency,subtractMoney,sumMoney} from '@/lib/money';
import {creditSchema,invoiceStatus,type CreditData} from '@/lib/farm-credit';
import {CashReceiverSelect,selectedCashReceiver} from './CashPartySelect';
import {FarmPhotoPicker} from './FarmPhotoPicker';
import {FarmRecordThread} from './FarmRecordThread';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {useOperationsFunds} from '@/hooks/useOperationsFunds';
const field='mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm',button='inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50';
function invoiceLabel(invoice:CreditData['invoices'][number]) {
 return invoice.kind==='opening_balance'?'Earlier balance · '+(invoice.reference||invoice.number):invoice.number;
}
function NewCreditSale({admin,customerId}:{admin:boolean;customerId?:string}){
 const [product,setProduct]=useState('');
 const source=new URLSearchParams(window.location.search),query=new URLSearchParams({payment:'credit'});
 for(const key of ['period_id','manager_id','from','to']){const value=source.get(key);if(value)query.set(key,value);}
 if(customerId)query.set('customer_id',customerId);
 const sales=admin?'/dashboard/farm/sales':window.location.pathname.startsWith('/manager/')?'/manager/sales':'/sales';
 return <details className="rounded-xl bg-emerald-50 p-3 text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold">New sale on credit</summary>
   <label className="block font-medium">Product sold<select className={field} value={product} onChange={e=>setProduct(e.target.value)}><option value="">Choose a product</option>{[...FARM_PRODUCTS,EGG_SALE_PRODUCT].map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
   {product&&<Link className={'mt-3 '+button} href={sales+'/'+product+'?'+query}>Continue to sale</Link>}
 </details>;
}
function correctableCreditConflict(operation:string,message?:string){
 if(!message)return false;
 if(operation==='receipt')return message.startsWith('The amount owing does not match');
 return operation==='opening_balance'&&[
  'This reference is already on the customer account.',
  'A later payment is already recorded.',
  'Enter the date, amount still owed',
  'A reason is required for a closed-day correction',
  'This date is closed. Keep the entry and request a correction',
  'Activity cannot predate your work start date',
  'Date precedes your work start'
 ].some(prefix=>message.startsWith(prefix));
}

export function CreditForm({operation,id,data,admin=false,onSaved,onRecordOwing}:{operation:string;id?:string;data:CreditData;admin?:boolean;onSaved:()=>void;onRecordOwing?:(customerId:string)=>void}){
 const send=useManagerFetch(),identity=useQueueIdentity(),scope=useManagerPeriod(),{submitOrQueue,isSyncing,retryEntry}=useOfflineSync(),funds=useOperationsFunds('farm');
 const selectedPeriod=scope?.periodId&&scope.actorId!==scope.managerId&&identity?.periodId!==scope.periodId?':view:'+scope.periodId:'';
 const key=identity?`farm-credit-draft:${queueIdentityKey(identity)}${selectedPeriod}:${operation}:${operation==='opening_balance'?'':id||''}`:'';
 const [mediaIds,setMediaIds]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(key+':photos')||'[]');}catch{return [];}}),[photoBusy,setPhotoBusy]=useState(false);
 const [draft,setDraft]=useState<Record<string,string>>(()=>{try{const saved=key&&localStorage.getItem(key);if(saved){
  const previous=JSON.parse(saved) as Record<string,string>;
  if(operation==='opening_balance'&&id&&!previous.amount&&!previous.reference&&!previous.reason)return {...previous,customer_id:id};
  return previous;
 }}catch{}return {date:farmDateToday(),name:'',phone:'',reason:'',amount:'',amount_owing:'',reference:'',days:'',customer_id:id||'',period_id:'',receiver:'',request_id:crypto.randomUUID()};}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(key)try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError('Draft could not be stored. Keep this page open until sent.');}},[key,draft]);
 useEffect(()=>{if(key)try{localStorage.setItem(key+':photos',JSON.stringify(mediaIds));}catch{setError('Photo references could not be stored. Keep this page open until sent.');}},[key,mediaIds]);
 const today=farmDateToday(), [balanceVersion,setBalanceVersion]=useState(0),[dated,setDated]=useState<{date:string;invoices:CreditData['invoices']}|null>(null);
 useEffect(()=>{
  if(!['receipt','opening_balance'].includes(operation)||!draft.date||!draft.customer_id||(draft.date===today&&balanceVersion===0))return;
  const controller=new AbortController();setDated(null);
  send('/api/farm/credit?as_of='+encodeURIComponent(draft.date),{signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error();const body=await r.json();
   if(Array.isArray(body.invoices)&&!controller.signal.aborted)setDated({date:draft.date,invoices:body.invoices});
  }).catch(()=>{});return()=>controller.abort();
 },[send,draft.date,draft.customer_id,today,balanceVersion,operation,data]);
 const invoices=draft.date===today&&balanceVersion===0?data.invoices:dated?.date===draft.date?dated.invoices:null;
 const customerInvoices=invoices?.filter(i=>i.customer_id===draft.customer_id&&!i.voided_at);
 const before=customerInvoices?sumMoney(customerInvoices.map(i=>i.owed)):null;
 const net=before!==null&&/^\d+(?:\.\d{1,2})?$/.test(draft.amount||'')?subtractMoney(before,draft.amount):null;
 const expected=net?.startsWith('-')?'0':net;
 const update=(name:string,value:string)=>setDraft(d=>({...d,[name]:value}));
 function finish(){if(key){localStorage.removeItem(key);localStorage.removeItem(key+':photos');}onSaved();}
 const entryName=operation==='opening_balance'?'earlier balance':operation==='receipt'?'payment':'entry';
 const protectedEntry=operation==='receipt'||operation==='opening_balance';
 const waitingForSupervisor=operation==='receipt'&&draft.receiver===farmSupervisorChoice;
 function editRejected(item:{id:string;conflict?:string}){
   if(!identity||!correctableCreditConflict(operation,item.conflict))return;
   removePending(item.id,identity);setBalanceVersion(v=>v+1);setDraft(d=>({...d,request_id:crypto.randomUUID()}));
   setError(item.conflict||'Check this entry.');
 }
 async function submit(e:React.FormEvent){
 e.preventDefault();
 if(waitingForSupervisor)return;
 setBusy(true);setError('');try{
 if(operation==='receipt'&&!isFarmReceiverChoice(draft.receiver))throw Error('Choose who received the payment.');
 const payload=operation==='customer'?{name:draft.name,phone:draft.phone}:operation==='terms'?{days:Number(draft.days),reason:draft.reason}:operation==='assign'?{period_id:draft.period_id,reason:draft.reason}:operation==='opening_balance'?{date:draft.date,customer_id:draft.customer_id,amount:draft.amount,reference:draft.reference?.trim(),...(draft.reason?.trim()?{reason:draft.reason.trim()}:{})}:operation==='receipt'?{date:draft.date,customer_id:draft.customer_id,amount:draft.amount,...(draft.amount_owing?.trim()?{amount_owing:draft.amount_owing.trim()}:{}),cash_receiver:selectedCashReceiver(draft.receiver),notes:draft.reason}:operation==='credit_note'||operation==='refund'?{date:draft.date,amount:draft.amount,reason:draft.reason}:{reason:draft.reason};
 const parsed=creditSchema.safeParse({operation,payload,...(id&&!['receipt','opening_balance'].includes(operation)?{id}:{}),request_id:draft.request_id});if(!parsed.success)throw Error(parsed.error.issues[0]?.message||'Check the entry');
 if(operation==='receipt'&&draft.amount_owing?.trim()&&expected!==null&&Number(subtractMoney(draft.amount_owing,expected))!==0)throw Error('The amount owing does not match this customer’s invoices. Check the balance shown below.');
 const result=await submitOrQueue('/api/farm/credit',parsed.data,{mediaIds});if(!result.success)throw Error(result.error);
 if(result.status==='needs_attention'&&identity){
  const item=getPendingItems(identity).find(p=>p.requestId===draft.request_id);
  if(item)editRejected(item);
  throw Error(item?.conflict||'This entry needs review. Your details are saved.');
 }
 if(!protectedEntry||result.status==='sent')finish();
 }catch(e){setError(e instanceof Error?e.message:'Entry retained. Please retry.');}finally{setBusy(false);}}
 // Keep the original submission intact when a phone closes between saving and acknowledgement.
 const queued=protectedEntry&&identity?getPendingItems(identity).find(item=>item.endpoint==='/api/farm/credit'&&item.requestId===draft.request_id):null;
 const confirmed=protectedEntry&&identity&&getSubmissionStatus(identity,draft.request_id)==='sent';
 if(!busy&&(queued||confirmed))return <div className="space-y-3"><p role="status">{confirmed?'This '+entryName+' has already been recorded.':queued?.conflict||'This '+entryName+' is saved on your phone and is waiting to send.'}</p>
   {confirmed?<button type="button" className={button} onClick={finish}>Done</button>:queued&&<button type="button" className={button} disabled={isSyncing} onClick={()=>correctableCreditConflict(operation,queued.conflict)?editRejected(queued):void retryEntry(queued.id)}>{correctableCreditConflict(operation,queued.conflict)?'Edit saved details':'Retry saved '+entryName}</button>}
 </div>;
 const input=(name:string,label:string,type='text',min?:number)=><label className="block text-sm font-medium">{label}<input required={name!=='phone'&&name!=='amount_owing'} className={field} type={type} min={min} inputMode={type==='number'&&name!=='days'?'decimal':undefined} maxLength={name==='reference'?160:undefined} step={name==='days'?'1':(name==='amount'||name==='amount_owing')?'0.01':undefined} max={type==='date'?farmDateToday():undefined} value={draft[name]||''} onChange={e=>update(name,e.target.value)}/></label>;
 return <form onSubmit={submit}><fieldset disabled={busy||isSyncing||photoBusy} className="space-y-4">
 {operation==='customer'?<>{input('name','Customer name')}{input('phone','Customer contact')}</>:operation==='terms'?<>{input('days','Approved credit terms (days)','number',0)}<p className="text-xs">Enter 0 to stop new credit sales. Existing invoice terms remain unchanged.</p></>:operation==='assign'?<label className="block text-sm font-medium">Responsible manager<select required className={field} value={draft.period_id} onChange={e=>update('period_id',e.target.value)}><option value="">Choose the assigned manager</option>{funds.data?.manager_receivers?.map(p=><option key={p.period_id} value={p.period_id}>{p.name||'Manager'}</option>)}</select><span className="text-xs">Assignment permits customer debt collection. It does not transfer old cash, private receipts or performance.</span></label>:null}
 {operation==='receipt'&&onRecordOwing&&<button type="button" className={button} onClick={()=>onRecordOwing(draft.customer_id)}>Record credit owing</button>}
 {operation==='opening_balance'&&<NewCreditSale admin={admin} customerId={draft.customer_id}/>}
 {['receipt','opening_balance'].includes(operation)&&<label className="block text-sm font-medium">Customer<select aria-label="Customer" required className={field} value={draft.customer_id} onChange={e=>update('customer_id',e.target.value)}><option value="">Choose the customer</option>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' · '+c.phone:''}</option>)}</select></label>}
 {['receipt','credit_note','refund'].includes(operation)&&<>{input('date',operation==='receipt'?'Payment date':'Actual payment or credit date','date')}{input('amount',operation==='receipt'?'Amount paid (NGN)':'Amount (NGN)','number',0.01)}</>}
 {operation==='opening_balance'&&<>
   {input('date','Balance confirmed on','date')}
   {draft.customer_id&&before!==null&&<div className="rounded-xl bg-slate-50 p-3 text-sm"><p>Already recorded for this customer: <strong>{formatExactCurrency(before,'NGN')}</strong></p>
     {!!customerInvoices?.some(i=>Number(i.owed)>0)&&<details><summary className="min-h-11 cursor-pointer content-center font-semibold">View unpaid entries</summary><ul>{customerInvoices.filter(i=>Number(i.owed)>0).map(i=><li key={i.id}>{i.reference||i.number} · {formatExactCurrency(i.owed,'NGN')}</li>)}</ul></details>}
   </div>}
   {input('amount','Credit owing (NGN)','number',0.01)}
   {input('reference','Original invoice or reference')}
 </>}
 {operation==='receipt'&&<>{input('amount_owing','Amount owing after this payment (optional, NGN)','number',0)}
 {draft.customer_id&&<p className="text-sm text-slate-700">{expected!==null?'Invoice balance after payment: '+formatExactCurrency(expected,'NGN'):before!==null?'Outstanding invoices: '+formatExactCurrency(before,'NGN'):'The invoice balance will be checked when this payment is sent.'}{net?.startsWith('-')?' Excess payment remains customer credit.':''}</p>}
 <CashReceiverSelect business="farm" paymentDate={draft.date} value={draft.receiver} onChange={v=>update('receiver',v)}/><p className="text-xs text-slate-600">Payments settle the customer’s oldest unpaid entries first.</p></>}
 {operation==='receipt'&&<FarmPhotoPicker date={draft.date} resource="farm_customer_receipts" value={mediaIds} onChange={setMediaIds} onBusyChange={setPhotoBusy}/>}
 {operation!=='customer'&&<label className="block text-sm font-medium">{operation==='receipt'?'Notes':operation==='opening_balance'?'Reason (needed for a closed day)':'Reason'}<textarea className={field} maxLength={2000} required={!['receipt','opening_balance'].includes(operation)} value={draft.reason} onChange={e=>update('reason',e.target.value)}/></label>}{error&&<p role="alert" className="text-red-800">{error}</p>}<button disabled={waitingForSupervisor} className={button+' w-full bg-emerald-900 text-white'} type="submit">{busy?'Saving…':operation==='opening_balance'?'Save credit owing':operation==='void_opening_balance'?'Reverse earlier balance':'Save entry'}</button>
 </fieldset></form>;
}
export function FarmCredit({admin=false,from,to}:{admin?:boolean;from?:string;to?:string}){

 const send=useManagerFetch(),identity=useQueueIdentity(),scope=useManagerPeriod(),revision=useFarmRecordRefresh();
 const scopeKey=(identity?queueIdentityKey(identity):'awaiting-scope')+'|'+(scope?.periodId||'');
 const [saved,setSaved]=useState<{key:string;value:CreditData}|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[action,setAction]=useState<{operation:string;id?:string}|null>(null);
 const data=saved?.key===scopeKey?saved.value:null;
 useEffect(()=>{const entry=new URLSearchParams(window.location.search).get('action');setAction(entry==='receipt'||entry==='opening_balance'?{operation:entry}:null);},[scopeKey]);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('farm-records-synced',refresh);window.addEventListener('farm-pending-changed',refresh);return()=>{window.removeEventListener('farm-records-synced',refresh);window.removeEventListener('farm-pending-changed',refresh);};},[]);
 useEffect(()=>{const c=new AbortController();setError('');send('/api/farm/credit',{signal:c.signal}).then(async r=>{if(!c.signal.aborted&&(r.status===401||r.status===403)){setSaved(null);setAction(null);}const b=await r.json();if(!r.ok||!Array.isArray(b.invoices)||!Array.isArray(b.receipts)||!b.summary)throw Error(b.error||'Customer records unavailable');if(!c.signal.aborted)setSaved({key:scopeKey,value:b});}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[send,version,revision,scopeKey]);
 const money=(v:string)=>formatExactCurrency(v,'NGN'),pending=identity?getPendingItems(identity).filter(i=>i.endpoint==='/api/farm/credit'):[];
 const [focusInvoice,setFocusInvoice]=useState('');
 useEffect(()=>setFocusInvoice(new URLSearchParams(window.location.search).get('invoice_id')||''),[scopeKey]);
 useFarmRecordAnchor(data);
 const inPeriod=(date:string)=>(!from||date>=from)&&(!to||date<=to);
 const invoices=data?.invoices.filter(i=>inPeriod(i.date)||i.id===focusInvoice)??[],receipts=data?.receipts.filter(r=>inPeriod(r.date))??[];
 const labels:Record<string,string>={customer:'Add customer',receipt:'Record payment received',opening_balance:'Record credit owing',void_opening_balance:'Reverse earlier balance',terms:'Approve payment terms',assign:'Assign customer',void_receipt:'Reverse mistaken receipt',credit_note:'Credit invoice',refund:'Record actual refund',void_refund:'Reverse mistaken refund',void_credit:'Reverse mistaken credit',evidence:'Receipt notes & photos'};
 return <div className="mx-auto max-w-5xl space-y-5 text-slate-950"><header><p className="mt-1 text-sm text-slate-600">Track customer sales, payments and outstanding balances.</p></header>
 <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setAction({operation:'customer'})}>Add customer</button><button className={button+' bg-emerald-900 text-white'} onClick={()=>setAction({operation:'receipt'})}>Record payment received</button><button className={button} onClick={()=>setAction({operation:'opening_balance'})}>Record credit owing</button></div>
 {pending.map(i=><p key={i.id} role="status" className="rounded-xl bg-amber-50 p-3 text-sm">{i.conflict||(i.data.operation==='opening_balance'?'Earlier balance':i.data.operation==='receipt'?'Payment':'Entry')+' saved on this phone. Waiting to send.'}</p>)}
 {error&&<p role="alert">{error} {data&&'Showing the last confirmed records.'} <button className={button} onClick={()=>setVersion(v=>v+1)}>Retry</button></p>}{!data?(!error&&<p role="status">Loading customer records…</p>):<>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Invoice sales',data.summary.revenue],['Payments received',data.summary.collected],['Customer debt',data.summary.owed],['Unapplied credit',data.summary.unapplied],['Refunds paid',data.summary.refunded]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 break-words text-2xl font-bold tabular-nums">{money(value)}</p></div>)}</div><p className="text-xs text-slate-600">Customer debt covers assigned customers. Payments and sales performance retain their original manager attribution. Earlier balances appear when someone records the original reference and unpaid amount.</p>
 {(from||to)&&<p className="text-sm font-semibold">Invoices and payments {from?'from '+from:''} {to?'through '+to:''}. The customer balances stay current.</p>}
 <FarmCustomerBalances invoices={data.invoices}/>
 <section aria-label="Sales and balances" className="rounded-2xl border bg-white p-4 sm:p-5"><h2 className="mb-3 text-xl font-bold">Sales & balances</h2>{!invoices.length?<p className="text-sm">No invoices recorded here yet.</p>:<table className="block w-full text-left text-sm md:table"><thead className="sr-only md:not-sr-only md:table-header-group"><tr>{['Invoice / customer','Date / status','Original amount','Paid','Still owed',...(admin?['Actions']:[])].map(label=><th className="border-b p-3 font-semibold text-slate-600" key={label}>{label}</th>)}</tr></thead><tbody className="block md:table-row-group">{invoices.map(i=><tr id={'invoice-'+i.id} tabIndex={-1} key={i.id} className="mb-3 grid grid-cols-2 gap-3 rounded-xl border p-3 last:mb-0 md:table-row md:rounded-none md:border-0 md:p-0"><td className="col-span-2 min-w-0 break-words md:border-b md:p-3"><p className="font-semibold">{invoiceLabel(i)}</p><p>{i.customer_name}</p></td><td className="col-span-2 md:border-b md:p-3"><p>{i.date}{i.due_date&&' · Due '+i.due_date}</p><p className="mt-1 font-semibold text-emerald-900">{invoiceStatus(i)}</p></td><td className="md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Original amount</span><strong className="break-words tabular-nums">{money(i.total)}</strong></td><td className="md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Paid</span><strong className="break-words tabular-nums">{i.collected!==undefined?money(i.collected):'Unavailable'}</strong></td><td className="md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Still owed</span><strong className="break-words tabular-nums">{money(i.owed)}</strong>{Number(i.credited)>0&&<p className="text-xs text-slate-600">Credit adjustment {money(i.credited!)}</p>}</td>{admin&&<td className="md:border-b md:p-3">{!i.voided_at&&(i.kind==='opening_balance'?(Number(i.collected)>0?<span className="text-sm">Reverse the linked payments before correcting this balance.</span>:<button className={button} onClick={()=>setAction({operation:'void_opening_balance',id:i.id})}>Reverse earlier balance</button>):<button className={button} onClick={()=>setAction({operation:'credit_note',id:i.id})}>Credit invoice</button>)}</td>}</tr>)}</tbody></table>}</section>
 <section aria-label="Payment history" className="rounded-2xl border bg-white p-4 sm:p-5"><h2 className="text-xl font-bold">Payment history</h2><p className="mb-3 mt-1 text-sm text-slate-600">Balances show what is owed now, including later payments and credits.</p>{!receipts.length?<p className="text-sm">No receipts recorded in this responsibility scope.</p>:<table className="block w-full text-left text-sm md:table"><thead className="sr-only md:not-sr-only md:table-header-group"><tr>{['Payment date / customer','Invoice','Amount paid','Current invoice balance','Actions'].map(label=><th key={label} className="border-b p-3 font-semibold text-slate-600">{label}</th>)}</tr></thead><tbody className="block md:table-row-group">{receipts.map(r=><tr key={r.id} className="mb-3 grid grid-cols-2 gap-3 rounded-xl border p-3 last:mb-0 md:table-row md:rounded-none md:border-0 md:p-0"><td className="col-span-2 min-w-0 break-words md:border-b md:p-3"><p className="font-semibold">{r.customer_name}</p><p>{r.date}{r.voided_at?' · Reversed':''}</p></td><td className="col-span-2 md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Invoice</span>{r.allocations.length?r.allocations.map(a=>{const entry=data.invoices.find(i=>i.id===a.invoice_id);return <p className="break-words" key={a.invoice_id}>{entry?invoiceLabel(entry):'Linked invoice details unavailable'}</p>;}):<p>No invoice allocation</p>}</td><td className="min-w-0 md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Amount paid</span><strong className="break-words tabular-nums">{money(r.amount)}</strong>{r.allocations.length>1&&r.allocations.map(a=>{const entry=data.invoices.find(i=>i.id===a.invoice_id);return <p className="mt-1 text-xs text-slate-600" key={a.invoice_id}>{money(a.amount)} to {entry?invoiceLabel(entry):'linked invoice'}</p>;})}</td><td className="min-w-0 md:border-b md:p-3"><span className="block text-slate-600 md:hidden">Current invoice balance</span>{r.allocations.length?r.allocations.map(a=>{const invoice=data.invoices.find(i=>i.id===a.invoice_id);return <p className="break-words font-semibold tabular-nums" key={a.invoice_id}>{invoice?money(invoice.owed):'Unavailable'}{r.allocations.length>1&&<span className="block text-xs font-normal text-slate-600">{invoice?invoiceLabel(invoice):'Linked invoice'}</span>}</p>;}):<p>Not allocated to an invoice</p>}</td><td className="col-span-2 md:border-b md:p-3"><button className={button} onClick={()=>setAction({operation:'evidence',id:r.id})}>View notes & photos</button>{admin&&!r.voided_at&&<details className="mt-2"><summary className="cursor-pointer py-2 font-semibold">Correct payment</summary><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setAction({operation:'void_receipt',id:r.id})}>Reverse mistaken receipt</button><button className={button} onClick={()=>setAction({operation:'refund',id:r.id})}>Refund unapplied credit</button></div></details>}</td></tr>)}</tbody></table>}</section>
 <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Customers</h2>{!data.customers.length&&<p className="text-sm">No customers recorded in this scope.</p>}{data.customers.map(c=><article key={c.id} className="space-y-2 border-t pt-3"><p className="font-medium">{c.name}</p><p className="text-sm">{c.phone||'Contact not recorded'} · {c.credit_days?`${c.credit_days} approved credit days`:'Credit terms not approved'}</p>{admin&&<div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setAction({operation:'terms',id:c.id})}>Payment terms</button><button className={button} onClick={()=>setAction({operation:'assign',id:c.id})}>Assign manager</button></div>}</article>)}</section>
 <details className="rounded-xl border bg-white p-5"><summary className="min-h-11 cursor-pointer font-semibold">Credits & refunds</summary>{!data.credit_notes.length&&!data.refunds.length&&<p className="text-sm">No credit adjustments or refunds recorded.</p>}{data.credit_notes.map(n=><p className="border-t py-3 text-sm" key={n.id}>{n.date} · Invoice credit {money(n.amount)} · {n.reason}{n.voided_at?' (Reversed)':''}{admin&&!n.voided_at&&<button className={button} onClick={()=>setAction({operation:'void_credit',id:n.id})}>Reverse mistaken credit</button>}</p>)}{data.refunds.map(r=><article className="border-t py-3 text-sm" key={r.id}><p>{r.date} · Refund {money(r.amount)} · {r.reason}{r.voided_at?' (Reversed)':''}</p>{admin&&!r.voided_at&&<button className={button} onClick={()=>setAction({operation:'void_refund',id:r.id})}>Reverse mistaken refund</button>}</article>)}</details>
 </>}
 <Dialog open={!!action} onOpenChange={open=>{if(!open)setAction(null);}}><DialogContent><DialogTitle className="pr-10">{action&&labels[action.operation]}</DialogTitle><DialogDescription>{action?.operation==='opening_balance'?'For an earlier sale, enter only the unpaid amount missing from this customer’s records.':action?.operation==='void_opening_balance'?'Give the reason for removing this earlier balance from the amount owed.':'Record actual events. Saved entries and their original attribution remain in history.'}</DialogDescription>
 {action?.operation==='evidence'&&action.id?<FarmRecordThread resource="farm_customer_receipts" recordId={action.id}/>:action&&error&&!data?<p role="alert" className="text-red-800">{error}<button className={button+' ml-2'} onClick={()=>setVersion(v=>v+1)}>Retry customer records</button></p>:action&&!data?<p role="status">Loading customer records…</p>:action&&data&&<>
   <CreditForm key={scopeKey+action.operation+action.id} {...action} data={data} admin={admin} onRecordOwing={customerId=>setAction({operation:'opening_balance',id:customerId||undefined})} onSaved={()=>{setAction(null);setVersion(v=>v+1);}}/>
 </>}</DialogContent></Dialog></div>;
}
