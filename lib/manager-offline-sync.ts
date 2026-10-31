import {getPendingItems,removePending,updatePending,queueIdentityKey,type QueueIdentity} from "./offline-storage";
import {getFarmMedia,syncFarmMedia,removeFarmMedia} from './farm-offline-media';
const activeSyncs=new Set<string>();
export async function syncManagerPending(identity:QueueIdentity,{send=fetch,isCurrent,signal}:{send?:typeof fetch;isCurrent:()=>boolean;signal?:AbortSignal}){
 const key=queueIdentityKey(identity);if(activeSyncs.has(key))return 0;activeSyncs.add(key);
 try{
 let synced=0;
 for(const item of getPendingItems(identity)){
  if(!isCurrent()||signal?.aborted)break;if(item.conflict)continue;
  try{
   let payload:Record<string,unknown>={...item.data,request_id:item.requestId};
   const batch=["/api/farm/sales","/api/farm/expenses","/api/farm/feed-purchases"].includes(item.endpoint);
   if(item.mediaIds?.length){
    await syncFarmMedia(identity,{send,isCurrent,signal});if(!isCurrent()||signal?.aborted)break;
    const photos=await getFarmMedia(identity),owned=item.mediaIds.map(id=>photos.find(photo=>photo.id===id));
    if(owned.some(photo=>!photo)){updatePending({...item,conflict:'A supporting photo is missing on this device. Keep this record for review.'},identity);continue;}
    if(owned.some(photo=>photo?.status!=='uploaded'||!photo.evidenceId))continue;
    const evidence_ids=owned.map(photo=>photo!.evidenceId!);
    payload=payload.payload&&typeof payload.payload==='object'&&!Array.isArray(payload.payload)?{...payload,payload:{...payload.payload,evidence_ids}}:{...payload,evidence_ids};
   }
   if(!isCurrent()||signal?.aborted)break;
   const response=await send(item.endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":item.requestId,"X-Manager-Actor":identity.actorId,"X-Manager-Period":identity.periodId},body:JSON.stringify(batch?[payload]:payload),signal});
   if(!isCurrent()||signal?.aborted)break;
   if(response.redirected||!response.headers.get('content-type')?.includes('application/json')){
    continue;
   }
   if(response.status===202){updatePending({...item,conflict:"Saved for Bimbo's funding review; not yet posted"},identity);}
   else if(response.ok){
    if(['/api/farm/batch-records','/api/farm/daily-reports/submit'].includes(item.endpoint)||item.mediaIds?.length){
     const result=await response.json().catch(()=>null);if(!isCurrent()||signal?.aborted)break;
     if(typeof (result?.data?.id||result?.id)!=='string')continue;
    }
    removePending(item.id,identity);synced++;
    for(const id of item.mediaIds||[])await removeFarmMedia(id,identity);
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('farm-records-synced',{detail:{requestId:item.requestId,endpoint:item.endpoint}}));
   }
   else if(response.status<500&&response.status!==401){const body=await response.json().catch(()=>({}));updatePending({...item,conflict:body.error||"This entry needs review"},identity);}
  }catch{if(!isCurrent()||signal?.aborted)break;}
 }
 return synced;
 }finally{activeSyncs.delete(key);}
}
