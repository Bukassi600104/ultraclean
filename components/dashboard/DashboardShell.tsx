"use client";
import Link from "next/link";
import {useAuth} from "@/contexts/AuthContext";
import {Sidebar} from "./Sidebar";
export function DashboardShell({children}:{children:React.ReactNode}){
 const {profile,isLoading}=useAuth();
 if(isLoading||!profile)return <main className="mx-auto max-w-lg space-y-3 p-6" role="status"><p>Verifying CEO access…</p>{!isLoading&&<Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">Sign in to continue</Link>}</main>;
 if(profile.role!=="admin"||profile.suspended)return <main className="mx-auto max-w-lg space-y-3 p-6" role="alert"><p>CEO access is required for this control centre.</p><Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">Return to sign in</Link></main>;
 return <div data-hq key={profile.id} className="flex h-dvh min-h-0 overflow-hidden bg-[#EEEEFF]"><Sidebar/><main data-ceo-content className="min-w-0 flex-1 overflow-y-auto">{children}</main></div>;
}
