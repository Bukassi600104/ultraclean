import {z} from 'zod';import {cashDate} from './operations-cash-validation';
const reason=z.string().trim().min(1).max(2000),schedule={title:z.string().trim().min(1).max(200),instructions:z.string().trim().min(1).max(4000),due_date:cashDate},retry={request_id:z.string().uuid()},id={id:z.string().uuid()};
const completionSchema=z.object({...retry,...id,operation:z.literal('complete'),payload:z.object({date:cashDate,notes:z.string().max(4000).optional(),evidence_ids:z.array(z.string().uuid()).min(1).max(6)}).strict()});
// Local photo references are resolved to owned server evidence by the offline synchronizer.
// Keep the API schema strict; only the pre-upload completion form accepts local references.
export const healthLocalCompletionSchema=completionSchema.extend({payload:completionSchema.shape.payload.extend({evidence_ids:z.array(z.string().min(1)).min(1).max(6)})});
export const healthSchema=z.discriminatedUnion('operation',[
 z.object({...retry,operation:z.literal('schedule'),payload:z.object({...schedule,batch_id:z.string().uuid(),period_id:z.string().uuid()}).strict()}),
 z.object({...retry,...id,operation:z.literal('amend'),payload:z.object({...schedule,expected_revision:z.number().int().nonnegative(),reason}).strict()}),
 z.object({...retry,...id,operation:z.literal('cancel'),payload:z.object({expected_revision:z.number().int().nonnegative(),reason}).strict()}),
 completionSchema,
 z.object({...retry,...id,operation:z.literal('retract'),payload:z.object({reason}).strict()}),
]);
export function healthValidationMessage(error:z.ZodError){
 const issue=error.issues[0],field=issue?.path.find(part=>typeof part==='string'&&part!=='payload');
 const messages:Record<string,string>={title:'Enter a task title of up to 200 characters.',instructions:'Enter the approved instructions, up to 4,000 characters.',due_date:'Choose a valid due date.',date:'Choose the actual completion date.',batch_id:'Choose a farm group.',period_id:'Choose the responsible manager.',reason:'Enter a reason of up to 2,000 characters.',notes:'Keep completion notes within 4,000 characters.',evidence_ids:'Add a photo to confirm this task. You can attach up to six photos.',expected_revision:'Refresh this task before making a correction.',id:'Open the task again before saving.',request_id:'This saved entry needs review. Keep it on this device and ask for help.'};
 return typeof field==='string'&&messages[field]||'Check this health entry and try again.';
}
export type HealthTask={id:string;batch_id:string;period_id:string;batch_name:string;manager_name:string;title:string;instructions:string;due_date:string;status:string;revision:number;completion_id:string|null};
export type HealthCompletion={id:string;task_id:string;batch_id:string;date:string;state:string;notes:string|null;reason:string|null;actor_name:string|null;created_at:string;supersedes_id:string|null};
export type HealthData={recommendations?:{id:string;task_id:string;body:string;actor_name:string;created_at:string}[];tasks:HealthTask[];completions:HealthCompletion[];batches:{id:string;name:string}[];managers:{id:string;name:string;batch_ids:string[]}[]};
