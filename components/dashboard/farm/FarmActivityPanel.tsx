"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FARM_PRODUCTS } from "@/lib/farm-products";

type FarmRecord = Record<string, unknown>;
type Field = { key: string; label: string; numeric?: boolean; choices?: string[]; type?: string };
const fields: Record<string, Field[]> = {
  sale: [{key:"date",label:"Sale date",type:"date"},{key:"product",label:"Product",choices:FARM_PRODUCTS.map(p=>p.key)},{key:"quantity",label:"Inventory quantity",numeric:true},{key:"weight_kg",label:"Weight (kg)",numeric:true},{key:"unit_price",label:"Price per kg/head/unit",numeric:true},{key:"pricing_basis",label:"Pricing basis",choices:["per_kg","per_head","per_unit"]},{key:"customer_name",label:"Customer"},{key:"gender",label:"Gender",choices:["male","female"]},{key:"other_product_name",label:"Produce / other name"},{key:"payment_method",label:"Payment method",choices:["cash","transfer","pos"]},{key:"notes",label:"Notes"}],
  expense:[{key:"date",label:"Expense date",type:"date"},{key:"category",label:"Category",choices:["labor","utilities","veterinary","transport","equipment","produce"]},{key:"amount",label:"Amount (₦)",numeric:true},{key:"expense_source",label:"Paid from",choices:["bimbo_transfer","sales_cash"]},{key:"paid_to",label:"Paid to"},{key:"item_name",label:"Item"},{key:"payment_method",label:"Payment method",choices:["cash","transfer","pos"]},{key:"notes",label:"Notes"}],
  fund:[{key:"date",label:"Transfer date",type:"date"},{key:"amount",label:"Amount (₦)",numeric:true},{key:"notes",label:"Notes"}],
  inventory:[{key:"target_quantity",label:"Correct current quantity",numeric:true}],
  inventory_transaction:[{key:"date",label:"Record date",type:"date"},{key:"product",label:"Product",choices:FARM_PRODUCTS.map(p=>p.key)},{key:"quantity",label:"Correct quantity",numeric:true},{key:"notes",label:"Notes"}],
  supply:[{key:"item_name",label:"Supply name"},{key:"category",label:"Category"},{key:"unit",label:"Unit"},{key:"restock_threshold",label:"Restock threshold",numeric:true},{key:"quantity_change",label:"Quantity adjustment (+ add / − remove)",numeric:true},{key:"notes",label:"Notes"}],
  supply_transaction:[{key:"quantity_change",label:"Correct signed quantity (+ purchase / − use)",numeric:true}],
  feed:[{key:"date",label:"Purchase date",type:"date"},{key:"feed_type",label:"Feed type",choices:["fish","goat","chicken","pig","turkey","cattle","other"]},{key:"feed_source",label:"Feed source",choices:["local","foreign"]},{key:"weight_unit",label:"Weight unit",choices:["tons","kg"]},{key:"weight_amount",label:"Weight",numeric:true},{key:"num_bags",label:"Bags",numeric:true},{key:"cost",label:"Cost (₦)",numeric:true},{key:"notes",label:"Notes"}],
  daily_feed:[{key:"date",label:"Date",type:"date"},{key:"feed_type",label:"Feed type",choices:["fish","goat","chicken","pig","turkey","cattle","other"]},{key:"feed_source",label:"Feed source",choices:["local","foreign"]},{key:"num_bags",label:"Bags",numeric:true},{key:"notes",label:"Notes"}],
};
function label(value: string) { return value.replace(/_/g," "); }
function timestamp(value: string) { return new Date(value).toLocaleString("en-GB",{timeZone:"Africa/Lagos",hour12:false})+" (Lagos)"; }

