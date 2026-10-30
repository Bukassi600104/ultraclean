import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmPerformance} from '@/components/manager/FarmPerformance';
export default async function Page({searchParams}:{searchParams:{period_id?:string}}){await requireAdmin();return <><DashboardHeader title="Farm performance"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmPerformance admin/></ManagerPeriodProvider></div></>;}
