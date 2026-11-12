"use client";
import Link from 'next/link';
import {FarmCustomerPicker} from '@/components/manager/FarmCustomerPicker';
import {useManagerFetch,useManagerPeriod} from "@/contexts/ManagerPeriodContext";
import {useFarmFinancialSubmission} from "@/hooks/useFarmFinancialSubmission";
import {CashReceiverSelect,selectedCashReceiver} from "@/components/manager/CashPartySelect";

import { formatCurrency } from "@/lib/utils";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EGG_SALE_PRODUCT, FARM_PRODUCTS, FarmProduct, farmDateToday } from "@/lib/farm-products";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

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

type SaleDraft={amountReceived?:string;paymentDate?:string;customerId?:string;credit?:boolean;form:FormValues;batchId?:string;eggBatchId?:string;stockGroup:string;receiver:string};

export default function SaleProductPage() {
 const managerFetch=useManagerFetch();
  const { product } = useParams<{ product: string }>();
  const router = useRouter();
  const eggsOnly = product === 'eggs';
  const selectedProduct = eggsOnly ? EGG_SALE_PRODUCT : FARM_PRODUCTS.find((item) => item.key === product);
  const productKey: Product = selectedProduct?.key === "eggs" ? "other" : selectedProduct?.key ?? "crops";
  const config = selectedProduct ?? FARM_PRODUCTS.find((item) => item.key === "crops")!;
  const [today, setToday] = useState("");

  const [customerId,setCustomerId]=useState(''),[credit,setCredit]=useState(false);
  const [amountReceived,setAmountReceived]=useState(''),[paymentDate,setPaymentDate]=useState('');
  const [batchId,setBatchId]=useState('');
  const [eggBatchId,setEggBatchId]=useState('');
  useEffect(()=>{if(productKey==='other')setEggBatchId(new URLSearchParams(window.location.search).get('egg_batch')||'');},[productKey,eggsOnly]);
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
  const scope=useManagerPeriod(),personal=scope?.mode==="personal",submission=useFarmFinancialSubmission<SaleDraft>("sale:"+productKey);
  const [receiver,setReceiver]=useState("");
  useEffect(()=>{if(!submission.pending)return;setForm(submission.pending.draft.form);setStockGroup(submission.pending.draft.stockGroup);setBatchId(submission.pending.draft.batchId||'');setEggBatchId(submission.pending.draft.eggBatchId||'');setReceiver(submission.pending.draft.receiver);setCustomerId(submission.pending.draft.customerId||'');setCredit(submission.pending.draft.credit||false);setAmountReceived(submission.pending.draft.amountReceived??'');setPaymentDate(submission.pending.draft.paymentDate||'');setRequestId(submission.pending.id);},[submission.pending]);


  useEffect(() => {
    const t = getTodayStr();
    setToday(t);
    setForm((prev) => ({ ...prev, date: t }));
  }, []);

  useEffect(() => {
    if (!form.date) return;
    managerFetch(`/api/farm/daily-record?date=${form.date}`)
      .then((r) => r.json())
      .then((d) => { setIsDayClosed(d.record?.status === "closed"); })
      .catch(() => {});
  }, [form.date,managerFetch]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Compute total
  const computedTotal = (() => {
    if (productKey === "catfish") {
      const kg = Number(form.kg);
      const rate = Number(form.amount_per_kg);
      return kg > 0 && rate > 0 ? kg * rate : 0;
    }
    const qty = Number(form.quantity);
    const price = Number(form.unit_price);
    return qty > 0 && price > 0 ? qty * price : 0;
  })();

  function validate(): string | null {
    if (!form.date) return "Select a date";
    if(!customerId&&!submission.pending)return "Choose a customer for this invoice";
    if((!credit||Number(amountReceived)>0)&&customerId&&!receiver)return "Choose who actually received the payment";
    if(credit&&(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountReceived)||Number(amountReceived)>=computedTotal))return "Enter the payment received, from zero to less than the sale total";
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
    if(received>0) rows.push({label:"Payment date",value:paymentDate||form.date});
    if (form.customer_name) rows.push({ label: "Customer", value: form.customer_name });
    return rows;
  })();

  async function handleConfirmedSave() {
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
        ...(customerId?{customer_id:customerId,credit,...(credit?{amount_received:amountReceived}:{}),payment_date:paymentDate||form.date}:{}),
        ...((!credit||Number(amountReceived)>0)&&(personal||customerId)?{cash_receiver:selectedCashReceiver(receiver)}:{}),
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

      const res = await submission.send("/api/farm/sales",[payload],{form,stockGroup,receiver,batchId,eggBatchId,customerId,credit,amountReceived,paymentDate},requestId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      const result = await res.json();
      const persistedSale = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!persistedSale || !Number.isFinite(Number(persistedSale.total_amount))) throw new Error("Sale response did not include saved total");
      setSavedItems((prev) => [...prev, { label: config.label, total: Number(persistedSale.total_amount) }]);
      setDirty(false);
      setRequestId(crypto.randomUUID());
      setForm((prev) => ({
        date: prev.date,
        quantity: "", kg: "", amount_per_kg: "", unit_price: "",
        crop_type: "", payment_method: prev.payment_method,
        customer_name: "", notes: "",
      }));
      setShowConfirm(false);setReceiver("");setCustomerId("");setCredit(false);setAmountReceived("");setPaymentDate("");
      toast.success("Sale recorded!");
    } catch (e) {
      if((e as Error).name==="AbortError")return;
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if(eggsOnly&&submission.pending&&!submission.pending.draft.eggBatchId)return <section className="rounded-xl border bg-white p-4"><h2 className="font-bold">Previous sale awaiting confirmation</h2><p className="mt-1 text-sm">Open the saved Other sale before starting another entry.</p><Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={typeof window!=="undefined"&&window.location.pathname.startsWith("/manager/")?"/manager/sales/other":"/sales/other"}>Open saved sale</Link></section>;
  if (!selectedProduct) return <p className="p-4">Unknown sale product. Choose a product from Sales.</p>;

  if (isDayClosed&&!submission.pending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <p className="text-lg font-bold text-gray-900 mb-1">Day is Closed</p>
        <p className="text-sm text-gray-500 mb-4">Records are locked for today.</p>
        <button onClick={() => router.push("/sales")} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#1b4332" }}>
          Back to Sales
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

      {submission.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{submission.error}</p>}
      {submission.pending&&<p className="rounded-xl bg-amber-50 p-4 text-sm">This sale is awaiting confirmation. Its original date and values are retained. Retry this saved sale before entering another here.</p>}
      <fieldset disabled={saving||!!submission.pending} className="min-w-0 space-y-4">
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

        <FarmCustomerPicker value={customerId} credit={credit} onChange={(id,name)=>{setCustomerId(id);updateField('customer_name',name);}} onCredit={v=>{setCredit(v);setAmountReceived(v?'0':'');}}/>
        {credit&&<label className="block text-sm font-semibold">Amount received now (NGN)<input aria-label="Amount received now" inputMode="decimal" className="mt-1 min-h-11 w-full rounded-xl border p-3" value={amountReceived} onChange={e=>setAmountReceived(e.target.value)}/><span className="text-sm font-normal">Enter 0 when nothing has been received.</span></label>}
        {(!credit||Number(amountReceived)>0)&&<CashReceiverSelect business="farm" value={receiver} onChange={setReceiver} disabled={saving||!!submission.pending}/>}
        {(!credit||Number(amountReceived)>0)&&<div>
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
        {(!credit||Number(amountReceived)>0)&&<label className="block text-sm font-semibold">Payment date<input aria-label="Payment date" type="date" min={form.date} max={today} className="mt-1 min-h-11 w-full rounded-xl border p-3" value={paymentDate||form.date} onChange={e=>setPaymentDate(e.target.value)}/></label>}
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
        <button onClick={handleSavePress}
          className="flex-1 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: config.color }}>
          {submission.pending?"Retry saved sale":"Save Sale"}
        </button>
        <button onClick={() => router.push("/sales")}
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
