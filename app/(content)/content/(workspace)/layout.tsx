import {ManagerPeriodProvider} from "@/contexts/ManagerPeriodContext";
import {ContentIdentity} from "@/components/content/ContentIdentity";
import {redirect} from "next/navigation";
import {requireContentManager} from "@/lib/auth";
import {ContentShell} from "@/components/content/ContentShell";
export default async function Layout({children}:{children:React.ReactNode}){let actor;try{actor=await requireContentManager()}catch{redirect('/content/login')}return <ManagerPeriodProvider business="content" actorId={actor.id}><ContentIdentity actorId={actor.id}><ContentShell admin={actor.role==='admin'}>{children}</ContentShell></ContentIdentity></ManagerPeriodProvider>}
