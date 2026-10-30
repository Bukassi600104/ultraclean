"use client";
import {useQueueIdentity} from "@/contexts/ManagerPeriodContext";


import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LIVESTOCK_PRODUCTS, farmDateToday } from "@/lib/farm-products";
import { InventoryActivity } from "@/components/manager/InventoryActivity";
import { Skull, Check } from "lucide-react";

import {FarmBatchPicker} from '@/components/manager/FarmBatchPicker';
import {FarmPhotoPicker} from '@/components/manager/FarmPhotoPicker';
import {useOfflineSync} from '@/hooks/useOfflineSync';
import {getPendingItems,queueIdentityKey} from '@/lib/offline-storage';
import { LivestockGroupPicker } from "@/components/manager/LivestockGroupPicker";

const ANIMALS = LIVESTOCK_PRODUCTS.map((product) => ({ value: product.key, label: product.label }));

export default function MortalityPage() {
 const identity=useQueueIdentity(),{submitOrQueue}=useOfflineSync();
 const owner=identity?queueIdentityKey(identity):'',draftKey='farm-mortality-draft:'+owner;
 const [batchId,setBatchId]=useState(''),[mediaIds,setMediaIds]=useState<string[]>([]),[restored,setRestored]=useState(false),[draftError,setDraftError]=useState(''),[photoBusy,setPhotoBusy]=useState(false);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = farmDateToday();
    setToday(t);
    setDate(t);
  }, []);
  const [product, setProduct] = useState("catfish");
  const [stockGroup,setStockGroup] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cause, setCause] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(()=>{try{const raw=localStorage.getItem(draftKey);if(raw){const d=JSON.parse(raw);setDate(d.date);setProduct(d.product);setStockGroup(d.stockGroup);setBatchId(d.batchId||'');setQuantity(d.quantity);setCause(d.cause);setNotes(d.notes);setMediaIds(d.mediaIds||[]);setRequestId(d.requestId);setDirty(true);}}catch{setDraftError('Saved draft could not be read. Keep it for review.');}setRestored(true);},[draftKey]);
  useEffect(()=>{if(!restored||!owner||!dirty)return;try{localStorage.setItem(draftKey,JSON.stringify({date,product,stockGroup,batchId,quantity,cause,notes,mediaIds,requestId}));setDraftError('');}catch{setDraftError('Draft not saved on this phone. Keep this form open and restore device storage.');}},[restored,owner,dirty,draftKey,date,product,stockGroup,batchId,quantity,cause,notes,mediaIds,requestId]);
  const pending=identity?getPendingItems(identity).find(item=>item.requestId===requestId):undefined;
  useEffect(()=>{const complete=(event:Event)=>{if((event as CustomEvent).detail?.requestId!==requestId)return;localStorage.removeItem(draftKey);setRequestId(crypto.randomUUID());setMediaIds([]);setQuantity('');setCause('');setNotes('');setDirty(false);};window.addEventListener('farm-records-synced',complete);return()=>window.removeEventListener('farm-records-synced',complete);},[draftKey,requestId]);
  async function handleSave() {
    if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity)<=0) return toast.error('Enter a whole number of deaths');
    if (!mediaIds.length) return toast.error('Add a supporting photo before sending this mortality record');
    setSaving(true);
    try {
      const result=await submitOrQueue('/api/farm/inventory/transaction',{request_id:requestId,product,...(batchId?{batch_id:batchId}:{stock_group_id:stockGroup||null}),action:'mortality',quantity:Number(quantity),date,reason:cause.trim()||'Unknown',notes:notes.trim()||undefined},{mediaIds});
      if(!result.success)throw Error(result.error);
      const waiting=identity&&getPendingItems(identity).find(item=>item.requestId===requestId);
      if(waiting){toast.info(waiting.conflict||'Saved on this phone. Upload pending.');return;}
      localStorage.removeItem(draftKey);setRequestId(crypto.randomUUID());setMediaIds([]);setQuantity('');setCause('');setNotes('');setDirty(false);setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000);toast.success('Mortality recorded.');
    } catch(error){toast.error(error instanceof Error?error.message:'Record not sent. Your draft is retained.');}
    finally{setSaving(false);}
  }

  return (
    <div data-unsaved-changes={dirty} onChangeCapture={() => setDirty(true)} className="mx-auto max-w-lg space-y-4">
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: "#fee2e2", borderLeft: "4px solid #dc2626" }}>
        <Skull className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-red-600">Inventory</p>
          <p className="text-xl font-bold text-gray-900">Record Mortality</p>
          <p className="text-xs text-gray-500 mt-0.5">This will reduce your livestock count</p>
        </div>
      </div>

      <fieldset disabled={saving||!!pending||photoBusy} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label htmlFor="mortality-date" className="text-xs font-bold uppercase tracking-wider text-gray-500">Date of Death</label>
          <input id="mortality-date" type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            value={date} onChange={(e) => {setDate(e.target.value);setMediaIds([]);}} />
        </div>

        <FarmBatchPicker product={product} value={batchId} onChange={id=>{setBatchId(id);setMediaIds([]);}} refreshKey={requestId}/>
        {!batchId&&<LivestockGroupPicker product={product} value={stockGroup} onChange={setStockGroup} refreshKey={requestId} />}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Animal Type</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-3">
            {ANIMALS.map((a) => (
              <button key={a.value} onClick={() => {setProduct(a.value);setMediaIds([]);}}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: product === a.value ? "#dc2626" : "transparent",
                  borderColor: product === a.value ? "#dc2626" : "#e5e7eb",
                  color: product === a.value ? "#fff" : "#6b7280",
                }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="mortality-quantity" className="text-xs font-bold uppercase tracking-wider text-gray-500">Number of Deaths *</label>
          <input id="mortality-quantity" type="number" inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label htmlFor="mortality-cause" className="text-xs font-bold uppercase tracking-wider text-gray-500">Cause of Death</label>
          <input id="mortality-cause" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="e.g. Disease, Injury, Unknown" value={cause} onChange={(e) => setCause(e.target.value)} />
        </div>

        <div>
          <label htmlFor="mortality-notes" className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input id="mortality-notes" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <FarmPhotoPicker date={date} batchId={batchId||undefined} resource="farm_inventory_transactions" value={mediaIds} onBusyChange={setPhotoBusy} onChange={ids=>{setMediaIds(ids);setDirty(true);}}/>
      </fieldset>
      {draftError&&<p role="alert" className="text-sm text-red-700">{draftError}</p>}
      {pending&&<p role="status" className="rounded-xl border bg-amber-50 p-3 text-sm">{pending.conflict||'Saved on this phone. Upload pending. Keep this original dated entry for review.'}</p>}

      <button onClick={handleSave} disabled={saving||!!pending||photoBusy}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#dc2626" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Recorded!</> : saving ? "Saving..." : "Record Mortality"}
      </button>
      <InventoryActivity action="mortality" refreshKey={requestId} />
    </div>
  );
}
