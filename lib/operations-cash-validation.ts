import {z} from "zod";
export const businessSchema=z.enum(["farm","property","content"]);
export const cashDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const date=new Date(value+"T12:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;},"Use a valid date");
const amount=z.string().regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/).refine(value=>Number(value)>0,"Enter a positive amount");
export const cashRecipient=z.discriminatedUnion("type",[z.object({type:z.literal("manager"),period_id:z.string().uuid()}).strict(),z.object({type:z.literal("custodian"),name:z.string().trim().min(1).max(150)}).strict(),z.object({type:z.literal("ceo")}).strict()]);
const common={business:businessSchema,currency:z.string().regex(/^[A-Z]{3}$/),bucket:z.enum(["owner","sales"]).default("owner")},dated={...common,date:cashDate,amount,notes:z.string().trim().max(2000).optional()};
const allocations=z.array(z.object({lot_id:z.string().uuid(),amount}).strict()).min(1).max(100).optional();
export const cashRequestSchema=z.discriminatedUnion("operation",[
 z.object({operation:z.literal("fund"),payload:z.object({...dated,recipient:cashRecipient,confirmed_receipt:z.boolean().optional()}).strict(),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("handoff"),payload:z.object({...dated,source_account_id:z.string().uuid(),recipient:cashRecipient.optional(),allocations}).strict(),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("receive"),payload:z.object({...dated,event_id:z.string().uuid(),allocations}).strict(),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("correct"),payload:z.object({...dated,id:z.string().uuid(),reason:z.string().trim().min(1).max(2000),expected_revision:z.literal(0),allocations}).strict(),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("void"),payload:z.object({...common,id:z.string().uuid(),reason:z.string().trim().min(1).max(2000),expected_revision:z.literal(0)}).strict(),request_id:z.string().uuid()}).strict(),
]);
export type CashRequest=z.infer<typeof cashRequestSchema>;
export type CashAccount={id:string;business:string;currency:string;bucket:"owner"|"sales";holder_type:"manager"|"custodian"|"ceo"|"awaiting";period_id:string|null;name:string;opening:string;receipts:string;outgoing:string;paid_spending:string;paid_spending_total:string;funds_received:string;funds_received_total:string;closing:string};
export type CashEvent={id:string;business:string;currency:string;bucket:"owner"|"sales";operation:string;cash_kind:string;amount:string;event_date:string;recorded_at:string;source_account_id:string;target_account_id:string;source_name?:string;target_name?:string;origin_event_id:string|null;corrects_id:string|null;fund_transfer_id:string|null;period_id:string|null;reason:string|null;notes:string|null;remaining?:string;recipient_name?:string};
export type CashSummary={business:string;periodId:string|null;from:string;to:string;accounts:CashAccount[];sources:{id:string;name:string;currency:string;bucket:"owner"|"sales";holder_type:string;available:string}[];receipts:CashEvent[];history:CashEvent[];total:number;has_more:boolean;pending_expenses:PendingExpense[];ceo_receivers:{id:string;name:string|null}[]};
export const cashReceiver=z.discriminatedUnion("type",[z.object({type:z.literal("self")}).strict(),z.object({type:z.literal("ceo"),profile_id:z.string().uuid()}).strict(),z.object({type:z.literal("custodian"),account_id:z.string().uuid()}).strict()]);
export const cashPayerFields={cash_payer_account_id:z.string().uuid().optional(),cash_payer_review:z.boolean().optional(),cash_allocations:allocations};
export type CashReceiver=z.infer<typeof cashReceiver>;
export type PendingExpense={id:string;business:string;period_id:string;kind:string;activity_date:string;currency:string;bucket:"owner"|"sales";amount:string;shortfall:string;observed_available:string;status:"pending"|"posted"|"declined";revision:number;requested_at:string;requester_name:string|null;resolution_reason:string|null;payload:Record<string,unknown>};
export type PendingFunding={status:"pending_funding";id:string;currency:string;shortfall:string;amount?:string;message?:string;results?:unknown[]};
export function isPendingFunding(value:unknown):value is PendingFunding{return !!value&&typeof value==="object"&&"status" in value&&value.status==="pending_funding"&&"id" in value&&typeof value.id==="string";}
