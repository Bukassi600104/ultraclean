import {z} from 'zod';

// These are places to make observations. Stock and its custody stay in the inventory ledger.
export const reportAreas = [
  {key:'farm1_pond1', group:'Catfish', site:'Farm 1', name:'Pond 1'},
  {key:'farm1_pond2', group:'Catfish', site:'Farm 1', name:'Pond 2'},
  {key:'farm1_pond3', group:'Catfish', site:'Farm 1', name:'Pond 3'},
  {key:'farm1_pond4', group:'Catfish', site:'Farm 1', name:'Pond 4'},
  {key:'farm2_vat1', group:'Catfish', site:'Farm 2', name:'Tarpaulin Vat 1'},
  {key:'farm2_vat2', group:'Catfish', site:'Farm 2', name:'Tarpaulin Vat 2'},
  {key:'farm2_vat3', group:'Catfish', site:'Farm 2', name:'Tarpaulin Vat 3'},
  {key:'poultry_a', group:'Poultry', site:'', name:'Pen A'},
  {key:'poultry_b', group:'Poultry', site:'', name:'Pen B'},
  {key:'poultry_c', group:'Poultry', site:'', name:'Pen C'},
  {key:'poultry_d', group:'Poultry', site:'', name:'Pen D'},
  {key:'piggery_1', group:'Piggery', site:'', name:'Sty 1'},
  {key:'piggery_2', group:'Piggery', site:'', name:'Sty 2'},
  {key:'piggery_3', group:'Piggery', site:'', name:'Sty 3'},
  {key:'piggery_4', group:'Piggery', site:'', name:'Sty 4'},
  {key:'goats', group:'Other areas', site:'', name:'Goats'},
  {key:'ram', group:'Other areas', site:'', name:'Ram'},
  {key:'cattle', group:'Other areas', site:'', name:'Cattle'},
  {key:'crops', group:'Other areas', site:'', name:'Crops'},
] as const;
export type ReportArea = typeof reportAreas[number];
export const reportArea = (key: unknown) => reportAreas.find(area => area.key === key);
export const areaTitle = (area: ReportArea) => [area.group==='Other areas'?'':area.group, area.site, area.name].filter(Boolean).join(' · ');
export function batchReportArea(batch:{name:string;site_name:string;product:string}){
  const name=batch.name.trim().toLowerCase(),site=batch.site_name.trim().toLowerCase();
  return reportAreas.find(area=>area.name.toLowerCase()===name&&(!area.site||area.site.toLowerCase()===site)&&
    (area.group==='Catfish'?batch.product==='catfish':area.group==='Poultry'?['chicken','turkey'].includes(batch.product):area.group==='Piggery'?batch.product==='pig':false));
}

const count=z.number().int().nonnegative().max(2147483647);
const weight=z.number().finite().nonnegative().max(1000000);
const observation=z.string().trim().max(2000);
export const areaObservationsSchema=z.object({
  feed_kg:weight.optional(),deaths:count.optional(),eggs:count.optional(),sample_count:count.positive().optional(),
  sample_weight_kg:weight.positive().optional(),water_quality:observation.optional(),notes:observation.optional(),
}).strict();
export const areaFields={
  feed_kg:'Feed used (kg)',deaths:'Deaths observed',eggs:'Eggs collected',sample_count:'Animals weighed',
  sample_weight_kg:'Total sample weight (kg)',water_quality:'Water quality',notes:'Notes',
} as const;
export type AreaField=keyof typeof areaFields;
export function applicableAreaFields(area:ReportArea):AreaField[]{
  if(area.key==='crops')return ['notes'];
  return ['feed_kg','deaths',...(area.group==='Poultry'?['eggs' as const]:[]),'sample_count','sample_weight_kg',...(area.group==='Catfish'?['water_quality' as const]:[]),'notes'];
}
const draftNumber=z.number().finite().optional();
export const areaSectionsDraftSchema=z.object({template_version:z.literal(3),area:z.string().refine(key=>!!reportArea(key),'Choose a farm area'),
  observations:areaObservationsSchema.extend({feed_kg:draftNumber,deaths:draftNumber,eggs:draftNumber,sample_count:draftNumber,sample_weight_kg:draftNumber}),
}).strict();
export const areaSectionsSchema=areaSectionsDraftSchema.extend({observations:areaObservationsSchema}).superRefine((value,ctx)=>{
  const area=reportArea(value.area);
  if (!area) return;
  const entries=Object.entries(value.observations);
  if(!entries.some(([,entry])=>entry!==undefined&&entry!==''))ctx.addIssue({code:'custom',message:'Add a measurement or a note for this area.'});
  if(entries.some(([key])=>!applicableAreaFields(area).includes(key as AreaField)))ctx.addIssue({code:'custom',message:'Choose measurements for this farm area.'});
  if((value.observations.sample_count==null)!==(value.observations.sample_weight_kg==null))ctx.addIssue({code:'custom',message:'Enter both the number weighed and the total sample weight.'});
});
export type AreaSections=z.infer<typeof areaSectionsDraftSchema>;
export function isAreaSections(value:unknown):value is AreaSections {
  return !!value && typeof value==='object' && 'template_version' in value && value.template_version===3;
}
