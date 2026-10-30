import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmPurchases} from '@/components/manager/FarmPurchases';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm purchases"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm"><FarmPurchases admin/></ManagerPeriodProvider></div></>;}
