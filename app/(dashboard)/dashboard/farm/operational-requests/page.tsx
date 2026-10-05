import { requireAdmin } from "@/lib/auth";
import { FarmOperationalRequests } from "@/components/manager/FarmOperations";
export default async function Page(){await requireAdmin();return <FarmOperationalRequests admin/>;}
