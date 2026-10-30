import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmCredit} from '@/components/manager/FarmCredit';
export default async function Page({searchParams}:{searchParams:{period_id?:string}}){await requireAdmin();return <><DashboardHeader title="Farm customers"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmCredit admin/></ManagerPeriodProvider></div></>;}
