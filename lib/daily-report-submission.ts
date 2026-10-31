import {z} from 'zod';
import {reportSchema} from './farm-reports';
export const dailyReportSubmissionSchema=z.object({
 report_date:z.string(),sections:z.unknown(),decision_required:z.boolean(),
 request_id:z.string().uuid(),evidence_ids:z.array(z.string().uuid()).max(6).optional(),
 id:z.string().uuid().optional(),revision:z.number().int().nonnegative().optional(),reason:z.string().trim().min(1).max(2000).optional(),
}).strict().superRefine((value,context)=>{
 const result=reportSchema.safeParse({report_date:value.report_date,sections:value.sections,decision_required:value.decision_required});
 if(!result.success)for(const issue of result.error.issues)context.addIssue({code:'custom',message:issue.message,path:issue.path});
 if(value.id&&(value.revision===undefined||!value.reason))context.addIssue({code:'custom',message:'Revision and reason are required for a saved draft'});
}).transform(value=>({...value,...reportSchema.parse({report_date:value.report_date,sections:value.sections,decision_required:value.decision_required})}));
