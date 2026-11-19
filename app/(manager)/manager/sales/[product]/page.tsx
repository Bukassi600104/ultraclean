"use client";
import Link from 'next/link';
import {FarmCustomerPicker} from '@/components/manager/FarmCustomerPicker';
import {useManagerFetch,useManagerPeriod,useManagerStorageKey} from "@/contexts/ManagerPeriodContext";
import {useFarmFinancialSubmission} from "@/hooks/useFarmFinancialSubmission";
import {CashReceiverSelect,selectedCashReceiver} from "@/components/manager/CashPartySelect";
import {farmSupervisorChoice,isFarmReceiverChoice} from "@/lib/farm-payment-receiver";

import { formatCurrency } from "@/lib/utils";
import {formatExactCurrency,multiplyMoney,roundMoneyToCents,subtractMoney,sumMoney} from "@/lib/money";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EGG_SALE_PRODUCT, FARM_PRODUCTS, FarmProduct, farmDateToday } from "@/lib/farm-products";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import {z} from "zod";

import {FarmEggPicker} from '@/components/manager/FarmEggPicker';
import {FarmBatchPicker} from '@/components/manager/FarmBatchPicker';
import { LivestockGroupPicker } from "@/components/manager/LivestockGroupPicker";

type Product = FarmProduct;

interface FormValues {
  date: string;
  quantity: string;
  kg: string;              // catfish only
  amount_per_kg: string;   // catfish only
  unit_price: string;      // goat/chicken/crops
  crop_type: string;       // crops only
  payment_method: string;
  customer_name: string;
  notes: string;
}

