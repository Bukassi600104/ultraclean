import {notFound} from "next/navigation";
import {ContentWorkspace} from "@/components/content/ContentWorkspace";
import {ContentConnections} from "@/components/content/ContentConnections";
export default function Page({params}:{params:{section:string}}){if(params.section==='integrations')return <ContentConnections/>;if(!['records','performance','leads','sales','history'].includes(params.section))notFound();return <ContentWorkspace kind={params.section}/>}
