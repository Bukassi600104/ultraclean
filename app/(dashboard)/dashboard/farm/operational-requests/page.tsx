import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth";
import { FarmOperationalRequests } from "@/components/manager/FarmOperations";
export default async function Page(){await requireAdmin();return <><DashboardHeader title="Operational Requests"/><FarmOperationalRequests admin/></>;}
