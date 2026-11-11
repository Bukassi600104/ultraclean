import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth";
import { FarmDailyReports } from "@/components/manager/FarmOperations";
import { ManagerPeriodProvider } from "@/contexts/ManagerPeriodContext";
export default async function Page({searchParams}:{searchParams:{period_id?:string;report_id?:string}}){await requireAdmin();return <><DashboardHeader title="Daily Reports"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FarmDailyReports key={searchParams.report_id||"history"} admin/></ManagerPeriodProvider></div></>;}
