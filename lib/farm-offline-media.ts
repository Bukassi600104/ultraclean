import {queueIdentityKey,type QueueIdentity} from './offline-storage';

type PhotoDetails={activity_date:string;target_resource:string;batch_id?:string};
export type FarmMedia={id:string;owner:string;identity:QueueIdentity;blob:Blob;details:PhotoDetails;requestId:string;createdAt:string;status:'phone'|'pending'|'uploaded';evidenceId?:string;error?:string};
const database='primefield-private-photos';
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open(database,1);
 request.onupgradeneeded=()=>{const store=request.result.createObjectStore('photos',{keyPath:'id'});store.createIndex('owner','owner');};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Photo storage unavailable'));
 request.onblocked=()=>reject(Error('Close another app tab and retry saving this photo'));
});}
function owner(identity:QueueIdentity){
 if(identity.business!=='farm'||!identity.actorId||!identity.periodId)throw Error('Wait for your farm responsibility period before saving a photo');
 return queueIdentityKey(identity);
}
async function put(item:FarmMedia){
 const db=await open();
 try{await new Promise<void>((resolve,reject)=>{
  const transaction=db.transaction('photos','readwrite');
  transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error||Error('Photo could not be saved'));transaction.onabort=()=>reject(transaction.error||Error('Photo storage is full. Keep the original photo and retry.'));
  transaction.objectStore('photos').put(item);
 });}finally{db.close();}
}
export async function saveFarmMedia(identity:QueueIdentity,blob:Blob,details:PhotoDetails){
 const key=owner(identity);if(!blob.size)throw Error('Choose a photo');
 const requestId=crypto.randomUUID();
 const item:FarmMedia={id:key+':'+requestId,owner:key,identity:{...identity},blob,details:{...details},requestId,createdAt:new Date().toISOString(),status:'phone'};
 await put(item);return item;
}
export async function getFarmMedia(identity:QueueIdentity):Promise<FarmMedia[]>{
 const key=owner(identity),db=await open();
 try{return await new Promise((resolve,reject)=>{
  const request=db.transaction('photos','readonly').objectStore('photos').index('owner').getAll(key);
  request.onsuccess=()=>resolve(request.result.sort((a:FarmMedia,b:FarmMedia)=>a.createdAt.localeCompare(b.createdAt)));request.onerror=()=>reject(request.error);
 });}finally{db.close();}
}
export async function removeFarmMedia(id:string,identity:QueueIdentity){
 const key=owner(identity),db=await open();
 try{await new Promise<void>((resolve,reject)=>{
  const transaction=db.transaction('photos','readwrite'),store=transaction.objectStore('photos'),request=store.get(id);
  request.onsuccess=()=>{if(request.result?.owner===key)store.delete(id);};
  transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);
 });}finally{db.close();}
}
export async function syncFarmMedia(identity:QueueIdentity,{send=fetch,isCurrent,signal}:{send?:typeof fetch;isCurrent:()=>boolean;signal?:AbortSignal}){
 let uploaded=0;
 for(const original of await getFarmMedia(identity)){
  if(!isCurrent()||signal?.aborted)break;if(original.status==='uploaded')continue;
  const item:FarmMedia={...original,status:'pending'};
  await put(item);if(!isCurrent()||signal?.aborted)break;
  const form=new FormData();form.set('file',item.blob,'photo');form.set('request_id',item.requestId);
  for(const [key,value] of Object.entries(item.details))if(value)form.set(key,value);
  try{
   const response=await send('/api/farm/evidence',{method:'POST',headers:{'X-Manager-Actor':identity.actorId,'X-Manager-Period':identity.periodId},body:form,signal});
   if(!isCurrent()||signal?.aborted)break;
   const body=await response.json().catch(()=>({}));
   if(!isCurrent()||signal?.aborted)break;
   if(response.ok&&typeof body.data?.id==='string'&&body.data.status==='uploaded'){
    await put({...item,status:'uploaded',evidenceId:body.data.id,error:undefined});uploaded++;
   }else{await put({...item,error:body.error||'Upload pending. Your photo is saved on this phone.'});if(response.status>=500)break;}
  }catch{break;}
 }
 return uploaded;
}
