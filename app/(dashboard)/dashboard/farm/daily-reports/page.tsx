import { requireAdmin } from "@/lib/auth";
import { FarmDailyReports } from "@/components/manager/FarmOperations";
export default async function Page(){await requireAdmin();return <FarmDailyReports admin/>;}
