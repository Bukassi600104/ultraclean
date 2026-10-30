import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmHealth} from '@/components/manager/FarmHealth';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm health"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm"><FarmHealth admin/></ManagerPeriodProvider></div></>;}