export function FarmAdminCorrection({recordType,record,onSaved,requestId}:{recordType:string;record:object;onSaved?:()=>void;requestId?:string}) {
  const row=record as FarmRecord;
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);
  const [reason,setReason]=useState("");const [values,setValues]=useState<Record<string,string>>({});
  const [operation,setOperation]=useState("update");const [retryId,setRetryId]=useState("");
  const editFields=recordType==='sale'&&!row.pricing_basis
    ? [...fields.sale.filter(f=>f.key!=="pricing_basis"),{key:"total_amount",label:"Historical recorded amount (₦)",numeric:true}]
    : fields[recordType]??[];
  function start() {
    setValues(Object.fromEntries(editFields.map(f=>[f.key,String(f.key==='target_quantity'?row.current_stock??0:f.key==='quantity_change'&&recordType==='supply'?0:row[f.key]??"")])));
    setReason("");setOperation("update");setRetryId(crypto.randomUUID());setOpen(true);
  }
  async function save() {
    if(!reason.trim())return toast.error("Enter a correction reason");
    const changes:FarmRecord={expected_revision:row.revision??0};
    if(recordType==='inventory')changes.expected_current_stock=Number(row.current_stock);
    if(operation==='update')for(const field of editFields){
      const value=values[field.key]??"";
      if(value==="") { if(["notes","customer_name","gender","other_product_name","paid_to","item_name","weight_kg","restock_threshold"].includes(field.key))changes[field.key]=null; continue; }
      if(field.numeric&&!Number.isFinite(Number(value)))return toast.error("Enter valid numeric values");
      changes[field.key]=field.numeric?Number(value):value;
    }
    setSaving(true);
    try{
      const response=await fetch(requestId?`/api/farm/corrections/${requestId}`:"/api/farm/corrections/admin",{
        method:requestId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(requestId
          ?{action:"apply",operation,changes,reason:reason.trim(),request_id:retryId}
          :{record_type:recordType,record_id:row.id,operation,changes,reason:reason.trim(),request_id:retryId}),
      });
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Correction failed");
      toast.success("Correction saved with activity history");setOpen(false);onSaved?.();
    }catch(error){toast.error(error instanceof Error?error.message:"Correction failed");}finally{setSaving(false);}
  }
  if(row.voided_at||row.archived_at)return null;
  return <><Button variant="outline" size="sm" onClick={start}>{requestId?"Review and apply":"Correct"}</Button>
    <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value);}}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Correct {label(recordType)}</DialogTitle></DialogHeader>
      <p className="text-sm text-gray-500">The change and its original values will remain in activity history.</p>
      {recordType==='sale'&&!row.pricing_basis&&<p className="text-sm text-gray-500">This is a legacy sale. Its historical amount and stock movements are preserved unless you explicitly correct the amount.</p>}
      <Label>Action<select className="block border rounded p-2 w-full mt-1" value={operation} onChange={e=>{setOperation(e.target.value);setRetryId(crypto.randomUUID());}}><option value="update">Correct details</option>{['sale','expense','fund'].includes(recordType)&&<option value="void">Void record</option>}{recordType==='supply'&&<option value="archive">Remove from active supplies</option>}</select></Label>
      {operation==='update'&&editFields.map(field=><div key={field.key}><Label htmlFor={`correct-${field.key}`}>{field.label}</Label>{field.choices?<select id={`correct-${field.key}`} className="block border rounded p-2 w-full" value={values[field.key]??""} onChange={e=>{setValues({...values,[field.key]:e.target.value});setRetryId(crypto.randomUUID());}}><option value="">Unspecified</option>{Array.from(new Set([...field.choices,...(values[field.key]?[values[field.key]]:[])])).map(value=><option key={value} value={value}>{label(value)}</option>)}</select>:<Input id={`correct-${field.key}`} type={field.numeric?"number":field.type??"text"} step={field.numeric?"any":undefined} value={values[field.key]??""} onChange={e=>{setValues({...values,[field.key]:e.target.value});setRetryId(crypto.randomUUID());}}/>}</div>)}
      <Label>Reason<Textarea value={reason} maxLength={1000} onChange={e=>{setReason(e.target.value);setRetryId(crypto.randomUUID());}}/></Label>
      <Button disabled={saving} onClick={save}>{saving?"Saving...":"Save correction"}</Button>
    </DialogContent></Dialog></>;
}

