import {z} from 'zod';import {cashDate} from './operations-cash-validation';
const reason=z.string().trim().min(1).max(2000),schedule={title:z.string().trim().min(1).max(200),instructions:z.string().trim().min(1).max(4000),due_date:cashDate},retry={request_id:z.string().uuid()},id={id:z.string().uuid()};
export const healthSchema=z.discriminatedUnion('operation',[
 z.object({...retry,operation:z.literal('schedule'),payload:z.object({...schedule,batch_id:z.string().uuid(),period_id:z.string().uuid()}).strict()}),
 z.object({...retry,...id,operation:z.literal('amend'),payload:z.object({...schedule,expected_revision:z.number().int().nonnegative(),reason}).strict()}),
 z.object({...retry,...id,operation:z.literal('cancel'),payload:z.object({expected_revision:z.number().int().nonnegative(),reason}).strict()}),
 z.object({...retry,...id,operation:z.literal('complete'),payload:z.object({date:cashDate,notes:z.string().max(4000).optional(),evidence_ids:z.array(z.string().uuid()).min(1).max(6)}).strict()}),
 z.object({...retry,...id,operation:z.literal('retract'),payload:z.object({reason}).strict()}),
]);
export type HealthTask={id:string;batch_id:string;period_id:string;batch_name:string;manager_name:string;title:string;instructions:string;due_date:string;status:string;revision:number;completion_id:string|null};
export type HealthCompletion={id:string;task_id:string;batch_id:string;date:string;state:string;notes:string|null;reason:string|null;actor_name:string|null;created_at:string;supersedes_id:string|null};
export type HealthData={tasks:HealthTask[];completions:HealthCompletion[];batches:{id:string;name:string}[];managers:{id:string;name:string;batch_ids:string[]}[]};
