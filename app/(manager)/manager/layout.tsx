"use client";

import Link from "next/link";
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-4">
        <div className="font-heading text-lg font-bold">
          <span className="text-green-700">Primefield</span> Farm
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
      />

      {/* Content */}
      <main className="flex-1 pb-20 pt-4">{children}</main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white safe-area-bottom">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-green-700"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