function fmt(n: number) { return formatCurrency(n); }
function getTodayStr() { return farmDateToday(); }

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  config, summary, onConfirm, onCancel, saving,
}: {
  config: { label: string; color: string };
  summary: { label: string; value: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open onOpenChange={open=>{if(!open&&!saving)onCancel();}}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="pr-10">Confirm Sale — {config.label}</DialogTitle>
        </div>
        <DialogDescription>Customer payments go to their oldest unpaid invoices first. Check the final balance in Customers &amp; payments after saving.</DialogDescription>
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
          {summary.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5 even:bg-gray-50">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-700">
            Edit
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: config.color }}>
            {saving ? "Saving..." : "Confirm Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const formDraft=z.object({date:z.string(),quantity:z.string(),kg:z.string(),amount_per_kg:z.string(),unit_price:z.string(),crop_type:z.string(),payment_method:z.string(),customer_name:z.string(),notes:z.string()});
const creditRequestSchema=z.object({customerId:z.string().uuid(),key:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),id:z.string().uuid().optional()});
type CreditRequest=z.infer<typeof creditRequestSchema>;
const storedSale=z.object({
 requestId:z.string().uuid(),request:creditRequestSchema.nullable(),
 draft:z.object({form:formDraft,stockGroup:z.string(),receiver:z.string(),batchId:z.string(),eggBatchId:z.string(),customerId:z.string(),credit:z.boolean(),amountReceived:z.string().optional(),amountOwing:z.string().optional(),paymentDate:z.string()})
   .refine(d=>(d.amountReceived!==undefined)!==(d.amountOwing!==undefined))
});
type SaleDraft={amountReceived?:string;amountOwing?:string;paymentDate?:string;customerId?:string;credit?:boolean;form:FormValues;batchId?:string;eggBatchId?:string;stockGroup:string;receiver:string};

type CreditEntry = {basis:'paid'|'owing';value:string};
const validAmount = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const zeroAmount = /^0(?:\.0+)?$/;
function restoreCreditEntry(draft:Pick<SaleDraft,'amountReceived'|'amountOwing'>):CreditEntry {
  return draft.amountOwing!==undefined ? {basis:'owing',value:draft.amountOwing} : {basis:'paid',value:draft.amountReceived??''};
}

export default function SaleProductPage() {
 const {product}=useParams<{product:string}>(),scope=useManagerPeriod();
 return <SaleForm key={[scope?.actorId,scope?.periodId,scope?.mode,product].join(':')} product={product}/>;
}

function SaleForm({product}:{product:string}) {
 const managerFetch=useManagerFetch();
  const router = useRouter();
  const eggsOnly = product === 'eggs';
  const selectedProduct = eggsOnly ? EGG_SALE_PRODUCT : FARM_PRODUCTS.find((item) => item.key === product);
  const productKey: Product = selectedProduct?.key === "eggs" ? "other" : selectedProduct?.key ?? "crops";
  const config = selectedProduct ?? FARM_PRODUCTS.find((item) => item.key === "crops")!;
  const [today, setToday] = useState("");
  const [returnLink,setReturnLink]=useState({href:'/sales',label:'Back to Sales',savedOther:'/sales/other'});
  useEffect(()=>{
    const here=window.location.pathname,admin=here.startsWith('/dashboard/farm/'),source=new URLSearchParams(window.location.search);
    const base=admin?'/dashboard/farm':here.startsWith('/manager/')?'/manager':'';
    const query=new URLSearchParams();
    for(const key of ['from','to','period_id','manager_id']){const value=source.get(key);if(value)query.set(key,value);}
    const creditEntry=source.get('payment')==='credit',suffix=query.size?'?'+query:'';
    setReturnLink({href:base+(creditEntry?'/credit':'/sales')+suffix,label:creditEntry?'Back to Customers & payments':'Back to Sales',savedOther:base+'/sales/other'+suffix});
  },[]);

  const [customerId,setCustomerId]=useState(''),[credit,setCredit]=useState(false);
  const [creditEntry,setCreditEntry]=useState<CreditEntry>({basis:'paid',value:''}),[paymentDate,setPaymentDate]=useState('');
  const [batchId,setBatchId]=useState('');
  const [eggBatchId,setEggBatchId]=useState('');

  const [stockGroup,setStockGroup] = useState("");
  const [form, setForm] = useState<FormValues>({
    date: "",
    quantity: "",
    kg: "",
    amount_per_kg: "",
    unit_price: "",
    crop_type: "",
    payment_method: "cash",
    customer_name: "",
    notes: "",
  });
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [savedItems, setSavedItems] = useState<{ label: string; total: number }[]>([]);
  const [dirty, setDirty] = useState(false);
  const scope=useManagerPeriod(),personal=scope?.mode==="personal";
  const legacyView=scope?.mode==='legacy'&&scope.periodId&&scope.actorId!==scope.managerId?':view:'+scope.periodId:'';
  const submission=useFarmFinancialSubmission<SaleDraft>("sale:"+productKey+legacyView);
  const [receiver,setReceiver]=useState("");
  const [terms,setTerms]=useState<{customerId:string;days:number|null;outstanding:string|null}>({customerId:'',days:null,outstanding:null});
  const [creditRequest,setCreditRequest]=useState<CreditRequest|null>(null),[asking,setAsking]=useState(false),askLock=useRef(false);
  const [draftProblem,setDraftProblem]=useState(''),[restored,setRestored]=useState(false),draftFault=useRef(false);
  const draftKey=useManagerStorageKey(scope?.actorId?`farm-sale-draft:${scope.actorId}:${product}${legacyView}`:null);
  const approved=terms.customerId===customerId&&terms.days!==null&&terms.days>0;
  const emptyDay=getTodayStr();
  useEffect(()=>{
    setToday(emptyDay);
    setForm(prev=>prev.date?prev:{...prev,date:emptyDay});
  },[emptyDay]);

  useEffect(()=>{
    setRestored(false);draftFault.current=false;setDraftProblem('');
    if(!draftKey)return;
    try{
      const raw=localStorage.getItem(draftKey);
      if(raw){
        const stored=storedSale.parse(JSON.parse(raw)),d=stored.draft;
        setForm(d.form);setStockGroup(d.stockGroup);setBatchId(d.batchId||'');setEggBatchId(d.eggBatchId||'');
        setReceiver(isFarmReceiverChoice(d.receiver)?d.receiver:'');setCustomerId(d.customerId);setCredit(d.credit);setCreditEntry(restoreCreditEntry(d));
        setPaymentDate(d.paymentDate);setRequestId(stored.requestId);setCreditRequest(stored.request);setDirty(true);
      }else{
        const query=new URLSearchParams(window.location.search);
        if(productKey==='other')setEggBatchId(query.get('egg_batch')||'');
        if(query.get('payment')==='credit'){
          setCredit(true);setCreditEntry({basis:'paid',value:'0'});
          const customer=query.get('customer_id');
          if(customer&&z.string().uuid().safeParse(customer).success)setCustomerId(customer);
        }
      }
      setRestored(true);
    }catch{draftFault.current=true;setDraftProblem('Your device could not open the saved sale. Restore access to device storage before saving.');}
  },[draftKey,productKey]);
  const waitingDraft=useMemo(()=>({form,stockGroup,receiver,batchId,eggBatchId,customerId,credit,...(creditEntry.basis==='owing'?{amountOwing:creditEntry.value}:{amountReceived:creditEntry.value}),paymentDate}),[form,stockGroup,receiver,batchId,eggBatchId,customerId,credit,creditEntry,paymentDate]);
  const persistDraft=useCallback((request:CreditRequest|null)=>{
    if(!draftKey||!restored||draftFault.current)throw Error('Wait for your saved sale to load before continuing.');
    localStorage.setItem(draftKey,JSON.stringify({requestId,request,draft:waitingDraft}));
  },[draftKey,restored,requestId,waitingDraft]);
  useEffect(()=>{
    if(!dirty||!draftKey||!restored||draftFault.current||submission.pending)return;
    try{persistDraft(creditRequest);setDraftProblem('');}
    catch{setDraftProblem('The sale could not be saved on this device. Keep this page open and check storage.');}
  },[draftKey,restored,dirty,submission.pending,creditRequest,persistDraft]);
  async function askForTerms(){
    if(askLock.current||!customerId||!credit||approved)return;
    const request=creditRequest?.customerId===customerId?creditRequest:{key:crypto.randomUUID(),customerId,date:farmDateToday()};
    askLock.current=true;setAsking(true);setDraftProblem('');
    try{
      persistDraft(request);setCreditRequest(request);
      const response=await managerFetch('/api/farm/operational-requests',{method:'POST',headers:{'Content-Type':'application/json','X-Request-ID':request.key},body:JSON.stringify({
        request_date:request.date,category:'other',description:'Approve customer credit terms',request_id:request.key,
        request_details:{needed_on:request.date,why_needed:'The customer is buying on credit or paying part now.',items:[],credit_customer_id:customerId}
      })});
      const result=await response.json().catch(()=>null);
      if(!response.ok||!z.string().uuid().safeParse(result?.data?.id).success||result.data.request_details?.credit_customer_id!==customerId)throw Error(result?.error||'Request was not confirmed. Try again.');
      const saved={...request,id:result.data.id};setCreditRequest(saved);persistDraft(saved);
      window.dispatchEvent(new Event('farm-records-synced'));
    }catch(e){
      setDraftProblem(e instanceof DOMException?'The request could not be confirmed. Check your connection and device storage, then try again.':e instanceof TypeError?'The request could not be sent. Check your connection and try again.':e instanceof Error?e.message:'Request was not confirmed. Try again.');
    }
    finally{askLock.current=false;setAsking(false);}
  }
  useEffect(()=>{if(!submission.pending)return;setForm(submission.pending.draft.form);setStockGroup(submission.pending.draft.stockGroup);setBatchId(submission.pending.draft.batchId||'');setEggBatchId(submission.pending.draft.eggBatchId||'');setReceiver(submission.pending.draft.receiver);setCustomerId(submission.pending.draft.customerId||'');setCredit(submission.pending.draft.credit||false);setCreditEntry(restoreCreditEntry(submission.pending.draft));setPaymentDate(submission.pending.draft.paymentDate||'');setRequestId(submission.pending.id);},[submission.pending]);

  useEffect(() => {
    if (!form.date) return;
    const controller=new AbortController();
    setIsDayClosed(false);
    managerFetch(`/api/farm/daily-record?date=${form.date}`,{signal:controller.signal})
      .then((r) => r.json())
      .then((d) => { if(!controller.signal.aborted)setIsDayClosed(d.record?.status === "closed"); })
      .catch(() => {});
    return()=>controller.abort();
  }, [form.date,managerFetch]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const units=Number(productKey==='catfish'?form.kg:form.quantity);
  const unitPrice=Number(productKey==='catfish'?form.amount_per_kg:form.unit_price);
  const saleTotal=units>0&&unitPrice>0&&Number.isFinite(units*unitPrice)
    ? roundMoneyToCents(multiplyMoney(units,unitPrice)) : '0.00';
  const computedTotal=Number(saleTotal);
  const remainder=validAmount.test(creditEntry.value)?subtractMoney(saleTotal,creditEntry.value):'';
  const withinTotal=remainder!==''&&!remainder.startsWith('-');
  const amountReceived=creditEntry.basis==='paid'?creditEntry.value
    :withinTotal&&!zeroAmount.test(creditEntry.value)?remainder:'';
  const unpaidAmount=creditEntry.basis==='owing'?creditEntry.value:remainder;
  const validCredit=withinTotal&&!zeroAmount.test(unpaidAmount);
  const hasPayment=!credit||Number(amountReceived)>0;
  const waitingForSupervisor=hasPayment&&receiver===farmSupervisorChoice;

  function switchCreditEntry(){
    setCreditEntry({basis:creditEntry.basis==='paid'?'owing':'paid',value:withinTotal&&computedTotal>0?remainder:''});
  }

  function validate(): string | null {
    if (!form.date) return "Select a date";
    if(draftFault.current)return "Restore access to your saved sale before continuing";
    if(credit&&!approved)return "Request or check the approved credit terms before saving this sale";
    if(customerId&&terms.customerId!==customerId)return "Choose an available customer before saving";
    if(!customerId&&!submission.pending)return "Choose a customer for this invoice";
    if(credit&&!validCredit)return creditEntry.basis==='owing'
      ? "Enter the unpaid amount, above zero and up to the sale total."
      : "Enter the payment received, from zero to less than the sale total";
    if(hasPayment&&customerId&&!isFarmReceiverChoice(receiver))return "Choose who received the payment.";
    if(Number(amountReceived)>0&&paymentDate&&paymentDate<form.date)return "Payment date cannot be before this sale";
    if ((productKey === "crops" || (productKey === "other"&&!eggsOnly&&!eggBatchId)) && !form.crop_type.trim()) return "Enter crop type";
    if(eggsOnly&&!eggBatchId)return "Choose the poultry group that supplied the eggs";
    if(eggBatchId&&!Number.isInteger(Number(form.quantity)))return "Enter a whole egg count";
    if (productKey === "catfish") {
      if (!form.quantity || Number(form.quantity) <= 0) return "Enter number of fish";
      if (!form.kg || Number(form.kg) <= 0) return "Enter weight in kg";
      if (!form.amount_per_kg || Number(form.amount_per_kg) <= 0) return "Enter price per kg";
    } else {
      if (!form.quantity || Number(form.quantity) <= 0) return "Enter quantity";
      if (!form.unit_price || Number(form.unit_price) <= 0) return "Enter price";
    }
    return null;
  }

  function handleSavePress() {
    if(submission.pending){void handleConfirmedSave();return;}
    if(waitingForSupervisor)return;
    const err = validate();
    if (err) return toast.error(err);
    setShowConfirm(true);
  }

  // Build confirm summary
  const confirmSummary = (() => {
    const rows: { label: string; value: string }[] = [];
    rows.push({ label: "Date", value: form.date });
    if (productKey === "crops") rows.push({ label: "Crop Type", value: form.crop_type });
    if (productKey === "catfish") {
      rows.push({ label: "No. of Fish", value: form.quantity });
      rows.push({ label: "Weight (kg)", value: form.kg + " kg" });
      rows.push({ label: "Price per kg", value: fmt(Number(form.amount_per_kg)) });
    } else {
      const qtyLabel = eggBatchId ? "Whole eggs" : productKey === "cattle" ? "No. of Cattle" : productKey === "goat" ? "No. of Goats" : productKey === "chicken" ? "No. of Birds" : productKey === "pig" ? "No. of Pigs" : productKey === "turkey" ? "No. of Turkeys" : "Quantity";
      rows.push({ label: qtyLabel, value: form.quantity });
      rows.push({ label: "Price per unit", value: fmt(Number(form.unit_price)) });
    }
    rows.push({ label: "Total", value: fmt(computedTotal) });
    const received = credit ? Number(amountReceived) : computedTotal;
    rows.push({label:"Amount received with this sale",value:fmt(received)});
    if(credit&&validCredit)rows.push({label:"Unpaid amount from this sale",value:formatExactCurrency(unpaidAmount,'NGN')});
    if(received>0) rows.push({label:"Payment date",value:paymentDate||form.date});
    if (form.customer_name) rows.push({ label: "Customer", value: form.customer_name });
    return rows;
  })();

  async function handleConfirmedSave() {
    if (!submission.pending) {
      if(waitingForSupervisor){setShowConfirm(false);return;}
      const error = validate();
      if (error) {setShowConfirm(false);toast.error(error);return;}
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        date: form.date,
        product: eggsOnly?'eggs':productKey,
        ...(eggBatchId?{}:batchId?{batch_id:batchId}:{stock_group_id:stockGroup||null}),
        pricing_basis: config.pricingBasis,
        ...(productKey==='other'&&eggBatchId?{egg_batch_id:eggBatchId,other_product_name:'Eggs'}:{}),
        request_id: requestId,
        payment_method: form.payment_method,
        notes: form.notes.trim() || undefined,
        customer_name: customerId ? undefined : form.customer_name.trim() || undefined,
        ...(customerId?{customer_id:customerId,credit,...(credit?{amount_received:amountReceived}:{}),...(hasPayment?{payment_date:paymentDate||form.date}:{})}:{}),
        ...(hasPayment&&(personal||customerId)?{cash_receiver:selectedCashReceiver(receiver)}:{}),
      };

      if (productKey === "catfish") {
        payload.quantity = Number(form.quantity);
        payload.unit_price = Number(form.amount_per_kg);
        payload.weight_kg = Number(form.kg);
      } else {
        payload.quantity = Number(form.quantity);
        payload.unit_price = Number(form.unit_price);
        if (productKey === "crops" || (productKey === "other"&&!eggsOnly&&!eggBatchId)) payload.other_product_name = form.crop_type.trim();
      }

      const res = await submission.send("/api/farm/sales",[payload],waitingDraft,requestId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      const result = await res.json();
      const persistedSale = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!persistedSale || !Number.isFinite(Number(persistedSale.total_amount))) throw new Error("Sale response did not include saved total");
      if(draftKey)localStorage.removeItem(draftKey);
      setCreditRequest(null);
      setSavedItems((prev) => [...prev, { label: config.label, total: Number(persistedSale.total_amount) }]);
      setDirty(false);setDraftProblem('');
      setRequestId(crypto.randomUUID());
      setForm((prev) => ({
        date: prev.date,
        quantity: "", kg: "", amount_per_kg: "", unit_price: "",
        crop_type: "", payment_method: prev.payment_method,
        customer_name: "", notes: "",
      }));
      setShowConfirm(false);setReceiver("");setCustomerId("");setCredit(false);setCreditEntry({basis:"paid",value:""});setPaymentDate("");
      toast.success("Sale recorded!");
    } catch (e) {
      if((e as Error).name==="AbortError")return;
      setShowConfirm(false);
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if(eggsOnly&&submission.pending&&!submission.pending.draft.eggBatchId)return <section className="rounded-xl border bg-white p-4"><h2 className="font-bold">Previous sale awaiting confirmation</h2><p className="mt-1 text-sm">Open the saved Other sale before starting another entry.</p><Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={returnLink.savedOther}>Open saved sale</Link></section>;
  if (!selectedProduct) return <p className="p-4">Unknown sale product. Choose a product from Sales.</p>;

  if (isDayClosed&&!submission.pending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <p className="text-lg font-bold text-gray-900 mb-1">Day is Closed</p>
        <p className="text-sm text-gray-500 mb-4">{form.date} is closed. {dirty?"Your sale draft stays on this device. Ask the MD/Owner to review the original sale date.":"Ask the MD/Owner if a dated entry needs review."}</p>
        <button onClick={() => router.push(returnLink.href)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#1b4332" }}>
          {returnLink.label}
        </button>
      </div>
    );
  }

  const sessionTotal = savedItems.reduce((s, i) => s + i.total, 0);

  return (
    <div data-unsaved-changes={dirty} onChangeCapture={() => setDirty(true)} className="mx-auto w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: config.bg, borderLeft: `4px solid ${config.color}` }}>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: config.color }}>Recording Sale</p>
        <p className="text-2xl font-bold text-gray-900">{config.label}</p>
      </div>

      {/* Session tracker */}
      {savedItems.length > 0 && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p className="text-sm text-gray-600">{savedItems.length} sale{savedItems.length > 1 ? "s" : ""} recorded</p>
          <p className="font-bold text-green-700">{fmt(sessionTotal)}</p>
        </div>
      )}

      {draftProblem&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{draftProblem}</p>}
      {submission.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{submission.error}</p>}
      {submission.pending&&<p className="rounded-xl bg-amber-50 p-4 text-sm">This sale is awaiting confirmation. Its original date and values are retained. Retry this saved sale before entering another here.</p>}
      <fieldset disabled={saving||asking||draftFault.current||!!submission.pending} className="min-w-0 space-y-4">
      {/* Form */}
      {productKey==='other'&&<FarmEggPicker value={eggBatchId} onChange={setEggBatchId} eggsOnly={eggsOnly} quantity={form.quantity}/>}
      <FarmBatchPicker product={productKey} value={batchId} onChange={setBatchId} refreshKey={requestId}/>
      {!batchId&&<LivestockGroupPicker product={productKey} value={stockGroup} onChange={setStockGroup} refreshKey={requestId} />}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {/* 1. Date */}
        <div>
          <label htmlFor="sale-date" className="text-sm font-semibold text-slate-700">Date</label>
          <input id="sale-date" type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
            value={form.date} onChange={(e) => updateField("date", e.target.value)} />
        </div>

        {/* 2. Crops: crop type */}
        {(productKey === "crops" || (productKey === "other"&&!eggsOnly&&!eggBatchId)) && (
          <div>
            <label htmlFor="sale-crop" className="text-sm font-semibold text-slate-700">{productKey === "other" ? "Item name *" : "Crop Type *"}</label>
            <input id="sale-crop" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
              placeholder={productKey === "other" ? "Name the item sold" : "e.g. Maize, Cassava, Yam..."} value={form.crop_type} onChange={(e) => updateField("crop_type", e.target.value)} />
          </div>
        )}

        {/* 3a. Catfish: quantity + kg + price per kg */}
        {productKey === "catfish" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sale-quantity" className="text-sm font-semibold text-slate-700">No. of Fish *</label>
                <input id="sale-quantity" min={eggsOnly||eggBatchId?1:undefined} step={eggsOnly||eggBatchId?1:undefined} type="number" inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
                  placeholder="0" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
              </div>
              <div>
                <label htmlFor="sale-weight" className="text-sm font-semibold text-slate-700">Weight (kg) *</label>
                <input id="sale-weight" type="number" inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
                  placeholder="0.0" value={form.kg} onChange={(e) => updateField("kg", e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="sale-price" className="text-sm font-semibold text-slate-700">Amount per kg (₦) *</label>
              <input id="sale-price" type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.amount_per_kg} onChange={(e) => updateField("amount_per_kg", e.target.value)} />
            </div>
          </>
        )}

        {/* 3b. Goat/Chicken/Crops: quantity + unit price */}
        {productKey !== "catfish" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sale-quantity" className="text-sm font-semibold text-slate-700">
                {eggsOnly||eggBatchId ? "Whole eggs sold *" : productKey === "cattle" ? "No. of Cattle *" : productKey === "goat" ? "No. of Goats *" : productKey === "chicken" ? "No. of Birds *" : productKey === "pig" ? "No. of Pigs *" : productKey === "turkey" ? "No. of Turkeys *" : "Quantity *"}
              </label>
              <input id="sale-quantity" min={eggsOnly||eggBatchId?1:undefined} step={eggsOnly||eggBatchId?1:undefined} type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
            </div>
            <div>
              <label htmlFor="sale-price" className="text-sm font-semibold text-slate-700">
                {eggsOnly||eggBatchId ? "Price per egg (₦) *" : productKey === "cattle" ? "Price per Head (₦) *" : productKey === "goat" ? "Price per Goat (₦) *" : productKey === "chicken" ? "Price per Bird (₦) *" : productKey === "pig" ? "Price per Pig (₦) *" : productKey === "turkey" ? "Price per Turkey (₦) *" : "Price per Unit (₦) *"}
              </label>
              <input id="sale-price" type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.unit_price} onChange={(e) => updateField("unit_price", e.target.value)} />
            </div>
          </div>
        )}

        {productKey === "catfish" && <p className="text-sm text-slate-600">Fish count is removed from stock. Weight in kilograms determines the sale value.</p>}
        {/* Live total */}
        {computedTotal > 0 && (
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: config.bg }}>
            <p className="text-xs font-semibold" style={{ color: config.color }}>Total Amount</p>
            <p className="text-lg font-bold" style={{ color: config.color }}>{fmt(computedTotal)}</p>
          </div>
        )}

        <FarmCustomerPicker value={customerId} credit={credit} onChange={(id,name)=>{setCustomerId(id);setCreditRequest(null);updateField('customer_name',name);}} onCredit={v=>{setCredit(v);setCreditEntry({basis:'paid',value:v?'0':''});}} onTerms={setTerms} onRequest={()=>void askForTerms()} requestBusy={asking} requestId={creditRequest?.id} draftSaved={dirty&&restored&&!draftProblem}/>
        {credit&&<div className="space-y-2">
          <label className="block text-sm font-semibold">{creditEntry.basis==='paid'?'Amount received now':'Unpaid amount from this sale'} (NGN)
            <input aria-label={creditEntry.basis==='paid'?'Amount received now':'Unpaid amount from this sale'} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-xl border p-3" value={creditEntry.value} onChange={e=>setCreditEntry({...creditEntry,value:e.target.value})}/>
          </label>
          {creditEntry.basis==='owing'&&validCredit&&<p className="text-sm">Amount paid now <strong>{formatExactCurrency(amountReceived,'NGN')}</strong></p>}
          <button type="button" className="min-h-11 text-left text-sm font-semibold text-emerald-900 underline" onClick={switchCreditEntry}>{creditEntry.basis==='paid'?'Enter unpaid amount instead':'Enter amount paid instead'}</button>
        </div>}
        {credit&&terms.customerId===customerId&&terms.outstanding!==null&&validCredit&&<p className="rounded-xl bg-amber-50 p-3 text-sm">Customer balance after this sale: <strong>{formatExactCurrency(sumMoney([terms.outstanding,unpaidAmount]),'NGN')}</strong></p>}
        <CashReceiverSelect business="farm" paymentDate={paymentDate||form.date} value={receiver} onChange={setReceiver} hidden={!hasPayment} disabled={saving||!!submission.pending}/>
        {hasPayment&&<div>
          <label className="text-sm font-semibold text-slate-700">Payment Method</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {["cash", "transfer", "pos"].map((m) => (
              <button key={m} onClick={() => updateField("payment_method", m)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: form.payment_method === m ? config.color : "transparent",
                  borderColor: form.payment_method === m ? config.color : "#e5e7eb",
                  color: form.payment_method === m ? "#fff" : "#6b7280",
                }}>
                {m === "pos" ? "POS" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>}
        {hasPayment&&<label className="block text-sm font-semibold">Payment date<input aria-label="Payment date" type="date" min={form.date} max={today} className="mt-1 min-h-11 w-full rounded-xl border p-3" value={paymentDate||form.date} onChange={e=>setPaymentDate(e.target.value)}/></label>}
        {/* 6. Notes — optional */}
        <div>
          <label htmlFor="sale-notes" className="text-sm font-semibold text-slate-700">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input id="sale-notes" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-base focus:outline-none focus:border-gray-400"
            placeholder="Any extra info..." value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
        </div>
      </div>

      </fieldset>
      {/* Buttons */}
      <div className="flex gap-2">
        <button disabled={!submission.pending&&(asking||(credit&&!approved)||draftFault.current||waitingForSupervisor)} onClick={handleSavePress}
          className="flex-1 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: config.color }}>
          {submission.pending?"Retry saved sale":"Save Sale"}
        </button>
        <button onClick={() => router.push(returnLink.href)}
          className="rounded-2xl px-5 py-4 font-semibold text-sm border border-gray-200 text-gray-600">
          Done
        </button>
      </div>

      {/* Recent */}
      {savedItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Just Recorded</p>
          <div className="space-y-1.5">
            {[...savedItems].reverse().slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{fmt(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfirm && (
        <ConfirmDialog
          config={config}
          summary={confirmSummary}
          onConfirm={handleConfirmedSave}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
