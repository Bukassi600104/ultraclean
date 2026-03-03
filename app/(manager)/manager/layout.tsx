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
  { href: "/manager/sales", label: "Sales", icon: DollarSign },
  { href: "/manager/expenses", label: "Expenses", icon: Receipt },
  { href: "/manager/inventory", label: "Stock", icon: Package },
  { href: "/manager/cash", label: "Cash", icon: Wallet },
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
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive ? "text-[#1B4332]" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                    isActive ? "bg-[#11d469]/20" : "bg-transparent"
                  )}
                >
                  <tab.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-[#1B4332]" : "text-gray-400"
                    )}
                  />
                </div>
                <span className={isActive ? "font-semibold text-[#1B4332]" : ""}>
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
