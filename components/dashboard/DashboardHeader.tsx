"use client";
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
  const back = dashboardBackLink(usePathname());
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/85 backdrop-blur-md px-4 lg:px-8 shrink-0">
      <div className="pl-12 lg:pl-0 min-w-0">
        {back && <Link href={back.href} className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 min-h-6" aria-label={back.label}><ArrowLeft className="h-3 w-3" aria-hidden="true"/>{back.label}</Link>}
        <h1 className="font-heading text-lg font-bold text-gray-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-none mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>
      )}
    </header>
  );
}
