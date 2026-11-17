import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth";
import { FarmOperationalRequests } from "@/components/manager/FarmOperations";
import {ManagerPeriodProvider} from "@/contexts/ManagerPeriodContext";
export default async function Page({searchParams}:{searchParams:{period_id?:string}}){await requireAdmin();return <><DashboardHeader title="Operational Requests"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmOperationalRequests admin/></ManagerPeriodProvider></div></>;}
