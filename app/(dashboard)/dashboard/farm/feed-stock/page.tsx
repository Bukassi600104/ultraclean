import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {FeedStock} from "@/components/manager/FeedStock";
import {ManagerPeriodProvider} from "@/contexts/ManagerPeriodContext";
export default function Page({searchParams}:{searchParams:{period_id?:string}}){return <><DashboardHeader title="Feed Inventory"/><ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><FeedStock admin/></ManagerPeriodProvider></>;}
