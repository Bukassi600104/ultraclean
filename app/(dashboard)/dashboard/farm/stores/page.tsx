import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmStores} from '@/components/manager/FarmStores';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm stores"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm"><FarmStores admin/></ManagerPeriodProvider></div></>;}
