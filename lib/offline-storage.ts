import type {Business} from "./manager-period-types";
const PREFIX="farm_pending_";
export interface QueueIdentity {actorId:string;business:Business;periodId:string}
export interface PendingItem {id:string;endpoint:string;data:Record<string,unknown>;createdAt:string;identity:QueueIdentity;conflict?:string;requestId:string;mediaIds?:string[]}
export function queueIdentityKey(identity:QueueIdentity){return `${identity.business}:${identity.actorId}:${identity.periodId}`;}
function matches(a:QueueIdentity|undefined,b:QueueIdentity){return !!a&&queueIdentityKey(a)===queueIdentityKey(b);}
function changed(){window.dispatchEvent(new Event("farm-pending-changed"));}
function items():PendingItem[]{
 if(typeof window==="undefined")return [];
 const rows:PendingItem[]=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(PREFIX)){try{const item=JSON.parse(localStorage.getItem(key)!);if(item.id===key)rows.push(item);}catch{/* Retain unreadable entries for review. */}}}
 return rows;
}
export function savePending(endpoint:string,data:Record<string,unknown>,identity:QueueIdentity,options:{mediaIds?:string[]}={}){
 if(typeof window==="undefined")return;
 if(!identity?.actorId||!identity.periodId)throw Error("Wait for your manager period before saving offline");
 const id=`${PREFIX}${queueIdentityKey(identity)}:${crypto.randomUUID()}`;
 const item:PendingItem={id,endpoint,data,identity:{...identity},createdAt:new Date().toISOString(),requestId:typeof data.request_id==="string"?data.request_id:crypto.randomUUID(),...(options.mediaIds?.length?{mediaIds:[...options.mediaIds]}:{})};
 localStorage.setItem(id,JSON.stringify(item));changed();return id;
}
export function getPendingItems(identity:QueueIdentity):PendingItem[]{return items().filter(item=>matches(item.identity,identity)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
export function getQuarantinedCount(){return items().filter(item=>!item.identity?.actorId||!item.identity?.periodId).length;}
export function removePending(id:string,identity:QueueIdentity){if(getPendingItems(identity).some(item=>item.id===id)){localStorage.removeItem(id);changed();}}
export function updatePending(item:PendingItem,identity:QueueIdentity){if(matches(item.identity,identity)&&getPendingItems(identity).some(row=>row.id===item.id)){localStorage.setItem(item.id,JSON.stringify(item));changed();}}
export function getPendingCount(identity:QueueIdentity){return getPendingItems(identity).length;}
