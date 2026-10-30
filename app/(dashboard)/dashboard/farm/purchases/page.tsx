import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmPurchases} from '@/components/manager/FarmPurchases';
export default async function Page({searchParams}:{searchParams:{period_id?:string}}){await requireAdmin();return <><DashboardHeader title="Farm purchases"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmPurchases admin/></ManagerPeriodProvider></div></>;}
