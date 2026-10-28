import {ManagerReport} from "@/components/dashboard/ManagerReport";import {businessSchema} from "@/lib/operations-cash-validation";
export default function FundsPage({searchParams}:{searchParams:{business?:string}}){const business=businessSchema.safeParse(searchParams.business);return <ManagerReport initialBusiness={business.success?business.data:"farm"} fundsMode/>;}
