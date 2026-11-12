"use client";
import {farmTimestamp} from "@/lib/farm-products";
import {useEffect,useRef,useState} from 'react';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {FarmRecordMessage} from '@/lib/farm-record-messages';
import {FarmRecordEvidence} from './FarmRecordEvidence';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function FarmRecordDiscussion({resource,recordId}:{resource:string;recordId:string}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-medium" onClick={()=>setOpen(true)}>Questions</button><FarmDiscussionDialog resource={resource} recordId={open?recordId:null} onClose={()=>setOpen(false)}/></>;
}
export function FarmDiscussionDialog({resource,recordId,onClose,description}:{resource:string;recordId:string|null;onClose:()=>void;description?:string}){
 return <Dialog open={!!recordId} onOpenChange={open=>{if(!open)onClose();}}><DialogContent><DialogTitle className="pr-10">Discuss this record</DialogTitle><DialogDescription>{description||'Messages between the MD/Owner and the supervisor.'}</DialogDescription>{recordId&&<FarmRecordThread key={`${resource}:${recordId}`} resource={resource} recordId={recordId}/>}</DialogContent></Dialog>;
}
export function FarmRecordThread({resource,recordId}:{resource:string;recordId:string}){
 const send=useManagerFetch(),[rows,setRows]=useState<FarmRecordMessage[]|null>(null),[body,setBody]=useState(''),[reply,setReply]=useState(''),[error,setError]=useState(''),[readError,setReadError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0),[pending,setPending]=useState<Record<string,unknown>|null>(null);
 const refresh=useFarmRecordRefresh(),sending=useRef(false);
 useEffect(()=>{const controller=new AbortController();send(`/api/farm/record-messages?resource=${encodeURIComponent(resource)}&record_id=${recordId}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok||!Array.isArray(data.data))throw Error(data.error||'Messages unavailable');if(!controller.signal.aborted){setRows(data.data);setReadError('');}}).catch(e=>{if(!controller.signal.aborted){setRows(null);setReadError(e.message);}});return()=>controller.abort();},[send,resource,recordId,version,refresh]);
 return <section className="space-y-3 border-t pt-4"><FarmRecordEvidence resource={resource} recordId={recordId}/><h3 className="font-semibold">Questions and replies</h3>
  {readError?<p role="alert" className="text-sm text-red-700">{readError} <button type="button" className="min-h-11 underline" onClick={()=>setVersion(v=>v+1)}>Reload messages</button></p>:!rows?<p role="status">Loading messages…</p>:!rows.length&&<p className="text-sm text-slate-600">No messages yet.</p>}
  {rows?.map(row=><article key={row.id} className="rounded-xl border p-3 text-sm"><p className="whitespace-pre-wrap break-words">{row.body}</p><p className="mt-1 text-xs text-slate-600">{row.kind} · {farmTimestamp(row.created_at)}</p><button type="button" disabled={!!pending} className="min-h-11 text-sm underline" onClick={()=>setReply(row.id)}>Reply to this message</button></article>)}
  {reply&&<div className="text-xs text-slate-600">Replying to: {rows?.find(r=>r.id===reply)?.body}<button type="button" disabled={!!pending} className="ml-2 min-h-11 underline" onClick={()=>setReply('')}>Cancel reply</button></div>}
  <label className="block text-sm font-medium">Message<textarea aria-label="Message" maxLength={2000} disabled={!!pending} className="mt-1 w-full rounded-xl border p-3" value={body} onChange={e=>setBody(e.target.value)}/></label>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  <button type="button" disabled={busy||!body.trim()} className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={async()=>{
   if(sending.current)return;
   const payload=pending||{resource,record_id:recordId,kind:reply?'reply':'question',body:body.trim(),...(reply?{reply_to:reply}:{}),request_id:crypto.randomUUID()};sending.current=true;setPending(payload);setBusy(true);setError('');
   try{const r=await send('/api/farm/record-messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await r.json();if(!r.ok||!data.data?.id||data.data.record_id!==recordId)throw Error(data.error||'Message not confirmed. Retry.');setPending(null);setBody('');setReply('');setVersion(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Message not confirmed. Retry.');}finally{sending.current=false;setBusy(false);}
  }}>{busy?'Sending…':pending?'Retry message':'Send message'}</button>
 </section>;
}
