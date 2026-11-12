"use client";
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {ManagerPeriodProvider,useManagerFetch,useQueueIdentity,useManagerPeriod} from '@/contexts/ManagerPeriodContext';
import {useOfflineSync} from '@/hooks/useOfflineSync';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {queueIdentityKey,getPendingItems} from '@/lib/offline-storage';
import {farmDateToday} from '@/lib/farm-products';
import {purchaseSchema,reportedExpenseStatus,deliverers,type ReportedExpense,type FarmPurchase,type PurchaseData,type PurchaseLine} from '@/lib/farm-purchases';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {farmManagerPrefix} from '@/lib/dashboard-navigation';
import {FarmProcurementTasks} from './FarmProcurementTasks';
import {subtractMoney,formatExactCurrency} from '@/lib/money';
import {FarmPhotoPicker} from './FarmPhotoPicker';
import {FarmRecordEvidence} from './FarmRecordEvidence';
import {FarmRecordDiscussion,FarmRecordThread} from './FarmRecordThread';
import {CashPayerSelect} from './CashPartySelect';
const input='mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const button='min-h-11 rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50';
const emptyLine=()=>({description:'',quantity:'',unit_price:'',unit:'',destination:'other' as PurchaseLine['destination'],feed_type:'fish',feed_source:'local' as const,item_id:'',batch_id:''});
type Draft={date:string;supplier:string;description:string;category:string;lines:ReturnType<typeof emptyLine>[];amount:string;recipient:string;line_id:string;quantity:string;existing:string;included:string;reason:string;payer:string;source:string;fundingSource?:string;deliveredBy?:keyof typeof deliverers;deliveryNote?:string;limit:string;quote:boolean;mediaIds:string[];request_id:string};
function PurchaseForm({operation,order,paymentId,exception,admin=false,onSaved}:{operation:string;admin?:boolean;order?:FarmPurchase;paymentId?:string;exception?:PurchaseData["exceptions"][number];onSaved:(message:string)=>void}){
 const identity=useQueueIdentity(),send=useManagerFetch(),{submitOrQueue,isSyncing}=useOfflineSync();
 const key=identity?`farm-purchase-draft:${queueIdentityKey(identity)}:${operation}:${paymentId||order?.id||'new'}`:'';
 const [restored]=useState(()=>{
  const defaults:Draft={date:farmDateToday(),supplier:'',description:'',category:exception?.approval?.category||'other',lines:[emptyLine()],amount:'',recipient:'',line_id:'',quantity:'',existing:'',included:'',reason:'',payer:'',source:operation==='resolve_exception'?(exception?.matching_costs.length?'link':'post'):'owner_fund',fundingSource:exception?.approval?.expense_source||'',limit:'',quote:false,mediaIds:[],request_id:crypto.randomUUID()};
  try{
   const saved=key&&localStorage.getItem(key);if(!saved)return {draft:defaults,fault:false};
   const value=JSON.parse(saved) as Draft;
   if(!value||typeof value.request_id!=='string'||!Array.isArray(value.lines)||!value.lines.every(l=>l&&typeof l.description==='string')||!Array.isArray(value.mediaIds))throw Error();
   const draft={...defaults,...value};
   if(operation==='resolve_exception'&&draft.source==='owner_fund'&&!draft.line_id)draft.source=exception?.matching_costs.length?'link':'post';
   if(exception?.approval&&(!draft.fundingSource||draft.fundingSource==='later')){draft.fundingSource=defaults.fundingSource;draft.payer='';}
   return {draft,fault:false};
  }catch{return {draft:defaults,fault:true};}
 });
 const [draft,setDraft]=useState(restored.draft);
 const [verifiedPayer,setVerifiedPayer]=useState('');
 const knownSource=draft.fundingSource==='bimbo_transfer'||draft.fundingSource==='sales_cash';
 const approvingWithoutPayer=operation==='resolve_exception'&&draft.source==='post'&&!exception?.approval&&!draft.payer;
 const payerRequired=operation==='resolve_exception'&&draft.source==='post'&&!approvingWithoutPayer;
 const payerReady=knownSource&&!!draft.payer&&draft.payer===verifiedPayer;
 const decision=approvingWithoutPayer?'approve_awaiting_funding':draft.source==='post'?'post':draft.source==='decline'?'decline':'link';
 const decisionLabel={
  approve_awaiting_funding:draft.fundingSource==='later'?'Approve and confirm funding later':'Approve expense',
  post:'Record approved expense',decline:'Decline report',link:'Link recorded expense',
 }[decision];
 const [receipts,setReceipts]=useState<{id:string;date:string;quantity:string;notes:string|null}[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[choices,setChoices]=useState<{supplies:{id:string;item_name:string;unit:string}[];batches:{id:string;name:string}[]}>({supplies:[],batches:[]});
 useEffect(()=>{if(key&&!restored.fault)try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError('Draft storage unavailable. Keep these details until sending succeeds.');}},[key,draft,restored.fault]);
 useEffect(()=>{if(operation!=='request')return;const controller=new AbortController();Promise.all(['/api/farm/supplies?all=1','/api/farm/batch-records'].map(url=>send(url,{signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Store choices unavailable');return b;}))).then(([s,b])=>{if(!controller.signal.aborted)setChoices({supplies:Array.isArray(s)?s:s.data||[],batches:b.batches||[]});}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,operation]);
 useEffect(()=>{if(operation!=='delivery'||!draft.line_id)return;const controller=new AbortController();send(`/api/farm/purchases?line_id=${draft.line_id}`,{signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Receipt history unavailable');if(!controller.signal.aborted)setReceipts(b.data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,operation,draft.line_id]);
 const update=(name:keyof Draft,value:Draft[keyof Draft])=>setDraft(d=>({...d,[name]:value}));
 const dateField=<label className="block text-sm font-medium">Actual date<input className={input} type="date" max={farmDateToday()} value={draft.date} required onChange={e=>update('date',e.target.value)}/></label>;
 const text=(name:'supplier'|'description'|'amount'|'recipient'|'quantity'|'reason'|'limit',label:string,required=true)=><label className="block text-sm font-medium">{label}<input className={input} value={draft[name]} required={required} maxLength={name==='description'?4000:2000} inputMode={['amount','quantity','limit'].includes(name)?'decimal':undefined} onChange={e=>update(name,e.target.value)}/></label>;
 const resource=operation==='request'?'farm_purchases':operation==='payment'?'farm_purchase_payments':operation==='delivery'?'farm_purchase_deliveries':'farm_purchase_exceptions';
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{
  let payload:Record<string,unknown>;
  if(operation==='request')payload={date:draft.date,supplier:draft.supplier,description:draft.description,category:draft.category,lines:draft.lines.map(l=>({description:l.description,quantity:l.quantity,unit_price:l.unit_price,unit:l.destination==='feed'?'bags':l.unit,destination:l.destination,...(l.destination==='feed'?{feed_type:l.feed_type,feed_source:l.feed_source}:l.destination==='supply'?{item_id:l.item_id}:l.destination==='livestock'?{batch_id:l.batch_id}:{})}))};
  else if(operation==='payment')payload={date:draft.date,amount:draft.amount,recipient:draft.recipient,expense_source:order?.category==='feed'?'owner_fund':draft.source,...(draft.payer==='review'?{cash_payer_review:true}:draft.payer?{cash_payer_account_id:draft.payer}:{})};
  else if(operation==='delivery')payload={date:draft.date,line_id:draft.line_id,quantity:draft.quantity,delivered_by:draft.deliveredBy,notes:draft.deliveryNote||undefined,...(admin?{reason:draft.reason}:{}),...(draft.existing?{existing_movement_id:draft.existing}:{}),...(draft.included?{included_in_starting_count:draft.included==='yes'}:{})};
  else if(operation==='exception')payload={date:draft.date,supplier:draft.supplier,amount:draft.amount,description:draft.description};
  else if(operation==='resolve_exception'){
   if(decision==='post'&&!payerReady)throw Error('Choose a verified payer for this expense.');
   payload={decision,reason:draft.reason,...(decision==='approve_awaiting_funding'?{category:draft.category,...(knownSource?{expense_source:draft.fundingSource}:{})}:decision==='post'?{category:draft.category,expense_source:draft.fundingSource,cash_payer_account_id:draft.payer}:decision==='link'?{resource:draft.line_id.split(':')[0],record_id:draft.line_id.split(':')[1]}:{})};
  }
  else if(operation==='policy')payload={automatic_limit:draft.limit||null,require_quote:draft.quote};
  else payload={expected_revision:paymentId?order?.payments.find(p=>p.id===paymentId)?.revision:order?.revision,reason:draft.reason};
  const parsed=purchaseSchema.safeParse({operation:operation==='delivery'?'confirm_delivery':operation,payload,...(paymentId||order?{id:paymentId||order?.id}:{}),request_id:draft.request_id});
  if(!parsed.success)throw Error(parsed.error.issues[0]?.message||'Check the form');
  if(operation==='delivery'&&!draft.mediaIds.length)throw Error('Add a photo of the delivered goods');
  if(operation==='exception'&&!draft.mediaIds.length)throw Error('Add proof of the actual purchase');
  const result=await submitOrQueue('/api/farm/purchases',parsed.data,{mediaIds:draft.mediaIds});
  if(!result.success)throw Error(result.error);
  const item=identity?getPendingItems(identity).find(p=>p.requestId===draft.request_id):undefined;
  if(result.status==='needs_attention'&&!item?.fundingReview){
   throw Error(item?.conflict||'This entry needs attention. Your saved submission is available for review.');
  }
  if(key)localStorage.removeItem(key);
  onSaved(item?.fundingReview?'Approved. Confirm the funding to add this expense to both histories.':result.status!=='sent'?'Saved on this device. It will send when connected.':
   operation==='resolve_exception'?payload.decision==='approve_awaiting_funding'?(knownSource?'Approved. Confirm who paid to add it to recorded expenses.':'Approved. Funding still needs confirmation.'):payload.decision==='decline'?'Expense report declined.':'Expense recorded in both histories.':'Entry recorded.');
 }catch(e){setError(e instanceof Error?e.message:'Entry retained. Please retry.');}finally{setBusy(false);}}
 return <form onSubmit={submit}>{restored.fault&&<p role="alert" className="mb-3 text-red-800">This saved draft could not be read. It is still on this device. Close this window and reopen it after checking the browser storage.</p>}<fieldset disabled={busy||isSyncing||photoBusy||restored.fault} className="space-y-4">
  {['request','payment','delivery','exception'].includes(operation)&&dateField}
  {operation==='request'&&<>{text('supplier','Supplier')}{text('description','What is needed and why?')}<label className="block text-sm font-medium">Expense category<select aria-label="Expense category" className={input} value={draft.category} onChange={e=>update('category',e.target.value)}>{['feed','equipment','veterinary','repair','maintenance','other'].map(c=><option key={c}>{c}</option>)}</select></label>
   {draft.lines.map((line,index)=>{const change=(patch:Partial<typeof line>)=>update('lines',draft.lines.map((l,i)=>i===index?{...l,...patch}:l));return <fieldset key={index} className="space-y-3 rounded-xl border p-3"><legend className="px-1 text-sm font-semibold">Item {index+1}</legend>{(['description','quantity','unit_price'] as const).map(k=><label key={k} className="block text-sm">{k==='unit_price'?'Price per unit (NGN)':k==='description'?'Item description':'Quantity'}<input className={input} required value={line[k]} onChange={e=>change({[k]:e.target.value})}/></label>)}<label className="block text-sm">Where will this be recorded?<select aria-label="Where will this be recorded?" className={input} value={line.destination} onChange={e=>change({destination:e.target.value as PurchaseLine['destination']})}><option value="other">Delivery receipt only</option><option value="feed">Feed bags</option><option value="supply">Existing supply item</option><option value="livestock">Named livestock batch</option></select></label>
    {line.destination==='feed'?<><label className="block text-sm">Feed type<select aria-label="Feed type" className={input} value={line.feed_type} onChange={e=>change({feed_type:e.target.value})}>{['fish','goat','pig','chicken','turkey','cattle','other'].map(t=><option key={t}>{t}</option>)}</select></label><label className="block text-sm">Source<select aria-label="Source" className={input} value={line.feed_source} onChange={e=>change({feed_source:e.target.value as 'local'})}><option value="local">Local</option><option value="foreign">Imported</option></select></label></>:line.destination==='supply'?<label className="block text-sm">Supply item<select aria-label="Supply item" className={input} required value={line.item_id} onChange={e=>{const item=choices.supplies.find(s=>s.id===e.target.value);change({item_id:e.target.value,unit:item?.unit||''});}}><option value="">Choose existing item</option>{choices.supplies.map(s=><option key={s.id} value={s.id}>{s.item_name} ({s.unit})</option>)}</select></label>:<>{line.destination==='livestock'&&<label className="block text-sm">Named batch<select aria-label="Named batch" className={input} required value={line.batch_id} onChange={e=>change({batch_id:e.target.value})}><option value="">Choose batch</option>{choices.batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<label className="block text-sm">Unit<input className={input} required value={line.unit} onChange={e=>change({unit:e.target.value})}/></label></>}
    {draft.lines.length>1&&<button type="button" className={button} onClick={()=>update('lines',draft.lines.filter((_,i)=>i!==index))}>Remove unsent item</button>}</fieldset>;})}<button type="button" className={button} disabled={draft.lines.length>=50} onClick={()=>update('lines',[...draft.lines,emptyLine()])}>Add another item</button></>}
  {operation==='payment'&&<>{text('amount','Amount actually paid (NGN)')}{text('recipient','Supplier or person paid')}{order?.category!=='feed'&&<label className="block text-sm">Funding source<select aria-label="Funding source" className={input} value={draft.source} onChange={e=>update('source',e.target.value)}><option value="owner_fund">Owner funds</option><option value="sales_cash">Sales cash</option></select></label>}<CashPayerSelect business="farm" currency="NGN" bucket={draft.source==='sales_cash'&&order?.category!=='feed'?'sales':'owner'} value={draft.payer} onChange={v=>update('payer',v)}/><p className="text-xs text-slate-600">This records expenditure, not delivery. Insufficient confirmed funds go to the MD/Owner for review.</p></>}
  {operation==='delivery'&&<><label className="block text-sm">Delivered item<select aria-label="Delivered item" className={input} required value={draft.line_id} onChange={e=>update('line_id',e.target.value)}><option value="">Choose purchase line</option>{order?.lines.map(l=><option key={l.id} value={l.id}>{l.description}: {l.received_exact} of {l.quantity} {l.unit} received</option>)}</select></label><label className="block text-sm">Stock receipt<select aria-label="Stock receipt" className={input} value={draft.existing||''} onChange={e=>{const r=receipts.find(v=>v.id===e.target.value);setDraft(d=>({...d,existing:e.target.value,...(r?{quantity:r.quantity,date:r.date}:{})}));}}><option value="">Record a new delivery into stock</option>{receipts.map(r=><option key={r.id} value={r.id}>Already recorded: {r.date}, {r.quantity} {r.notes||''}</option>)}</select></label>{draft.existing&&<p className="text-xs text-emerald-800">Links this existing receipt without adding stock again. Keep its exact date and quantity.</p>}{text('quantity','Quantity physically received')}{!draft.existing&&order?.lines.find(l=>l.id===draft.line_id)?.destination==='feed'&&<label className="block text-sm">Was this delivery already included in the recorded starting count?<select aria-label="Was this delivery already included in the recorded starting count?" className={input} required value={draft.included} onChange={e=>update('included',e.target.value)}><option value="">Choose after checking</option><option value="no">No, add these newly received bags</option><option value="yes">Yes, already counted</option></select></label>}<label className="block text-sm">Delivered by<select required className={input} value={draft.deliveredBy||''} onChange={e=>update('deliveredBy',e.target.value)}><option value="">Choose who delivered</option>{Object.entries(deliverers).map(([key,name])=><option value={key} key={key}>{name}</option>)}</select></label><label className="block text-sm">Delivery notes (optional)<textarea className={input} maxLength={2000} value={draft.deliveryNote||''} onChange={e=>update('deliveryNote',e.target.value)}/></label>{admin&&text('reason','Who confirmed receipt on site?')}<p className="text-xs text-slate-600">Add a photo of the goods received. Remaining quantities stay open.</p></>}
  {operation==='exception'&&<>{text('supplier','Supplier')}{text('amount','Amount actually spent (NGN)')}{text('description','What happened and why approval was missing?')}<p className="text-xs text-amber-900">This preserves the dated report for the MD/Owner. It does not invent prior approval or post an unverified cost.</p></>}
  {operation==='policy'&&<>{text('limit','Automatic approval limit for the whole request (NGN)',false)}<p className="text-xs text-slate-600">Leave blank for manual approval of every purchase.</p><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.quote} onChange={e=>update('quote',e.target.checked)}/>Require a quotation photo</label></>}
  {operation==='resolve_exception'&&exception&&<>
   <div className="rounded-xl bg-emerald-50 p-3 text-sm"><strong>{exception.supplier} · {formatExactCurrency(exception.amount_exact,'NGN')}</strong><p>{expenseDate(exception.date)} · {exception.description}</p></div>
   <label className="block text-sm font-medium">Decision<select aria-label="Decision" className={input} value={draft.source==='owner_fund'?'link':draft.source} onChange={e=>update('source',e.target.value)}>
    <option value="post">{exception.approval?'Confirm funding and record expense':'Approve this expense'}</option>
    {exception.matching_costs.length>0&&<option value="link">Use an expense already recorded</option>}
    <option value="decline">Decline this report</option></select></label>
   {draft.source!=='post'&&draft.source!=='decline'&&<label className="block text-sm font-medium">Recorded expense<select aria-label="Recorded expense" className={input} required value={draft.line_id} onChange={e=>update('line_id',e.target.value)}>
    <option value="">Choose the matching payment</option>{exception.matching_costs.map(c=><option key={c.id} value={`${c.resource}:${c.id}`}>{c.label} ({c.resource==='farm_purchase_payments'?'Purchase payment':c.resource==='farm_feed_purchases'?'Feed purchase':'Expense'})</option>)}</select></label>}
   {draft.source==='post'&&<>
    {exception.matching_costs.length>0&&<p className="rounded-xl bg-amber-50 p-3 text-sm">A cost with this date and amount already exists. Choose “Use an expense already recorded” if it is the same payment.</p>}
    <label className="block text-sm font-medium">Expense category<select aria-label="Expense category" required className={input} value={draft.category==='other'?'':draft.category} onChange={e=>update('category',e.target.value)}>
     <option value="" disabled>Choose a category</option>{Object.entries({labor:'Labour',utilities:'Utilities',veterinary:'Veterinary',transport:'Transport',equipment:'Equipment',produce:'Farm produce'}).map(([c,label])=><option key={c} value={c}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium">How was it paid?<select aria-label="How was it paid?" required={!!exception.approval} className={input} value={draft.fundingSource||''} onChange={e=>{const fundingSource=e.currentTarget.value;setVerifiedPayer('');setError('');setDraft(d=>({...d,fundingSource,payer:''}));}}>
     <option value="">Choose the funding source</option><option value="bimbo_transfer">Owner funds</option><option value="sales_cash">Sales money</option>{!exception.approval&&<option value="later">Confirm the funding later</option>}</select></label>
    {knownSource?<CashPayerSelect business="farm" currency="NGN" bucket={draft.fundingSource==='sales_cash'?'sales':'owner'} expenseDate={exception.date} approvalStage={exception.approval?'confirm':'approve'} value={draft.payer} onChange={v=>update('payer',v)} onVerified={setVerifiedPayer}/>
     :!exception.approval&&<p className="text-sm text-slate-700">You can approve now and confirm the payment details later.</p>}
    {exception.approval&&!payerReady&&<p className="text-sm text-slate-700">This expense is approved. Confirm the actual payer to include it in the totals. <Link className="font-semibold underline" href={'/dashboard/funds?business=farm&from='+exception.date+'&to='+exception.date+(exception.period_id?'&period_id='+encodeURIComponent(exception.period_id):'')}>Open Farm Funds</Link></p>}
   </>}
  </>}
  {['approve','decline','cancel','void_payment','resolve_exception'].includes(operation)&&text('reason','Reason for this decision')}
  {['request','payment','delivery','exception'].includes(operation)&&<FarmPhotoPicker date={draft.date} resource={resource} value={draft.mediaIds} onChange={v=>update('mediaIds',v)} onBusyChange={setPhotoBusy}/>}
  {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}<button className={button+' w-full bg-emerald-900 text-white'} disabled={payerRequired&&!payerReady} type="submit">{busy?'Saving…':operation==='resolve_exception'?decisionLabel:'Save entry'}</button>
 </fieldset></form>;
}
const expenseDate=(date:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
const primary=button+' bg-emerald-900 text-white';
const statusBadge=(status:string)=>'inline-block rounded-lg px-2 py-1 text-sm font-semibold '+(status==='approved'?'bg-emerald-50 text-emerald-950':status==='declined'?'bg-rose-50 text-rose-900':status==='cancelled'?'bg-slate-100 text-slate-700':'bg-amber-50 text-amber-950');
export function ReportedExpenses({reports,admin=false,onDecision,periodId,compact=false}:{reports:ReportedExpense[];admin?:boolean;onDecision?:(id:string)=>void;periodId?:string|null;compact?:boolean}){
 if(!reports.length)return null;
 const scope=periodId?'?period_id='+encodeURIComponent(periodId):'';
 return <section className="space-y-3">
  <h2 className="text-lg font-bold">{compact?'Expenses awaiting approval or funding':'Emergency expenses'}</h2>
  {reports.map(e=><article id={compact?undefined:'expense-'+e.id} key={e.id} className="scroll-mt-24 rounded-2xl border border-emerald-100 bg-white p-4">
   <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-base font-bold">{e.supplier}</h3><p className="text-sm text-slate-600">{expenseDate(e.date)}{e.reported_by_name&&' · '+e.reported_by_name}</p></div><strong className="text-lg">{formatExactCurrency(e.amount_exact,'NGN')}</strong></div>
   <p className="my-2 break-words text-sm">{e.description}</p><p className={statusBadge(e.resolution?(e.resolution.decision==='link'?'approved':'declined'):'pending')+' mb-2'}>{reportedExpenseStatus(e)}</p>
   {e.approval?.expense_source&&!e.resolution&&<p className="mb-2 text-sm">Funding source · {e.approval.expense_source==='bimbo_transfer'?'Owner funds':'Sales money'}</p>}
   {e.approval&&!e.resolution&&!compact&&<p className="mb-2 text-sm text-slate-600">{e.approval.reason}</p>}
   {e.resolution&&<p className="text-sm text-slate-600">{e.resolution.reason}</p>}
   {!e.resolution&&<div className="flex flex-wrap gap-2">
    {compact?<Link className={button+' inline-flex items-center'} href={(admin?'/dashboard/farm/purchases':'/purchases')+scope+'#expense-'+e.id}>View expense report</Link>
     :admin&&e.funding_status==='pending'?<Link className={primary+' inline-flex items-center'} href={'/dashboard/funds?business=farm'+(periodId?'&period_id='+encodeURIComponent(periodId):'')}>Review funding</Link>
     :admin&&onDecision?<button className={primary} onClick={()=>onDecision(e.id)}>{e.approval?'Confirm funding and record expense':'Approve and record expense'}</button>:null}
   </div>}
   {!compact&&<div className="mt-3 space-y-2"><FarmRecordEvidence resource="farm_purchase_exceptions" recordId={e.id}/><FarmRecordDiscussion resource="farm_purchase_exceptions" recordId={e.id}/></div>}
  </article>)}
 </section>;
}
export function FarmPurchases({admin=false,expenses=false,onRead}:{admin?:boolean;expenses?:boolean;onRead?:(data:PurchaseData)=>void}){
 const refresh=useFarmRecordRefresh(),managerBase=farmManagerPrefix(usePathname());

 const send=useManagerFetch(),identity=useQueueIdentity(),period=useManagerPeriod(),[data,setData]=useState<PurchaseData|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[selected,setSelected]=useState<string|null>(null),[operation,setOperation]=useState(''),[payment,setPayment]=useState<string>(),[notice,setNotice]=useState(''),[showCancelled,setShowCancelled]=useState(false);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('farm-records-synced',refresh);window.addEventListener('farm-pending-changed',refresh);return()=>{window.removeEventListener('farm-records-synced',refresh);window.removeEventListener('farm-pending-changed',refresh);};},[]);
 useEffect(()=>{const controller=new AbortController();setError('');send('/api/farm/purchases',{signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok||!Array.isArray(body.purchases)||!Array.isArray(body.exceptions))throw Error(body.error||'Purchases unavailable');if(!controller.signal.aborted){setData(body);onRead?.(body);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,version,refresh,onRead]);
 const order=data?.purchases.find(p=>p.id===selected),pending=identity?getPendingItems(identity).filter(p=>p.endpoint==='/api/farm/purchases'):[];
 const openedHash=useRef('');
 useEffect(()=>{const hash=window.location.hash;if(!data||!hash.startsWith('#expense-')||openedHash.current===hash)return;const card=document.getElementById(hash.slice(1));if(card){openedHash.current=hash;card.scrollIntoView({block:'center'});}},[data]);
 const act=(op:string,id?:string)=>{setPayment(id);setOperation(op);};
 const newIds=new Set((data?.procurement_tasks||[]).map(t=>t.order_id).filter(Boolean));
 const workflowOrder=!!order&&newIds.has(order.id);
 let legacyDraft=false;if(identity)try{const raw=localStorage.getItem('farm-purchase-draft:'+queueIdentityKey(identity)+':request:new');if(raw){const d=JSON.parse(raw);legacyDraft=!!(d.description||d.supplier||d.mediaIds?.length||d.lines?.some((l:{description:string})=>l.description));}}catch{legacyDraft=true;}
 return <div className="mx-auto max-w-5xl space-y-4 text-slate-950"><div className="flex flex-wrap items-center justify-between gap-3">
  <div><h2 className="text-xl font-bold">{expenses?'Emergency expenses and requests':admin?'Purchases and deliveries':'Purchased Item Confirmation / Deliveries'}</h2><p className="text-sm text-slate-600">{expenses?'Use Operational Requests before buying. Report an emergency expense if it was already paid.':'Open a purchase to check what was ordered and what arrived.'}</p></div>
  <div className="flex flex-wrap gap-2">{!admin&&<Link className={primary+' inline-flex items-center'} href={managerBase+'/operational-requests'}>Operational Requests</Link>}{legacyDraft&&<button className={button} onClick={()=>{setSelected(null);act('request');}}>Continue earlier purchase draft</button>}<button className={button} onClick={()=>{setSelected(null);act('exception');}}>Report emergency expense</button>{admin&&<button className={button} onClick={()=>{setSelected(null);act('policy');}}>Approval settings</button>}</div></div>
 {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm">{notice}</p>}{pending.map(p=><p role="status" key={p.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">{p.conflict||'Saved on phone, upload pending. Do not enter this purchase again.'}</p>)}
 {error?<p role="alert">{error}<button className={button+' ml-2'} onClick={()=>setVersion(v=>v+1)}>Retry</button></p>:!data?<p role="status">Loading requests…</p>:<>
  {!expenses&&<FarmProcurementTasks data={data} admin={admin} onReceive={id=>{setSelected(id);setOperation('');}} onSaved={m=>{setNotice(m);setVersion(v=>v+1);}}/>}
  <ReportedExpenses reports={data.exceptions} admin={admin} periodId={period?.periodId} onDecision={id=>{setSelected(null);act('resolve_exception',id);}}/>
  {data.policy?.automatic_limit&&<p className="text-sm text-slate-600">Automatic purchase approval limit · {formatExactCurrency(String(data.policy.automatic_limit),'NGN')}</p>}
  <div className="space-y-2">
   {data.purchases.filter(p=>!newIds.has(p.id)&&(showCancelled||p.status!=='cancelled')).map(p=><article key={p.id} className="rounded-2xl border bg-white p-4">
    <button className="block min-h-11 w-full text-left" onClick={()=>{setSelected(p.id);setOperation('');}}><span className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0 break-words font-bold">{p.description}</span><strong className="text-lg">{formatExactCurrency(p.total_exact,'NGN')}</strong></span>
     <span className="mt-1 block text-sm text-slate-600">{expenseDate(p.date)}{p.requested_by_name&&' · '+p.requested_by_name} · {p.supplier}</span>
     <span className={statusBadge(p.status)+' mt-2 capitalize'}>{p.status}</span><span className="ml-2 text-sm">Paid {formatExactCurrency(p.paid_exact,'NGN')}</span>
    </button><FarmRecordEvidence resource="farm_purchases" recordId={p.id}/>
   </article>)}
   {!data.purchases.some(p=>showCancelled||p.status!=='cancelled')&&!data.procurement_tasks?.length&&<p className="rounded-xl border bg-white p-4 text-sm">No purchases awaiting delivery.</p>}
  </div>
  {data.purchases.some(p=>p.status==='cancelled')&&<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showCancelled} onChange={e=>setShowCancelled(e.target.checked)}/>Show cancelled purchases</label>}
 </>}
 <Dialog open={!!selected||!!operation} onOpenChange={open=>{if(!open){setSelected(null);setOperation('');}}}><DialogContent><DialogTitle className="pr-10">{operation?({request:'Request purchase',payment:'Record actual payment',delivery:'Confirm delivery',approve:'Approve purchase',decline:'Decline purchase',cancel:'Cancel purchase',void_payment:'Void payment',policy:'Approval settings',resolve_exception:'Review emergency expense',exception:'Report emergency expense'}[operation]):order?.supplier}</DialogTitle><DialogDescription>{order?`${order.date} · ${order.description}`:operation==='resolve_exception'?'Review the original amount, date and funding.':'Enter the actual details.'}</DialogDescription>
 {operation?<ManagerPeriodProvider business="farm" periodId={admin&&operation==='delivery'?order?.period_id||period?.periodId||undefined:period?.periodId||undefined}><PurchaseForm admin={admin} key={`${operation}:${selected}:${payment}`} operation={operation} order={order} paymentId={payment} exception={data?.exceptions.find(e=>e.id===payment)} onSaved={message=>{setSelected(null);setOperation('');setNotice(message);setVersion(v=>v+1);}}/></ManagerPeriodProvider>:order&&<div className="space-y-4 text-sm"><p>{order.status} · Remaining payment {formatExactCurrency(subtractMoney(order.total_exact,order.paid_exact),'NGN')}</p>{order.decision_reason&&<p>{order.decision_reason}</p>}<ul className="divide-y">{order.lines.map(l=><li key={l.id} className="py-2">{l.description}: {l.received_exact} / {l.quantity} {l.unit} received</li>)}</ul><div className="flex flex-wrap gap-2">{admin&&order.status==='pending'&&<><button className={button} onClick={()=>act('approve')}>Approve</button><button className={button} onClick={()=>act('decline')}>Decline</button></>}{order.status==='approved'&&!workflowOrder&&<button className={button} onClick={()=>act('payment')}>Record payment</button>}{order.status==='approved'&&order.lines.some(l=>Number(l.received_exact)<Number(l.quantity))&&<button className={button} onClick={()=>act('delivery')}>Confirm goods received</button>}{admin&&order.status!=='cancelled'&&<button className={button} onClick={()=>act('cancel')}>Cancel purchase</button>}</div><h3 className="font-semibold">Payments</h3>{!order.payments.length&&<p>No payments posted.</p>}{order.payments.map(p=><div key={p.id} className="rounded-lg border p-3"><p>{p.date} · {p.recipient} · {formatExactCurrency(p.amount_exact,'NGN')}{p.voided_at?' · Voided':''}</p><FarmRecordEvidence resource="farm_purchase_payments" recordId={p.id}/>{admin&&!p.voided_at&&<button className={button+' mt-2'} onClick={()=>act('void_payment',p.id)}>Void with reason</button>}</div>)}<h3 className="font-semibold">Deliveries</h3>{!order.deliveries.length&&<p>No deliveries confirmed.</p>}{order.deliveries.map(d=><div key={d.id}><p>{d.date} · {order.lines.find(l=>l.id===d.line_id)?.description} · {d.quantity}{d.delivered_by?' · Delivered by '+deliverers[d.delivered_by]:''}</p>{d.notes&&<p>{d.notes}</p>}<FarmRecordEvidence resource="farm_purchase_deliveries" recordId={d.id}/></div>)}<FarmRecordThread resource="farm_purchases" recordId={order.id}/></div>}
 </DialogContent></Dialog></div>;
}
