import {z} from 'zod';
import {cashDate,cashReceiver} from './operations-cash-validation';
const reason=z.string().trim().min(1).max(2000),amount=z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,2})?$/).refine(v=>Number(v)>0,'Enter a positive amount');
const evidence={evidence_ids:z.array(z.string().uuid()).max(6).optional()};
const request={request_id:z.string().uuid()},id={id:z.string().uuid()};
export const creditSchema=z.discriminatedUnion('operation',[
 z.object({...request,operation:z.literal('customer'),payload:z.object({name:z.string().trim().min(1).max(200),phone:z.string().max(100).optional(),notes:z.string().max(2000).optional()}).strict()}),
 z.object({...request,...id,operation:z.literal('terms'),payload:z.object({days:z.number().int().min(0).max(3650),reason}).strict()}),
 z.object({...request,...id,operation:z.literal('assign'),payload:z.object({period_id:z.string().uuid(),reason}).strict()}),
 z.object({...request,operation:z.literal('receipt'),payload:z.object({...evidence,date:cashDate,customer_id:z.string().uuid(),amount,amount_owing:z.string().regex(/^(?:0|[1-9]\d{0,29})(?:\.\d{1,2})?$/,'Enter the balance owing with up to two decimal places').optional(),cash_receiver:cashReceiver,notes:z.string().max(2000).optional()}).strict()}),
 z.object({...request,...id,operation:z.literal('void_receipt'),payload:z.object({reason}).strict()}),
 z.object({...request,...id,operation:z.literal('credit_note'),payload:z.object({date:cashDate,amount,reason}).strict()}),
 z.object({...request,...id,operation:z.literal('refund'),payload:z.object({...evidence,date:cashDate,amount,reason}).strict()}),
 z.object({...request,...id,operation:z.literal('void_credit'),payload:z.object({reason}).strict()}),
 z.object({...request,...id,operation:z.literal('void_refund'),payload:z.object({reason}).strict()}),
]);
export type CreditData={customers:{id:string;name:string;phone:string|null;credit_days:number|null}[];invoices:{id:string;number:string;customer_id:string;customer_name:string;sale_id:string;date:string;due_date:string;credit_days?:number;total:string;owed:string;collected?:string;credited?:string;voided_at:string|null;overdue_days:number}[];receipts:{id:string;date:string;customer_name:string;amount:string;voided_at:string|null;allocations:{invoice_id:string;amount:string}[]}[];refunds:{id:string;receipt_id:string;date:string;amount:string;voided_at:string|null;reason:string}[];credit_notes:{voided_at:string|null;id:string;invoice_id:string;date:string;amount:string;reason:string}[];summary:{revenue:string;collected:string;owed:string;unapplied:string;refunded:string}};

export function invoiceStatus(invoice:{voided_at:string|null;owed:string;collected?:string;credited?:string;credit_days?:number;overdue_days:number}) {
 if(invoice.voided_at)return 'Voided';
 if(Number(invoice.owed)<=0){
  const status=Number(invoice.credited)>0||invoice.collected==null?'Settled':'Paid in full';
  return invoice.credit_days ? 'Credit sale · '+status : status;
 }
 const state=Number(invoice.collected)>0?(invoice.credit_days?'Credit sale · Part paid':'Part paid'):'On credit · Unpaid';
 return invoice.overdue_days>0?`${state} · ${invoice.overdue_days} days overdue`:state;
}
