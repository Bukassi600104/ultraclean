import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmStores} from '@/components/manager/FarmStores';
export default async function Page({searchParams}:{searchParams:{period_id?:string}}){await requireAdmin();return <><DashboardHeader title="Farm stores"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmStores admin/></ManagerPeriodProvider></div></>;}
