import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmToday} from '@/components/manager/FarmToday';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Daily farm records"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm"><FarmToday admin/></ManagerPeriodProvider></div></>;}
