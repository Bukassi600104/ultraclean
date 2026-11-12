import {z} from 'zod';
export const discussionResource=z.enum(['farm_sales','farm_expenses','farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_feed_purchases','farm_daily_feed','farm_batch_records','farm_stock_counts','farm_egg_movements','farm_customer_receipts','farm_customer_refunds','farm_purchase_requests','farm_purchases','farm_purchase_payments','farm_purchase_deliveries','farm_purchase_exceptions','farm_health_tasks','farm_health_completions']);
export const recordMessageSchema=z.object({resource:discussionResource,record_id:z.string().uuid(),kind:z.enum(['question','reply','comment']),body:z.string().trim().min(1).max(2000),reply_to:z.string().uuid().optional(),request_id:z.string().uuid()}).strict().refine(value=>(value.kind==='reply')===!!value.reply_to,'Choose a message to reply to');
export type FarmRecordMessage={id:string;actor_id:string;kind:'question'|'reply'|'comment';body:string;reply_to:string|null;created_at:string;is_followup?:boolean;can_complete?:boolean;completed_at?:string|null};

export async function completeLogFollowup(send:typeof fetch,messageId:string,requestId:string){
 let response:Response;
 try{
  response=await send('/api/farm/log-followups',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({message_id:messageId,request_id:requestId})});
 }catch{throw Error('Could not confirm completion. Check your connection and try again.');}
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.data?.message_id!==messageId||typeof result.data.completed_at!=='string'||!Number.isFinite(Date.parse(result.data.completed_at))){
  throw Error(result?.error||'Completion could not be confirmed. Try again.');
 }
 window.dispatchEvent(new Event('farm-records-synced'));
 return result.data.completed_at as string;
}
