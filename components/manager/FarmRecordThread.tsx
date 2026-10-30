"use client";
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {FarmRecordMessage} from '@/lib/farm-record-messages';
import {FarmRecordEvidence} from './FarmRecordEvidence';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function FarmRecordDiscussion({resource,recordId}:{resource:string;recordId:string}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-medium" onClick={()=>setOpen(true)}>Questions</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle className="pr-10">Discuss this record</DialogTitle><DialogDescription>Only Bimbo and the responsible manager can participate.</DialogDescription><FarmRecordThread key={`${resource}:${recordId}`} resource={resource} recordId={recordId}/></DialogContent></Dialog></>;
}
export function FarmRecordThread({resource,recordId}:{resource:string;recordId:string}){
 const send=useManagerFetch(),[rows,setRows]=useState<FarmRecordMessage[]>([]),[body,setBody]=useState(''),[reply,setReply]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0),[pending,setPending]=useState<Record<string,unknown>|null>(null);
 useEffect(()=>{const controller=new AbortController();setRows([]);setError('');send(`/api/farm/record-messages?resource=${encodeURIComponent(resource)}&record_id=${recordId}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Messages unavailable');setRows(data.data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,resource,recordId,version]);
 return <section className="space-y-3 border-t pt-4"><FarmRecordEvidence resource={resource} recordId={recordId}/><h3 className="font-semibold">Questions and replies</h3><p className="text-xs text-slate-600">Messages clarify this record without changing its figures.</p>
  {!rows.length&&!error&&<p className="text-sm text-slate-600">No messages yet.</p>}
  {rows.map(row=><article key={row.id} className="rounded-xl border p-3 text-sm"><p className="whitespace-pre-wrap break-words">{row.body}</p><p className="mt-1 text-xs text-slate-600">{row.kind} · {new Date(row.created_at).toLocaleString()}</p><button type="button" disabled={!!pending} className="min-h-11 text-sm underline" onClick={()=>setReply(row.id)}>Reply to this message</button></article>)}
  {reply&&<div className="text-xs text-slate-600">Replying to: {rows.find(r=>r.id===reply)?.body}<button type="button" disabled={!!pending} className="ml-2 min-h-11 underline" onClick={()=>setReply('')}>Cancel reply</button></div>}
  <label className="block text-sm font-medium">Message<textarea maxLength={2000} disabled={!!pending} className="mt-1 w-full rounded-xl border p-3" value={body} onChange={e=>setBody(e.target.value)}/></label>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  <button type="button" disabled={busy||!body.trim()} className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={async()=>{
   const payload=pending||{resource,record_id:recordId,kind:reply?'reply':'question',body:body.trim(),...(reply?{reply_to:reply}:{}),request_id:crypto.randomUUID()};setPending(payload);setBusy(true);setError('');
   try{const r=await send('/api/farm/record-messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await r.json();if(!r.ok)throw Error(data.error||'Message not confirmed. Retry.');setPending(null);setBody('');setReply('');setVersion(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Message not confirmed. Retry.');}finally{setBusy(false);}
  }}>{busy?'Sending…':pending?'Retry message':'Send message'}</button>
 </section>;
}
