"use client";
import {useEffect,useRef,useState} from 'react';
import {useQueueIdentity} from '@/contexts/ManagerPeriodContext';
import {getFarmMedia,saveFarmMedia,type FarmMedia} from '@/lib/farm-offline-media';
import {prepareFarmPhoto} from '@/lib/farm-photo-prepare';
import {getPendingItems,queueIdentityKey} from '@/lib/offline-storage';

export function FarmPhotoPicker({date,batchId,resource,value,onChange,onBusyChange}:{date:string;batchId?:string;resource:string;value:string[];onChange:(ids:string[])=>void;onBusyChange?:(busy:boolean)=>void}){
 const identity=useQueueIdentity(),key=(identity?queueIdentityKey(identity):'')+':'+date+':'+(batchId||'')+':'+resource,current=useRef(key),selection=useRef(value);current.current=key;selection.current=value;
 const [photos,setPhotos]=useState<FarmMedia[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{current.current=key;let active=true;setPhotos([]);if(identity)getFarmMedia(identity).then(rows=>{if(active)setPhotos(rows);}).catch(()=>{if(active)setError('Photo storage is unavailable on this device. Keep your original photos.');});return()=>{active=false;current.current='';};},[key,date,batchId,resource,identity]);
 const queued=new Set(identity?getPendingItems(identity).flatMap(item=>item.mediaIds||[]):[]);
 const available=photos.filter(photo=>photo.details.activity_date===date&&photo.details.batch_id===batchId&&photo.details.target_resource===resource&&!queued.has(photo.id));
 return <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Supporting photos</legend>
  <p className="text-xs text-slate-600">Required for deaths. Up to six photos, stored on this phone until the record is confirmed.</p>
  <label className="block text-sm">Add a photo<input aria-label="Add a photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy||!identity||value.length>=6} className="mt-1 block w-full min-w-0 text-sm" onChange={async e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file||!identity)return;setBusy(true);onBusyChange?.(true);setError('');
   try{const upload=await prepareFarmPhoto(file);if(current.current!==key)return;const photo=await saveFarmMedia(identity,file,{activity_date:date,target_resource:resource,...(batchId?{batch_id:batchId}:{})},upload);if(current.current!==key)return;setPhotos(rows=>[...rows,photo]);onChange([...selection.current,photo.id]);}
   catch(e){setError(e instanceof Error?e.message:'Photo not saved. Keep the original and retry.');}finally{if(current.current===key){setBusy(false);onBusyChange?.(false);}}
  }}/></label>
  {busy&&<p role="status" className="text-xs">Saving photo on this phone…</p>}
  {available.map((photo,index)=><label key={photo.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(photo.id)} disabled={busy||(!value.includes(photo.id)&&value.length>=6)} onChange={e=>onChange(e.target.checked?[...value,photo.id]:value.filter(id=>id!==photo.id))}/><span>Photo {index+1} · {photo.status==='phone'?'Saved on phone':photo.status==='pending'?'Upload pending':'Uploaded, record not sent'}{photo.error&&<span className="block text-xs text-amber-800">{photo.error}</span>}</span></label>)}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </fieldset>;
}
