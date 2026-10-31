import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmBatches} from '@/components/dashboard/farm/FarmBatches';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm sites and named batches"/><div className="mx-auto w-full max-w-6xl space-y-5 p-4 lg:p-8"><ManagerPeriodProvider business="farm"><FarmBatches/></ManagerPeriodProvider></div></>;}
