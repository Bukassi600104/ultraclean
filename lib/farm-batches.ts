import {z} from 'zod';

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
 const parsed=new Date(value+'T12:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
},'Choose a valid date');
const allocation={batch_id:z.string().uuid(),quantity:z.number().int().min(1).max(2147483647),date,reason:z.string().trim().min(1).max(1000)};
const retry={request_id:z.string().uuid()};
export const batchWriteSchema=z.discriminatedUnion('operation',[
 z.object({...retry,operation:z.literal('site'),payload:z.object({name:z.string().trim().min(1).max(120)}).strict()}).strict(),
 z.object({...retry,operation:z.literal('batch'),payload:z.object({site_id:z.string().uuid(),name:z.string().trim().min(1).max(120),kind:z.enum(['flock','pond','pen','herd']),product:z.enum(['catfish','chicken','turkey','pig','goat','cattle']),stock_group_id:z.string().uuid().nullable().optional()}).strict()}).strict(),
 z.object({...retry,operation:z.literal('allocate'),payload:z.object(allocation).strict()}).strict(),
 z.object({...retry,operation:z.literal('transfer'),payload:z.object({...allocation,to_batch_id:z.string().uuid()}).strict()}).strict(),
]);
