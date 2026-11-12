import type {FarmControlData} from './farm-control';
import type {LegacyManagerSnapshot} from './legacy-manager-export';
import type {ReportRow} from './manager-reports';
import {saleProductLabel} from './farm-products';
import {subtractMoney,sumMoney} from './money';

export const financialDownloadNames = {sales:'Sales',expenditure:'Expenditure',revenue:'Revenue'} as const;
export type FinancialDownload = keyof typeof financialDownloadNames;
export function isFinancialDownload(value: string): value is FinancialDownload {
  return Object.prototype.hasOwnProperty.call(financialDownloadNames,value);
}
const exact = (row:ReportRow,key:string) => {
  const value = row[key+'_exact'] ?? row[key];
  if (typeof value!=='string' && typeof value!=='number') throw Error('A recorded amount is unavailable');
  return sumMoney([value]);
};
const text = (value:unknown) => typeof value==='string'?value:null;

export function farmExportScope(report:FarmControlData['report']):string {
  if (!report.scope.periodId) return 'Whole farm';
  return report.manager?.name ? 'Manager period · '+report.manager.name : 'Selected manager period';
}

export function financialDownload(data:FarmControlData,kind:FinancialDownload):LegacyManagerSnapshot {
  const {report}=data;
  if (!report.farm) throw Error('Farm finances unavailable');
  const rows = (resource:string) => (report.records[resource]||[]).filter(r=>!r.voided_at && typeof r.date==='string' && r.date>=report.from && r.date<=report.to);
  const byDate=(a:ReportRow,b:ReportRow)=>String(a.date).localeCompare(String(b.date));
  const summary:LegacyManagerSnapshot['summary']={Report:financialDownloadNames[kind],From:report.from,Through:report.to,Currency:'NGN'};
  const sheets:LegacyManagerSnapshot['sheets']=[];
  if(kind==='expenditure'){
    const regular=rows('farm_expenses').map(r=>({date:r.date,category:r.category,payee:r.paid_to,description:r.item_name||r.notes,source:'Expense',amount_exact:exact(r,'amount')}));
    const feed=rows('farm_feed_purchases').map(r=>({date:r.date,category:'Feed',payee:r.supplier_name||r.supplier,description:r.feed_type,source:'Feed purchase',amount_exact:exact(r,'cost')}));
    const paid=rows('farm_purchase_payments').map(r=>({date:r.date,category:r.category,payee:r.recipient,description:r.notes,source:'Purchase payment',amount_exact:exact(r,'amount')}));
    const expenses=[...regular,...feed,...paid].sort(byDate);
    summary['Total expenditure']=sumMoney(expenses.map(r=>r.amount_exact));summary['Paid entries']=expenses.length;
    sheets.push({name:'Paid expenses',rows:expenses});
  }else{
    const invoices=new Map(data.credit.invoices.map(i=>[i.id,i]));
    const sales=rows('farm_sales').map(r=>{
      const invoice=invoices.get(String(r.invoice_id));
      return {date:r.date,customer:r.customer_name,invoice:invoice?.number,source:r.invoice_id?'Invoice':'Historical sale',
        product:saleProductLabel({product:String(r.product),egg_batch_id:text(r.egg_batch_id),other_product_name:text(r.other_product_name)}),
        quantity:r.quantity,weight_kg:r.weight_kg,pricing_basis:r.pricing_basis,unit_price_exact:r.unit_price==null&&r.unit_price_exact==null?null:exact(r,'unit_price'),sale_value_exact:exact(r,'total_amount')};
    }).sort(byDate);
    const credits=rows('farm_credit_notes').map(r=>{
      const invoice=invoices.get(String(r.invoice_id));
      return {date:r.date,invoice:invoice?.number,customer:invoice?.customer_name,reason:r.reason,credit_exact:exact(r,'amount')};
    }).sort(byDate);
    const gross=sumMoney(sales.map(r=>r.sale_value_exact)),adjustments=sumMoney(credits.map(r=>r.credit_exact));
    summary['Gross sales']=gross;summary['Invoice credits']=adjustments;summary['Revenue after credits']=subtractMoney(gross,adjustments);
    sheets.push({name:'Sales',rows:sales},{name:'Invoice credits',rows:credits});
    if(kind==='revenue'){
      const receipts=new Map(data.credit.receipts.map(r=>[r.id,r]));
      const collections=[
        ...rows('farm_sales').filter(r=>!r.invoice_id).map(r=>({date:r.date,customer:r.customer_name,source:'Historical cash sale',received_exact:exact(r,'total_amount')})),
        ...rows('farm_customer_receipts').map(r=>({date:r.date,customer:receipts.get(String(r.id))?.customer_name,source:'Customer payment',received_exact:exact(r,'amount')})),
        ...rows('farm_customer_refunds').map(r=>({date:r.date,customer:receipts.get(String(r.receipt_id))?.customer_name,source:'Refund',received_exact:subtractMoney('0',exact(r,'amount'))})),
      ].sort(byDate);
      summary['Net collections']=sumMoney(collections.map(r=>r.received_exact));
      sheets.push({name:'Collections and refunds',rows:collections});
    }
  }
  return {target:{scope:farmExportScope(report)},asOf:data.asOf,summary,sheets,
    attributionNotes:[kind==='expenditure'?'Only posted payments in the selected dates are included.':'Sales use the recorded sale date. Invoice credits use their own date. Owner funding is recorded separately.',
      'The report uses the selected responsibility period. Earlier records without attribution remain in the whole-farm view.']};
}
