"use client";
import Link from "next/link";
import {usePathname} from 'next/navigation';
import {useAuth} from "@/contexts/AuthContext";
import {Sidebar} from "./Sidebar";
import {OperationsFeatureProvider} from "@/contexts/ManagerPeriodContext";
export function DashboardShell({children}:{children:React.ReactNode}){
 const {profile,isLoading,error,retry}=useAuth();
 const pathname=usePathname();
 if(pathname==='/login')return <>{children}</>;
 if(error)return <main className="mx-auto max-w-lg space-y-3 p-6" role="alert"><h1 className="text-xl font-semibold">Unable to load your workspace</h1><p>Check your connection and retry. Your saved records have not changed.</p><p className="text-sm">Reference: {error}</p><button onClick={retry} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-white">Retry</button><Link href="/login?reauth=1" className="ml-3 inline-flex min-h-11 items-center underline">Sign in again</Link></main>;
 if(isLoading||!profile)return <main className="mx-auto max-w-lg space-y-3 p-6" role="status"><p>Verifying CEO access...</p>{!isLoading&&<Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">Sign in to continue</Link>}</main>;
 if(profile.role!=="admin"||profile.suspended)return <main className="mx-auto max-w-lg space-y-3 p-6" role="alert"><p>CEO access is required for this control centre.</p><Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">Return to sign in</Link></main>;
 return <OperationsFeatureProvider key={profile.id} actorId={profile.id}><div data-hq className="flex h-dvh min-h-0 overflow-hidden bg-[#EEEEFF]"><Sidebar/><main data-ceo-content className="min-w-0 flex-1 overflow-y-auto">{children}</main></div></OperationsFeatureProvider>;
}
