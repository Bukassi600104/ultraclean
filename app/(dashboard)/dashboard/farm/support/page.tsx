import Link from 'next/link';
import {requireAdmin} from '@/lib/auth';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {FarmSupportAccess} from '@/components/dashboard/farm/FarmSupportAccess';
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Limited Farm support access"/><div className="mx-auto w-full max-w-5xl space-y-5 p-4 lg:p-8"><Link className="inline-flex min-h-11 items-center underline text-emerald-900" href="/dashboard/farm/control">Back to Farm control centre</Link><FarmSupportAccess/></div></>;}
