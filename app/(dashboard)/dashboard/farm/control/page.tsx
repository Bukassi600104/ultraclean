import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {FarmControl} from '@/components/dashboard/farm/FarmControl';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Farm control centre"/><div className="mx-auto w-full max-w-7xl space-y-5 bg-[#f3f6ef] p-4 lg:p-8"><FarmControl/></div></>;}
