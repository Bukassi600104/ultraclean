import type { FarmInventoryTransaction } from '@/types';
import { mortalityByProduct } from './farm-inventory';
import { farmProductLabel } from './farm-products';
import type { PerformanceSource } from './farm-batch-performance';
import type { StoreData } from './farm-stock-counts';
import type { PurchaseData } from './farm-purchases';
import type { ManagerReportData, ReportRow } from './manager-reports';
import { sumMoney } from './money';
import { displayRecordValue } from './record-display';

type Quantity = { label: string; amount: number | null; unit: string };
type OverviewInput = {
  report: ManagerReportData; stores: StoreData; purchases: PurchaseData;
  currentPerformance: PerformanceSource; today: string; owed: string; dailyReports: ReportRow[] | null;
  newerFeed?: ReportRow[]|null;
};

export function farmOverview({ report, stores, purchases, currentPerformance, today, owed, dailyReports, newerFeed=[] }: OverviewInput) {
  if (!report.farm) throw Error('Farm finances unavailable');
  const quantities = new Map<string, number>();
  // A whole-product assignment already includes its named batches.
  const wholeProducts = new Set<string>();
  for (const row of report.assets.farm_inventory || []) {
    const key = String(row.product);
    quantities.set(key, Number(row.current_stock));
    wholeProducts.add(key);
  }
  for (const batch of currentPerformance.batches) {
    if (batch.archived_at || wholeProducts.has(batch.product)) continue;
    quantities.set(batch.product, (quantities.get(batch.product) || 0) + Number(batch.head_count));
  }
  const produce: Quantity[] = Array.from(quantities, ([product, amount]) => ({
    label: displayRecordValue(farmProductLabel(product)), amount,
    unit: product === 'catfish' ? 'fish' : ['chicken', 'turkey'].includes(product) ? 'birds'
      : ['goat', 'ram', 'pig', 'cattle'].includes(product) ? 'animals' : 'units',
  })).sort((a, b) => a.label.localeCompare(b.label));
  const eggStores = stores.assets.filter(a => a.resource === 'eggs');
  if (eggStores.length) {
    const known = eggStores.every(a => a.opening_verified && a.quantity != null);
    produce.push({label: 'Eggs in store', amount: known ? eggStores.reduce((n, a) => n + Number(a.quantity), 0) : null, unit: 'eggs'});
  }
  const physicalFeed = stores.assets.filter(a => a.resource === 'feed').map(a => ({
    label: displayRecordValue(a.label), amount: a.quantity, unit: 'bags', usableKg: a.coverage?.usable_kg ?? null,
  }));
  const feedByType=new Map(physicalFeed.map(f=>[f.label.toLowerCase(),f]));
  // A dated purchase or feeding identifies a feed type. Only a physical count establishes its balance.
  const feedRecords=[...(report.records.farm_feed_purchases||[]),...(report.records.farm_daily_feed||[]),...(newerFeed||[])];
  for(const row of feedRecords){
    if(row.voided_at||!row.feed_type||String(row.date)>today)continue;
    const label=displayRecordValue(row.feed_type)+' ('+(row.feed_source?displayRecordValue(row.feed_source):'source not recorded')+')';
    if(!feedByType.has(label.toLowerCase()))feedByType.set(label.toLowerCase(),{label,amount:null,unit:'bags',usableKg:null});
  }
  const feed=Array.from(feedByType.values()).sort((a,b)=>a.label.localeCompare(b.label));
  const mortality = mortalityByProduct((report.records.farm_inventory_transactions || []) as unknown as FarmInventoryTransaction[], report);
  const orders: (PurchaseData['purchases'][number] & { request_id?: string })[] = purchases.purchases;
  const linked = new Set(orders.map(p => p.request_id));
  const requests = (report.decisions.operational_requests || []).filter(r => r.status === 'pending' && !linked.has(String(r.id)));
  const pending = orders.filter(p => p.status === 'pending');
  const observations = currentPerformance.records.filter(r => r.date === today);
  const logs = observations.map(r => {
    const group = currentPerformance.batches.find(b => b.id === r.batch_id);
    const detail=[r.feed_kg!=null?r.feed_kg+' kg of feed':null, r.eggs!=null?r.eggs+' eggs':null].filter(Boolean).join(' · ');
    return {id: r.id, title: group ? [group.site_name, group.name].filter(Boolean).join(' · ') : 'Recorded batch', status: 'Logged', detail,
      path: 'today?date=' + today + '&batch_id=' + r.batch_id + '&record_id=' + r.id};
  });
  for (const b of currentPerformance.batches) {
    if (!b.archived_at && b.expected_dates?.includes(today) && !observations.some(r => r.batch_id === b.id)) {
      logs.push({id: b.id, title: [b.site_name, b.name].filter(Boolean).join(' · '), status: 'Due today', detail:'', path: 'today?date=' + today + '&batch_id=' + b.id});
    }
  }
  return {
    from: report.from, to: report.to, today, produce, feed, feedTypesComplete:newerFeed!==null, mortality, sales: report.farm.revenue, collected: report.farm.collections,
    expenses: report.farm.total_expenses, funds: report.farm.closing_balance, debt: owed,
    requestCount: requests.length, purchaseCount: pending.length, purchaseAmount: sumMoney(pending.map(p => p.total_exact)),
    todayReportsAvailable: dailyReports !== null, dailyReports: (dailyReports || []).filter(r => r.status === 'submitted' && r.report_date === today)
      .map(r => {
        const sections = r.sections as {template_version?: number; area?: string} | null;
        return {id: String(r.id), area: sections?.template_version === 3 ? sections.area : undefined, status: r.reviewed_at ? 'Reviewed' : 'Submitted',
          detail:typeof r.created_by_name==='string'?displayRecordValue(r.created_by_name):''};
      }), logs,
  };
}
export type FarmOverview = ReturnType<typeof farmOverview>;
