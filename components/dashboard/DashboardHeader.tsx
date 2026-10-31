"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { dashboardBackLink } from "@/lib/dashboard-navigation";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  actions,
}: DashboardHeaderProps) {
  const pathname=usePathname(),back = dashboardBackLink(pathname),[farmQuery,setFarmQuery]=useState("");
  useEffect(()=>{const source=new URLSearchParams(window.location.search),q=new URLSearchParams();for(const key of ["from","to","period_id"]){const value=source.get(key);if(value)q.set(key,value);}setFarmQuery(q.toString());},[pathname]);
  return (
    <header className="sticky top-0 z-10 flex min-h-20 flex-wrap gap-3 py-2 items-center justify-between border-b border-gray-200/80 bg-white/85 backdrop-blur-md px-4 lg:px-8 shrink-0">
      <div className="min-w-0 flex-1 basis-48 pl-12 lg:pl-0">
        {back && <Link href={back.href+(back.href==="/dashboard/farm/control"&&farmQuery?"?"+farmQuery:"")} className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 min-h-11" aria-label={back.label}><ArrowLeft className="h-3 w-3" aria-hidden="true"/>{back.label}</Link>}
        <h1 className="font-heading break-words text-lg font-bold text-gray-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 break-words text-xs leading-5 text-gray-600">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function DashboardReadError({title,message,onRetry}:{title:string;message:string;onRetry:()=>void}){
 return <><DashboardHeader title={title}/><section className="mx-auto w-full max-w-xl space-y-4 p-4 text-slate-900 sm:p-6" role="alert"><p>{message}</p><button className="min-h-11 rounded-lg border bg-white px-4 py-2 text-sm font-semibold" onClick={onRetry}>Retry loading records</button></section></>;
}
