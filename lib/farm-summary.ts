import {formatExactCurrency,sumMoney,multiplyMoney} from './money';
import type {FarmControlSource} from './farm-control';
import type {calculateFarmFinance} from './farm-finance-calculations';
import type {PendingExpense} from './operations-cash-validation';
export type ReportingConfig={timezone:string;mortality_alert_count:number|null;feed_alert_days:number|null;display_currency:string|null;exchange_rate:string|null;rate_date:string|null;rate_valid_until:string|null;rate_source:string|null};
export type FarmAlert={id:string;priority:number;title:string;detail:string;href:string;action:string;decision?:"request"|"purchase";funding?:true};

export function fundingEntryName(expense:PendingExpense){
 if(expense.kind==='feed')return 'Feed purchase';
 const {item_name,notes,paid_to}=expense.payload||{};
 const description=[item_name,notes,paid_to].find(value=>typeof value==='string'&&value.trim());
 if(typeof description!=='string')return 'Expense';
 const name=description.trim().replace(/\s+/g,' ');
 return name.length>90?name.slice(0,87)+'…':name;
}
export function farmAlerts(s:Pick<FarmControlSource,'report'|'health'|'currentCredit'|'purchases'|'stores'|'config'|'currentPerformance'>,supervisor=false):FarmAlert[]{
 const alerts:FarmAlert[]=[],add=(id:string,priority:number,title:string,detail:string,path:string,action:string,decision?:FarmAlert['decision'])=>alerts.push({id,priority,title,detail,action,decision,href:'/dashboard/farm/'+path});
 for(const t of s.health.tasks)if(t.status==='overdue'||t.status==='due_today')add(t.id,1,t.title,`${t.batch_name}: ${t.status==='overdue'?'overdue since':'due'} ${t.due_date}`,'health#task-'+t.id,supervisor?'Open task':'Review task');
 for(const i of s.currentCredit.invoices)if(i.overdue_days>0)add(i.id,2,`Invoice ${i.number} overdue`,`${i.customer_name}: ${formatExactCurrency(i.owed,'NGN')} outstanding`,'credit?invoice_id='+i.id+'#invoice-'+i.id,'View invoice');
 for(const p of s.purchases.purchases)if(p.status==='pending')add(p.id,2,'Purchase awaiting decision',`${p.supplier}: ${formatExactCurrency(p.total_exact,'NGN')}`,'purchases?purchase_id='+p.id,supervisor?'View purchase':'Review purchase','purchase');
 const linked=new Set(s.purchases.purchases.map(p=>p.request_id));
 for(const r of s.report.decisions.operational_requests||[])if(r.status==='pending'&&!linked.has(String(r.id)))add(String(r.id),2,'Request awaiting decision',String(r.description),'operational-requests?request_id='+r.id,supervisor?'View request':'Review request','request');
 const emergencyFunding=new Set<string>();
 for(const e of s.purchases.exceptions){
  if(e.resolution||e.funding_status==='posted'||e.funding_status==='declined')continue;
  const purchasePath='purchases'+(!supervisor?'?review_expense='+e.id:'')+'#expense-'+e.id;
  const pendingId=e.funding_status==='pending'?e.pending_funding_id:null;
  if(pendingId)emergencyFunding.add(pendingId);
  if(e.approval||e.funding_status==='pending'){
   alerts.push({id:e.id,priority:1,funding:true,title:e.supplier,detail:formatExactCurrency(e.amount_exact,'NGN')+(e.approval?' · Approved expense':''),
    action:supervisor?'View expense':'Confirm who paid',href:pendingId?'/dashboard/funds?funding_id='+pendingId:'/dashboard/farm/'+purchasePath});
  }else{
   add(e.id,1,supervisor?'Awaiting expense approval':'Review reported expense',e.supplier+' · '+formatExactCurrency(e.amount_exact,'NGN'),purchasePath,supervisor?'View expense':'Review expense');
  }
 }
 for(const c of s.stores.counts)if(!c.decision)add(c.id,2,'Physical count awaiting review',`${c.label}: counted ${c.date}`,'stores#count-'+c.id,supervisor?'View count':'Review count');
 for(const a of s.stores.assets)if(a.resource==='feed'&&s.config?.feed_alert_days&&a.coverage?.days_left!=null&&Number(a.coverage.days_left)<s.config.feed_alert_days)add(a.id,1,'Feed running low',`${a.label}: estimated ${a.coverage.days_left} days`,'stores?view=feed#stock-'+a.id,'View feed');
 for(const e of s.report.cash.pending_expenses)if(e.status==='pending'&&!emergencyFunding.has(e.id)){
  const day=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(e.activity_date+'T12:00:00Z'));
  alerts.push({id:e.id,priority:1,funding:true,title:fundingEntryName(e),action:supervisor?'View expense':'Confirm who paid',
   detail:formatExactCurrency(e.amount,e.currency)+' · '+day,href:'/dashboard/funds?funding_id='+e.id});
 }
 for(const b of s.currentPerformance.batches){
  const deaths=s.currentPerformance.deaths.filter(d=>d.batch_id===b.id),quantity=sumMoney(deaths.map(d=>d.quantity));
  if(Number(quantity)>0)add('loss:'+b.id,1,s.config?.mortality_alert_count&&Number(quantity)>=s.config.mortality_alert_count?'Mortality alert threshold reached':'Recent mortality recorded',`${b.name}: ${quantity} losses since ${s.currentPerformance.from}`,'performance?batch_id='+b.id+'&from='+s.currentPerformance.from+'&to='+s.currentPerformance.to,'View losses');
  if(!b.archived_at&&(b.expected_dates?b.expected_dates.includes(s.currentPerformance.from):b.created_at&&b.created_at.slice(0,10)<s.currentPerformance.from&&Number(b.head_count)>0)&&!s.currentPerformance.records.some(r=>r.batch_id===b.id&&r.date===s.currentPerformance.from))add('log:'+b.id,3,'Daily observation not recorded',`${b.name}: no daily observation for ${s.currentPerformance.from}. Check whether this batch was active that day.`,'today?date='+s.currentPerformance.from+'&batch_id='+b.id,'Open daily log');
 }
 return alerts.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}
