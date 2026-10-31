import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {FarmReportingSettings} from '@/components/dashboard/farm/FarmReportingSettings';
import {FarmSummarySettings} from '@/components/dashboard/farm/FarmSummarySettings';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm configuration"/><div className="mx-auto w-full max-w-5xl space-y-5 p-4 lg:p-8"><FarmReportingSettings/><FarmSummarySettings/></div></>;}
