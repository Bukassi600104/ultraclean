import { FarmDailyReports } from "@/components/manager/FarmOperations";
import { FarmToday } from "@/components/manager/FarmToday";
import { reportArea } from "@/lib/farm-report-areas";
import { farmDateToday } from "@/lib/farm-products";
import { cashDate } from "@/lib/operations-cash-validation";
import Link from "next/link";
export default function Page({searchParams}:{searchParams:{area?:string;date?:string;whole?:string;report_id?:string}}){
  if(searchParams.report_id)return <FarmDailyReports historyOnly/>;
  const area=reportArea(searchParams.area);
  if(area){
    const date=cashDate.safeParse(searchParams.date??farmDateToday());
    if(!date.success)return <p role="alert">This log has an invalid date. <Link className="font-semibold text-emerald-800 underline" href="?">Choose a date and farm area</Link></p>;
    const activityDate=date.data;
    return <FarmDailyReports key={area.key+activityDate} area={area} activityDate={activityDate}/>;
  }
  return searchParams.whole==='1'?<FarmDailyReports/>:<FarmToday/>;
}
