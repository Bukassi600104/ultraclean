import {sumMoney,subtractMoney} from './money';
type Cost={id:string;date:string;batch_id?:string|null;amount:string};
type Observation={id:string;batch_id:string;date:string;feed_kg:number|null;eggs:number|null;head_count:string;feed_cost_estimate:string|null;sample_weight_kg:number|null;sample_count:number|null};
export type PerformanceSource={from:string;to:string;batches:{id:string;name:string;product:string;site_name:string;head_count:string;laying_hens:boolean;movement_dates?:string[]}[];records:Observation[];sales:Cost[];expenses:Cost[];feed:Cost[];payments:(Cost&{allocations:{batch_id:string;amount:string}[]})[];credits:Cost[];deaths:{id:string;date:string;batch_id:string|null;quantity:string}[]};
export function batchPerformance(data:PerformanceSource){
 const sum=(rows:{amount:string}[])=>sumMoney(rows.map(r=>r.amount)),days=Math.round((Date.parse(data.to+'T12:00:00Z')-Date.parse(data.from+'T12:00:00Z'))/86400000)+1;
 const revenue=subtractMoney(sum(data.sales),sum(data.credits)),expenses=sumMoney([sum(data.expenses),sum(data.feed),sum(data.payments)]);
 const batches=data.batches.map(b=>{
  const records=data.records.filter(r=>r.batch_id===b.id),dates=Array.from(new Set(records.map(r=>r.date))).sort(),losses=data.deaths.filter(r=>r.batch_id===b.id);
  const trend=Array.from(new Set([...dates,...losses.map(r=>r.date)])).sort().map(date=>{const rows=records.filter(r=>r.date===date),known=(key:'feed_kg'|'eggs')=>rows.length>0&&rows.every(r=>r[key]!=null)?rows.reduce((s,r)=>s+Number(r[key]),0):null,feed=known('feed_kg'),eggs=known('eggs'),heads=Number(rows[0]?.head_count||0);return {date,feed_kg:feed,eggs,deaths:losses.filter(r=>r.date===date).reduce((s,r)=>s+Number(r.quantity),0),lay_rate:b.laying_hens&&heads>0&&eggs!=null?eggs/heads*100:null,head_count:heads};});
  const feedComplete=dates.length===days&&trend.every(r=>r.feed_kg!=null),feedKg=feedComplete?trend.reduce((s,r)=>s+r.feed_kg!,0):null;
  const samples=records.filter(r=>r.sample_count&&r.sample_weight_kg).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),first=samples[0],last=samples.at(-1),sampleAverage=last?last.sample_weight_kg!/last.sample_count!:null;
  let conversion:number|null=null;
  if(!b.laying_hens&&first&&last&&last.date>first.date&&b.movement_dates&&!b.movement_dates.some(d=>d>first.date&&d<=last.date)){
   const window=trend.filter(r=>r.date>first.date&&r.date<=last.date),duration=Math.round((Date.parse(last.date)-Date.parse(first.date))/86400000),heads=Number(first.head_count),gain=(last.sample_weight_kg!/last.sample_count!-first.sample_weight_kg!/first.sample_count!)*heads;
   if(heads>0&&gain>0&&window.length===duration&&window.every(r=>r.feed_kg!=null&&r.head_count===heads))conversion=window.reduce((s,r)=>s+r.feed_kg!,0)/gain;
  }
  const allocatedRevenue=subtractMoney(sum(data.sales.filter(r=>r.batch_id===b.id)),sum(data.credits.filter(r=>r.batch_id===b.id))),allocatedCost=sumMoney([sum(data.expenses.filter(r=>r.batch_id===b.id)),sum(data.payments.flatMap(p=>p.allocations).filter(a=>a.batch_id===b.id))]);
  const costKnown=records.length>0&&records.every(r=>r.feed_cost_estimate!=null),feedCost=costKnown?sumMoney(records.map(r=>r.feed_cost_estimate!)):null;
  return {...b,trend,recorded_days:dates.length,expected_days:days,eggs:sumMoney(records.filter(r=>r.eggs!=null).map(r=>r.eggs!)),egg_days:trend.filter(r=>r.eggs!=null).length,deaths:sumMoney(losses.map(r=>r.quantity)),feed_kg:feedKg,sample_average_kg:sampleAverage,sample_date:last?.date||null,sample_count:last?.sample_count||null,feed_conversion_estimate:conversion,feed_cost_estimate:feedCost,revenue:allocatedRevenue,paid_expenses:allocatedCost,recorded_result:subtractMoney(allocatedRevenue,allocatedCost),completeness:'Recorded sales less attributed paid costs is not full profit. Opening animal costs and unallocated expenses remain outside this result. Feed consumption cost is a separate estimate, not another cash expense.'};
 });
 const allocatedRevenue=sumMoney(batches.map(b=>b.revenue)),allocatedExpenses=sumMoney(batches.map(b=>b.paid_expenses));
 return {from:data.from,to:data.to,batches,pool:{revenue,expenses,allocated_revenue:allocatedRevenue,allocated_expenses:allocatedExpenses,unallocated_revenue:subtractMoney(revenue,allocatedRevenue),unallocated_expenses:subtractMoney(expenses,allocatedExpenses)},cost_basis:'Confirmed purchase payments are allocated in proportion to their linked purchase-line values. General costs use explicit batch attribution. Feed purchases count once in spending; estimated consumption costs are shown separately.'};
}
export type BatchPerformance=ReturnType<typeof batchPerformance>;
