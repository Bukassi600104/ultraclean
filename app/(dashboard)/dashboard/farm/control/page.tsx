import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {FarmControl} from '@/components/dashboard/farm/FarmControl';
export default async function Page(){const ceo=await requireAdmin();return <><DashboardHeader title="Farm overview"/><div className="mx-auto min-h-full w-full max-w-7xl space-y-5 bg-[#edf2ea] p-4 lg:px-8 lg:py-6"><FarmControl name={ceo.name}/></div></>;}