type RequestRow={id:string;record_type:string;record_id:string;requested_at:string;status:string;reason:string;requested_change:FarmRecord;current_record:FarmRecord|null;requester_name?:string};
type ActivityRow={id:string;record_type:string;operation:string;record_date?:string;happened_at:string;reason?:string;actor?:{name?:string};actor_id:string;before_value:FarmRecord|null;after_value:FarmRecord|null};
export function FarmActivityPanel({onSaved}:{onSaved?:()=>void} = {}){
  const [open,setOpen]=useState(false);const [requests,setRequests]=useState<RequestRow[]>([]);const [activity,setActivity]=useState<ActivityRow[]>([]);const [loading,setLoading]=useState(false);const [page,setPage]=useState(1);const [hasMore,setHasMore]=useState(false);
  async function load(nextPage=1){setLoading(true);try{
    const responses=await Promise.all([fetch(`/api/farm/corrections?page=${nextPage}`),fetch(`/api/farm/activity?page=${nextPage}`)]);
    const [r,a]=await Promise.all(responses.map(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}));
    setRequests(nextPage===1?r.data:[...requests,...r.data]);setActivity(nextPage===1?a.data:[...activity,...a.data]);setPage(nextPage);setHasMore(nextPage*30<Math.max(r.total,a.total));
  }catch(error){toast.error(error instanceof Error?error.message:"Unable to load farm history");}finally{setLoading(false);}}
  async function decline(request:RequestRow){const reason=window.prompt("Reason for declining this correction");if(!reason?.trim())return;
    const response=await fetch(`/api/farm/corrections/${request.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"decline",reason,request_id:crypto.randomUUID()})});const data=await response.json();if(!response.ok)return toast.error(data.error);await load();}
  return <section className="border rounded-xl p-4 bg-white"><Button variant="outline" onClick={()=>{setOpen(!open);if(!open)void load();}}> {open?"Hide Activity":"View Activity"}</Button>
    {open&&<div className="mt-4 space-y-5"><p className="text-sm text-gray-500">Review correction requests and changes recorded from V2 onward. Legacy details appear only where known.</p>
      <h3 className="font-semibold">Correction requests</h3>{!requests.length&&!loading&&<p className="text-sm text-gray-500">No requests recorded.</p>}
      {requests.map(request=><div key={request.id} className="border rounded-lg p-3 space-y-2"><p className="font-medium capitalize">{label(request.record_type)} · {request.status}</p><p className="text-xs text-gray-500">{request.requester_name||"Recorded user"} · {timestamp(request.requested_at)}</p><p className="text-sm">{String(request.requested_change.description??request.requested_change.action??"Correction requested")}</p><p className="text-sm">Reason: {request.reason}</p>{request.status==='pending'&&request.current_record&&<div className="flex gap-2"><FarmAdminCorrection recordType={request.record_type} record={request.current_record} requestId={request.id} onSaved={()=>{void load();onSaved?.();}}/><Button variant="outline" size="sm" onClick={()=>void decline(request)}>Decline</Button></div>}</div>)}
      <h3 className="font-semibold">Activity history</h3>{!activity.length&&!loading&&<p className="text-sm text-gray-500">No V2 activity recorded.</p>}
      {activity.map(entry=>{const before=entry.before_value??{};const after=entry.after_value??{};const keys=Object.keys(after).filter(key=>!['id','created_by','actor_id','revision','sale_id','correction_of'].includes(key)&&JSON.stringify(before[key])!==JSON.stringify(after[key]));return <div key={entry.id} className="border rounded-lg p-3 space-y-1"><p className="font-medium capitalize">{label(entry.record_type)} · {entry.operation}</p><p className="text-xs text-gray-500">{entry.actor?.name||"Recorded user"} · {timestamp(entry.happened_at)}{entry.record_date?` · Record date ${entry.record_date}`:""}</p>{entry.reason&&<p className="text-sm">Reason: {entry.reason}</p>}<dl className="text-xs space-y-1">{keys.map(key=><div key={key}><dt className="inline capitalize font-medium">{label(key)}: </dt><dd className="inline break-words">{entry.before_value?`${display(before[key])} → `:""}{display(after[key])}</dd></div>)}</dl></div>;})}
      {loading&&<p className="text-sm">Loading...</p>}{hasMore&&<Button variant="outline" disabled={loading} onClick={()=>void load(page+1)}>Load more</Button>}
    </div>}
  </section>;
}
function display(value:unknown){return value===null||value===undefined?"Not recorded":typeof value==='object'?JSON.stringify(value):String(value);}
