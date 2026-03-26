"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/manager/OfflineBanner";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  Receipt,
  Clock,
  LogOut,
} from "lucide-react";

const tabs = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    activeColor: "#11d469",
    activeBg: "rgba(17,212,105,0.15)",
  },
  {
    href: "/sales",
    label: "Sales",
    icon: TrendingUp,
    activeColor: "#11d469",
    activeBg: "rgba(17,212,105,0.15)",
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    activeColor: "#F5C842",
    activeBg: "rgba(245,200,66,0.15)",
  },
  {
    href: "/records",
    label: "Records",
    icon: Clock,
    activeColor: "#94a3b8",
    activeBg: "rgba(148,163,184,0.15)",
  },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#0A1628" }}>
      {/* Header */}
      <header
        className="flex h-14 items-center justify-between px-4 shadow-md"
        style={{ backgroundColor: "#0A1628", borderBottom: "1px solid #1e3a5f" }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white px-2 py-1">
            <Image
              src="/primefield-logo.png"
              alt="Primefield Agri-Business Limited"
              width={90}
              height={32}
              className="object-contain"
              priority
            />
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: "#94a3b8" }}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </header>

      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
      />

      {/* Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom tab navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 safe-area-bottom"
        style={{
          backgroundColor: "#0A1628",
          borderTop: "1px solid #1e3a5f",
        }}
      >
        <div className="flex">
          {tabs.map((tab) => {
            // Check if this tab is active
            const normalised = pathname.replace(/^\/manager/, "") || "/";
            const isActive =
              tab.href === "/"
                ? normalised === "/" || normalised === ""
                : normalised === tab.href || normalised.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
                )}
                style={{ color: isActive ? tab.activeColor : "#4b5563" }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                  style={isActive ? { backgroundColor: tab.activeBg } : {}}
                >
                  <tab.icon
                    className="h-5 w-5 transition-colors"
                    style={{ color: isActive ? tab.activeColor : "#4b5563" }}
                  />
                </div>
                <span
                  className={isActive ? "font-bold" : ""}
                  style={{ color: isActive ? tab.activeColor : "#4b5563" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
