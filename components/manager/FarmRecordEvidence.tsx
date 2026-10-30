"use client";
/* eslint-disable @next/next/no-img-element -- Private expiring URLs are fetched directly in this authenticated view. */
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
export function FarmRecordEvidence({resource,recordId}:{resource:string;recordId:string}){
 const send=useManagerFetch(),[photos,setPhotos]=useState<{id:string;url:string}[]>([]),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{const controller=new AbortController();setPhotos([]);setError('');void(async()=>{try{
  const response=await send(`/api/farm/evidence?resource=${encodeURIComponent(resource)}&record_id=${recordId}`,{signal:controller.signal}),body=await response.json();if(!response.ok||!Array.isArray(body.data))throw Error(body.error||'Photos unavailable');
  const rows=await Promise.all((body.data as {id:string}[]).map(async row=>{const r=await send(`/api/farm/evidence?id=${row.id}`,{signal:controller.signal}),photo=await r.json();if(!r.ok)throw Error(photo.error||'Photo unavailable');return {id:row.id,url:photo.url as string};}));if(!controller.signal.aborted)setPhotos(rows);
 }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Photos unavailable');}})();return()=>controller.abort();},[send,resource,recordId,version]);
 if(!photos.length&&!error)return null;
 return <section className="space-y-2"><h3 className="text-sm font-semibold">Record photos</h3>{error&&<p role="alert" className="text-sm text-red-700">{error}<button className="ml-2 min-h-11 underline" onClick={()=>setVersion(v=>v+1)}>Reload photos</button></p>}<div className="grid gap-3 sm:grid-cols-2">{photos.map((photo,index)=><img key={photo.id} src={photo.url} alt={`Supporting photo ${index+1} for this record`} width={1600} height={1200} className="h-auto max-h-64 w-full rounded-xl border object-contain" onError={()=>setError('Photo access may have expired. Reload to view it again.')}/>)}</div></section>;
}
