import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth";
import { FarmDailyReports } from "@/components/manager/FarmOperations";
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Daily Reports"/><div className="mx-auto w-full max-w-7xl p-4 lg:p-8"><FarmDailyReports admin/></div></>;}
