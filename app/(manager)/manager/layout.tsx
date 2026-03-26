"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/manager/OfflineBanner";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  Receipt,
  Clock,
} from "lucide-react";

const tabs = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: TrendingUp,
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
  },
  {
    href: "/records",
    label: "Records",
    icon: Clock,
  },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f4fbf8" }}
    >
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
          backgroundColor: "rgba(27,67,50,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex">
          {tabs.map((tab) => {
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
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                  style={
                    isActive
                      ? { backgroundColor: "rgba(17,212,105,0.15)" }
                      : {}
                  }
                >
                  <tab.icon
                    className="h-5 w-5 transition-colors"
                    style={{
                      color: isActive ? "#11d469" : "rgba(255,255,255,0.4)",
                    }}
                  />
                </div>
                <span
                  className={isActive ? "font-bold" : ""}
                  style={{
                    color: isActive ? "#11d469" : "rgba(255,255,255,0.4)",
                    fontSize: "11px",
                  }}
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
