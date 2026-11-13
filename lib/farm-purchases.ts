import {z} from 'zod';
import {cashDate} from './operations-cash-validation';
const money=z.string().regex(/^\d{1,12}(\.\d{1,2})?$/,'Enter an amount with at most two decimal places');
const quantity=z.string().regex(/^\d{1,7}(\.\d{1,3})?$/).refine(v=>Number(v)>0&&Number(v)<=1000000,'Enter a positive quantity');
export const purchaseLine=z.object({description:z.string().trim().min(1).max(500),quantity,unit_price:money,unit:z.string().trim().min(1).max(40),destination:z.enum(['feed','supply','livestock','other']),feed_type:z.string().max(40).optional(),feed_source:z.enum(['local','foreign']).optional(),item_id:z.string().uuid().optional(),batch_id:z.string().uuid().optional()}).strict();
export const requestLine=purchaseLine.extend({unit_price:money.optional()});
export const requestDetails=z.object({needed_on:cashDate,why_needed:z.string().trim().min(1).max(2000),credit_customer_id:z.string().uuid().optional(),purchase_category:z.enum(['feed','equipment','veterinary','repair','maintenance','other']).optional(),supplier:z.string().trim().min(1).max(200).optional(),items:z.array(requestLine).max(50)}).strict().refine(v=>v.purchase_category?!!v.items.length:!v.items.length,'Add the requested items for a purchase');
export type RequestDetails=z.infer<typeof requestDetails>;
export const deliverers={sales_procurement:'Sales and Procurement',supplier:'Supplier',farm_supervisor:'Farm Supervisor'} as const;
const evidence={evidence_ids:z.array(z.string().uuid()).max(6).optional()};
const note={notes:z.string().trim().max(2000).optional(),reason:z.string().trim().max(2000).optional()};
const envelope={id:z.string().uuid().optional(),request_id:z.string().uuid()};
export const purchaseSchema=z.discriminatedUnion('operation',[
 z.object({...envelope,operation:z.literal('request'),payload:z.object({date:cashDate,supplier:z.string().trim().min(1).max(200),category:z.enum(['feed','equipment','veterinary','repair','maintenance','other']),description:z.string().trim().min(1).max(4000),lines:z.array(purchaseLine).min(1).max(50),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.enum(['approve','decline','cancel']),payload:z.object({expected_revision:z.number().int().min(0),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('payment'),payload:z.object({date:cashDate,amount:money.refine(v=>Number(v)>0),recipient:z.string().trim().min(1).max(200),expense_source:z.enum(['owner_fund','sales_cash']).optional(),cash_payer_account_id:z.string().uuid().optional(),cash_payer_review:z.boolean().optional(),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('delivery'),payload:z.object({date:cashDate,line_id:z.string().uuid(),quantity,existing_movement_id:z.string().uuid().optional(),included_in_starting_count:z.boolean().optional(),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('confirm_delivery'),payload:z.object({date:cashDate,line_id:z.string().uuid(),quantity,delivered_by:z.enum(['sales_procurement','supplier','farm_supervisor']),existing_movement_id:z.string().uuid().optional(),included_in_starting_count:z.boolean().optional(),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('assign_procurement'),payload:z.object({period_id:z.string().uuid().nullable(),previous_id:z.string().uuid().nullable()}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('procure'),payload:z.object({date:cashDate,supplier:z.string().trim().min(1).max(200),prices:z.array(money).min(1).max(50),...evidence,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('dispatch'),payload:z.object({date:cashDate,line_id:z.string().uuid(),quantity,...note}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('void_payment'),payload:z.object({expected_revision:z.number().int().min(0),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,operation:z.literal('policy'),payload:z.object({automatic_limit:money.nullable(),require_quote:z.boolean()}).strict()}),
 z.object({...envelope,id:z.string().uuid(),operation:z.literal('resolve_exception'),payload:z.object({decision:z.enum(['link','decline','post','approve_awaiting_funding']),category:z.enum(['labor','utilities','veterinary','transport','equipment','produce']).optional(),expense_source:z.enum(['bimbo_transfer','sales_cash']).optional(),cash_payer_account_id:z.string().uuid().optional(),cash_payer_review:z.boolean().optional(),resource:z.enum(['farm_purchase_payments','farm_expenses','farm_feed_purchases']).optional(),record_id:z.string().uuid().optional(),reason:z.string().trim().min(1).max(2000)}).strict()}),
 z.object({...envelope,operation:z.literal('exception'),payload:z.object({date:cashDate,supplier:z.string().trim().min(1).max(200),amount:money,description:z.string().trim().min(1).max(4000),...evidence,...note}).strict()}),
]).superRefine((value,context)=>{
 if(value.operation!=='resolve_exception')return;
 const decision=value.payload;
 if(decision.decision==='link'&&(!decision.resource||!decision.record_id))context.addIssue({code:'custom',message:'Choose the verified posted cost'});
 if(decision.decision==='post'&&(!decision.category||!decision.cash_payer_account_id))context.addIssue({code:'custom',message:'Choose the expense category and actual payer'});
 if(decision.decision==='approve_awaiting_funding'&&(!decision.category||decision.cash_payer_account_id!==undefined||(decision.expense_source!==undefined&&decision.cash_payer_review!==undefined)||decision.record_id!==undefined||decision.resource!==undefined))context.addIssue({code:'custom',message:'Choose the category and leave the payer and payment record open for confirmation.'});
});
export type PurchaseLine=z.infer<typeof purchaseLine>&{id:string;received_exact:string};
export type PurchasePayment={id:string;date:string;amount_exact:string;recipient:string;revision:number;voided_at:string|null};
export type ProcurementTask={request_id:string;description:string;request_date:string;details:RequestDetails;requester_name:string|null;assignment:{id:string;period_id:string|null;name:string|null}|null;can_procure:boolean;order_id:string|null;supplier:string|null;purchased_on:string|null;paid:string|null;lines:{id:string;description:string;unit:string;quantity:string;dispatched:string;received:string}[]};
export type FarmPurchase={id:string;period_id?:string|null;date:string;supplier:string;description:string;category:string;total_exact:string;paid_exact:string;status:string;revision:number;decision_reason:string|null;decision_at:string|null;requested_by_name?:string|null;lines:PurchaseLine[];payments:PurchasePayment[];deliveries:{id:string;line_id:string;date:string;quantity:number;notes:string|null;delivered_by?:"sales_procurement"|"supplier"|"farm_supervisor"|null}[]};
export type ReportedExpense={id:string;date:string;period_id?:string|null;supplier:string;description:string;amount_exact:string;reported_by_name?:string|null;funding_status?:string|null;pending_funding_id?:string|null;matching_costs:{resource:string;id:string;label:string}[];approval?:{category:string;reason:string;approved_at:string;expense_source?:'bimbo_transfer'|'sales_cash'}|null;resolution:{decision:string;reason:string;resolved_at:string}|null};
export type PurchaseData={purchases:FarmPurchase[];policy:{automatic_limit:string|null;require_quote:boolean}|null;exceptions:ReportedExpense[];procurement_tasks?:ProcurementTask[];procurement_people?:{period_id:string;name:string}[]};
export function reportedExpenseStatus(report:ReportedExpense){
 if(report.resolution)return report.resolution.decision==='link'?'Expense recorded':'Declined';
 if(report.approval?.expense_source&&report.funding_status!=='pending')return 'Approved · payer to confirm';
 if(report.funding_status==='pending'||report.approval)return 'Approved · funding to confirm';
 return 'Needs approval';
}
