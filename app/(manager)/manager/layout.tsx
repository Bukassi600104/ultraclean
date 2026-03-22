"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/manager/OfflineBanner";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Receipt,
  Package,
  Wallet,
  LogOut,
} from "lucide-react";

const tabs = [
  {
    href: "/sales",
    label: "Sales",
    icon: DollarSign,
    color: "#16a34a",        // green-600
    bgColor: "#dcfce7",      // green-100
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    color: "#dc2626",        // red-600
    bgColor: "#fee2e2",      // red-100
  },
  {
    href: "/inventory",
    label: "Stock",
    icon: Package,
    color: "#2563eb",        // blue-600
    bgColor: "#dbeafe",      // blue-100
  },
  {
    href: "/cash",
    label: "Cash",
    icon: Wallet,
    color: "#d97706",        // amber-600
    bgColor: "#fef3c7",      // amber-100
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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F9F7F2" }}>
      {/* Header */}
      <header
        className="flex h-16 items-center justify-between px-4 shadow-md"
        style={{ backgroundColor: "#1B4332" }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white px-2 py-1">
            <Image
              src="/primefield-logo.png"
              alt="Primefield Agri-Business Limited"
              width={100}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm font-semibold text-white/80">Farm Manager</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20"
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
      <main className="flex-1 pb-24 pt-5">{children}</main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white safe-area-bottom shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname === `/manager${tab.href}`;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive ? "" : "text-gray-400 hover:text-gray-600"
                )}
                style={isActive ? { color: tab.color } : {}}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                  style={
                    isActive
                      ? { backgroundColor: tab.bgColor }
                      : { backgroundColor: "transparent" }
                  }
                >
                  <tab.icon
                    className="h-5 w-5 transition-colors"
                    style={isActive ? { color: tab.color } : { color: "#9ca3af" }}
                  />
                </div>
                <span
                  className={isActive ? "font-bold" : ""}
                  style={isActive ? { color: tab.color } : {}}
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
