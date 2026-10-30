import {z} from 'zod';
import {cashDate} from './operations-cash-validation';
const quantity=z.number().finite().min(0).max(1000000).nullable().optional();
export const batchRecordPayload=z.object({
 batch_id:z.string().uuid(),date:cashDate,feed_kg:quantity,deaths:z.number().int().min(0).max(2147483647).nullable().optional(),eggs:z.number().int().min(0).max(2147483647).nullable().optional(),
 sample_weight_kg:z.number().finite().positive().max(1000000).nullable().optional(),sample_count:z.number().int().positive().max(1000000).nullable().optional(),
 notes:z.string().trim().max(4000).optional(),daily_feed_id:z.string().uuid().nullable().optional(),feed_bags:z.number().finite().positive().max(1000000).nullable().optional(),
 mortality_id:z.string().uuid().nullable().optional(),evidence_ids:z.array(z.string().uuid()).max(6).optional(),reason:z.string().trim().min(1).max(2000).optional(),
}).strict().superRefine((value,context)=>{
 if((value.sample_weight_kg==null)!==(value.sample_count==null))context.addIssue({code:'custom',message:'Enter both the sample count and total weight'});
 if((value.daily_feed_id==null)!==(value.feed_bags==null))context.addIssue({code:'custom',message:'Identify the feeding entry and bags allocated'});
 if([value.feed_kg,value.deaths,value.eggs,value.sample_weight_kg,value.daily_feed_id].every(v=>v==null)&&!value.notes)context.addIssue({code:'custom',message:'Record an observation or note; leave unknown measurements blank'});
});
export const batchRecordSchema=z.object({operation:z.enum(['submit','correct']),payload:batchRecordPayload,id:z.string().uuid().optional(),request_id:z.string().uuid()}).strict().superRefine((value,context)=>{
 if(value.operation==='correct'&&(!value.id||!value.payload.reason))context.addIssue({code:'custom',message:'Choose the original record and explain the correction'});
 if(value.operation==='submit'&&value.id)context.addIssue({code:'custom',message:'A new record cannot replace a sent record'});
});
export type FarmBatchRecord={id:string;batch_id:string;date:string;actor_id:string;period_id:string|null;feed_kg:number|null;feed_bags:number|null;deaths:number|null;eggs:number|null;sample_weight_kg:number|null;sample_count:number|null;notes:string|null;mortality_id:string|null;daily_feed_id:string|null;supersedes_id:string|null;created_at:string;batch_name:string;reason:string|null};
export type AssignedFarmBatch={id:string;name:string;kind:string;product:string;stock_group_id:string|null;site_id:string;site_name:string;quantity_exact:string;chicken_type:string|null;sex:string|null};
export type FarmToday={batches:AssignedFarmBatch[];records:FarmBatchRecord[];as_of:string};
