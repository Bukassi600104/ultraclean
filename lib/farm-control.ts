import {createServerClient} from '@/lib/supabase/server';
import {summarizeManagerSnapshot,type ManagerSnapshot} from './manager-reports';
import {batchPerformance,type PerformanceSource} from './farm-batch-performance';
import type {ManagerScope} from './manager-period-types';
import type {CreditData} from './farm-credit';
import type {StoreData} from './farm-stock-counts';
import type {HealthData} from './farm-health';
import type {PurchaseData} from './farm-purchases';
import {farmAlerts,farmSummary,type ReportingConfig} from './farm-summary';
export type FarmControlSource={report:ManagerSnapshot;asOf:string;today:string;config:ReportingConfig|null;credit:CreditData;currentCredit:CreditData;stores:StoreData;health:HealthData;purchases:PurchaseData;performance:PerformanceSource;currentPerformance:PerformanceSource};
export async function getFarmControl(scope:ManagerScope,from:string,to:string){
 const db=createServerClient();if(!db)throw Error('Farm reporting unavailable');
 const {data,error}=await db.rpc('farm_control_read',{p_actor:scope.actorId,p_period:scope.periodId,p_from:from,p_to:to});if(error)throw error;
 const source=data as FarmControlSource;
 if(source?.report?.scope?.actorId!==scope.actorId||source.report.scope.periodId!==scope.periodId||source.report.from!==from||source.report.to!==to)throw Error('Farm report scope could not be verified');
 const report=summarizeManagerSnapshot(source.report),performance=batchPerformance(source.performance),alerts=farmAlerts(source);
 const summary=farmSummary(source,report.farm);
 return {...source,report:{...report,records:source.report.records},performance,alerts,summary,whatsappSummary:summary.split('\n').slice(0,9).join('; ')+`; ${alerts.length} current items need attention. Review the Farm control centre for details.`};
}
export type FarmControlData=Awaited<ReturnType<typeof getFarmControl>>;