export function displayConversion(value:string,c:ReportingConfig|null,date:string){
 if(!c?.display_currency)return null;
 if(!c.exchange_rate||!c.rate_date||!c.rate_valid_until||c.rate_date>date||c.rate_valid_until<date)return 'Display exchange rate unavailable or expired. Original NGN figures apply.';
 return `${formatExactCurrency(multiplyMoney(value,c.exchange_rate),c.display_currency)} display only. Rate ${c.exchange_rate}, ${c.rate_date}, ${c.rate_source}.`;
}
export function farmSummary(s:FarmControlSource,f:Pick<ReturnType<typeof calculateFarmFinance>,'revenue'|'collections'|'total_expenses'>|null){
 if(!f)throw Error('Farm financial summary unavailable');
 const money=(n:string|number)=>formatExactCurrency(n,'NGN'),held=sumMoney(s.report.cash.accounts.filter(a=>a.currency==='NGN'&&a.holder_type!=='awaiting').map(a=>a.closing));
 return [`Primefield Farm report`,`${s.report.from} to ${s.report.to}`,`Scope: ${s.report.manager?.name||'Whole farm'}`,`Sales after credit adjustments: ${money(f.revenue)}`,`Actual collections and legacy cash sales: ${money(f.collections)}`,`Paid operational expenses: ${money(f.total_expenses)}`,`Customer invoices outstanding at ${s.report.to}: ${money(s.credit.summary.owed)}`,`Tracked cash custody at ${s.report.to}: ${money(held)}`,`Cash custody excludes legacy amounts not assigned to a holder.`,...farmAlerts(s).map(a=>`${a.title}: ${a.detail}`),`Recorded at ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Lagos'}).format(new Date(s.asOf))} Africa/Lagos`,...(s.config?.timezone?[`Owner time: ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:s.config.timezone}).format(new Date(s.asOf))} ${s.config.timezone}`]:[])].join('\n');
}
