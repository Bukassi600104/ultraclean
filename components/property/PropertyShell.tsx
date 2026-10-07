"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { propertyKinds } from "@/lib/property";

const PropertyActorContext = createContext("");
export function usePropertyActor() {return useContext(PropertyActorContext);}
export default function PropertyShell({children, isAdmin, actorId}: {children: React.ReactNode; isAdmin: boolean; actorId: string}) {
  const pathname = usePathname(), router = useRouter();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const links = [{href: "/property", label: "Overview"}, ...Object.entries(propertyKinds).map(([key, value]) => ({href: `/property/${key}`, label: value.label})), {href: "/property/history", label: "Activity history"}];
  async function logout() {
    setBusy(true);setError("");
    try {const db = createClient();if (!db) throw new Error();const {error: failure} = await db.auth.signOut();if (failure) throw failure;router.replace("/property/login");router.refresh();}
    catch {setError("Unable to sign out. Please retry.");}finally {setBusy(false);}
  }
  return <PropertyActorContext.Provider value={actorId}><div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white px-4 py-4 sm:px-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <Link href="/property" aria-label="Property Manager home"><Image src="/bossbiz-logo.png" width={48} height={48} alt="BossBimbz" className="h-12 w-auto object-contain" /></Link>
      <span className="font-semibold">Property Manager</span><div className="flex items-center gap-3">{isAdmin && <Link href="/dashboard" className="rounded-lg px-3 py-3 text-sm text-teal-800 hover:bg-teal-50">CEO Dashboard</Link>}<button disabled={busy} onClick={logout} className="min-h-11 rounded-lg border px-3 text-sm">{busy ? "Signing out…" : "Sign out"}</button></div>
    </div></header>
    <nav aria-label="Property navigation" className="border-b bg-white"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-3 text-sm ${pathname === link.href ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-600 hover:bg-slate-50"}`}>{link.label}</Link>)}</div></nav>
    {error && <p role="alert" className="mx-auto max-w-7xl px-4 pt-4 text-red-700">{error}</p>}
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
  </div></PropertyActorContext.Provider>;
}
