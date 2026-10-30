import {z} from 'zod';
import {cashDate} from './operations-cash-validation';
const money=z.string().regex(/^\d{1,12}(\.\d{1,2})?$/,'Enter an amount with at most two decimal places');
const quantity=z.string().regex(/^\d{1,7}(\.\d{1,3})?$/).refine(v=>Number(v)>0&&Number(v)<=1000000,'Enter a positive quantity');
export const purchaseLine=z.object({description:z.string().trim().min(1).max(500),quantity,unit_price:money,unit:z.string().trim().min(1).max(40),destination:z.enum(['feed','supply','livestock','other']),feed_type:z.string().max(40).optional(),feed_source:z.enum(['local','foreign']).optional(),item_id:z.string().uuid().optional(),batch_id:z.string().uuid().optional()}).strict();
const evidence={evidence_ids:z.array(z.string().uuid()).max(6).optional()};
const note={notes:z.string().trim().max(2000).optional(),reason:z.string().trim().max(2000).optional()};
const envelope={id:z.string().uuid().optional(),request_id:z.string().uuid()};
export const purchaseSchema=z.discriminatedUnion('operation',[
 z.object({...envelope,operation:z.literal('request'),payload:z.object({date:cashDate,supplier:z.string().trim().min(1).max(200),category:z.enum(['feed','equipment','veterinary','repair','maintenance','other']),description:z.string().trim().min(1).max(4000),lines:z.array(purchaseLine).min(1).max(50),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.enum(['approve','decline']),payload:z.object({expected_revision:z.number().int().min(0),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('payment'),payload:z.object({date:cashDate,amount:money.refine(v=>Number(v)>0),recipient:z.string().trim().min(1).max(200),expense_source:z.enum(['owner_fund','sales_cash']).optional(),cash_payer_account_id:z.string().uuid().optional(),cash_payer_review:z.boolean().optional(),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('delivery'),payload:z.object({date:cashDate,line_id:z.string().uuid(),quantity,existing_movement_id:z.string().uuid().optional(),included_in_starting_count:z.boolean().optional(),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('void_payment'),payload:z.object({expected_revision:z.number().int().min(0),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,operation:z.literal('policy'),payload:z.object({automatic_limit:money.nullable(),require_quote:z.boolean()}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('resolve_exception'),payload:z.object({decision:z.enum(['link','decline']),resource:z.enum(['farm_purchase_payments','farm_expenses','farm_feed_purchases']).optional(),record_id:z.string().uuid().optional(),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,operation:z.literal('exception'),payload:z.object({date:cashDate,supplier:z.string().trim().min(1).max(200),amount:money,description:z.string().trim().min(1).max(4000),...evidence,...note}).strict()}),
]).superRefine((value,context)=>{if(value.operation==='resolve_exception'&&value.payload.decision==='link'&&(!value.payload.resource||!value.payload.record_id))context.addIssue({code:'custom',message:'Choose the verified posted cost'});});
export type PurchaseLine=z.infer<typeof purchaseLine>&{id:string;received_exact:string};
export type PurchasePayment={id:string;date:string;amount_exact:string;recipient:string;revision:number;voided_at:string|null};
export type FarmPurchase={id:string;date:string;supplier:string;description:string;category:string;total_exact:string;paid_exact:string;status:string;revision:number;decision_reason:string|null;decision_at:string|null;lines:PurchaseLine[];payments:PurchasePayment[];deliveries:{id:string;line_id:string;date:string;quantity:number;notes:string|null}[]};
export type PurchaseData={purchases:FarmPurchase[];policy:{automatic_limit:string|null;require_quote:boolean}|null;exceptions:{id:string;date:string;supplier:string;description:string;amount_exact:string;matching_costs:{resource:string;id:string;label:string}[];resolution:{decision:string;reason:string;resolved_at:string}|null}[]};
