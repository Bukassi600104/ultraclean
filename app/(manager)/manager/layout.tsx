"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/manager/OfflineBanner";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";
import { Menu } from "lucide-react";

// Page title map

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/sales": "Record Sales",
  "/sales/catfish": "Catfish Sales",
  "/sales/cattle": "Cattle Sales",
  "/sales/goat": "Goat Sales",
  "/sales/chicken": "Chicken Sales",
  "/sales/crops": "Crops Sales",
  "/sales/other": "Other Sales",
  "/expenses": "Record Expenses",
  "/expenses/labor": "Labour Expenses",
  "/expenses/feed": "Feed Purchase",
  "/expenses/utilities": "Utilities",
  "/expenses/veterinary": "Veterinary",
  "/expenses/transport": "Transport",
  "/expenses/equipment": "Equipment",
  "/supplies": "Farm Supplies",
  "/inventory": "Inventory",
  "/daily-feed": "Daily Feed",
  "/feed-stock": "Feed Inventory",
  "/stock": "Add Stock",
  "/mortality": "Mortality",
  "/records": "Past Records",
  "/cash": "Cash Summary",
};

// Layout

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline, pendingCount, isSyncing, conflicts } = useOfflineSync();

  const normalised = pathname.replace(/^\/manager/, "") || "/";
  const pageTitle = PAGE_TITLES[normalised] ?? "Farm Portal";

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f4fbf8" }}>
      {/* Sidebar */}
      <ManagerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14"
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid rgba(27,67,50,0.09)",
            boxShadow: "0 1px 6px rgba(27,67,50,0.06)",
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-xl p-2 transition-all active:scale-90"
            style={{ backgroundColor: "#f0fdf4", color: "#1b4332" }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1
            className="font-bold text-base flex-1 truncate"
            style={{ color: "#161d1b" }}
          >
            {pageTitle}
          </h1>

          {/* Primefield brand mark — visible on desktop when sidebar is shown */}
          <span
            className="hidden lg:block text-xs font-semibold"
            style={{ color: "rgba(27,67,50,0.35)" }}
          >
            Primefield Farm
          </span>
        </header>

        {/* Offline/sync banner — only renders when needed */}
        <OfflineBanner
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
        />
        {conflicts.length > 0 && <details className="mx-4 my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">{conflicts.length} saved {conflicts.length === 1 ? "entry needs" : "entries need"} review</summary>
          <p className="mt-2">These entries remain on this device. Their dates have not been changed. Ask Bimbo to resolve closed-day or record conflicts before resubmitting.</p>
          {conflicts.map(item => <div key={item.id} className="mt-3 border-t pt-2"><p className="capitalize">{item.endpoint.replace("/api/farm/", "").replace(/\//g, " ")} · {String(item.data.date ?? item.createdAt)}</p><p className="text-amber-900">{item.conflict}</p><dl className="text-xs mt-1">{Object.entries(item.data).filter(([key,value]) => !key.endsWith("id") && value !== null && typeof value !== "object").map(([key,value]) => <div key={key}><dt className="inline capitalize">{key.replace(/_/g, " ")}: </dt><dd className="inline">{String(value)}</dd></div>)}</dl></div>)}
        </details>}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
