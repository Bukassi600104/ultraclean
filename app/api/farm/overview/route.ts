import { NextResponse } from 'next/server';
import { requestManagerScope, managerReadError } from '@/lib/manager-read-api';
import { summarizeManagerSnapshot } from '@/lib/manager-reports';
import { createServerClient } from '@/lib/supabase/server';
import { farmOverview } from '@/lib/farm-overview';
import { farmAlerts } from '@/lib/farm-summary';
import { farmDateToday } from '@/lib/farm-products';
import type { FarmControlSource } from '@/lib/farm-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await requestManagerScope(request, 'farm'), db = createServerClient();
    if (!db) throw Error('Farm records unavailable');
    const today = farmDateToday();
    const {data,error} = await db.rpc('farm_supervisor_overview_read', {p_actor: scope.actorId, p_period: scope.periodId, p_today: today});
    if (error) throw error;
    const source = data as Pick<FarmControlSource,'report'|'stores'|'credit'|'purchases'|'health'|'currentPerformance'>;
    if (source?.report?.scope.actorId !== scope.actorId || source.report.scope.periodId !== scope.periodId || source.report.scope.business !== 'farm' || source.report.to !== today) throw Error('Farm overview scope unavailable');
    const report = summarizeManagerSnapshot(source.report);
    const overview = farmOverview({...source, report, today, owed: source.credit.summary.owed, dailyReports: report.records.farm_daily_reports});
    const alerts = farmAlerts({...source, currentCredit: source.credit, config: null}, true);
    return NextResponse.json({overview, alerts}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    return managerReadError(error);
  }
}
