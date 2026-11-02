"use client";

import {ManagerHandoverGate} from "@/components/manager/ManagerHandover";
import {ManagerPeriodProvider} from "@/contexts/ManagerPeriodContext";
import { useState } from "react";
import {isTechnicalMessage,displayRecordValue} from "@/lib/record-display";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {operationalBackLink} from "@/lib/dashboard-navigation";
import {confirmUnsavedNavigation} from "@/lib/confirm-navigation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/manager/OfflineBanner";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";
import {FarmMobileNav} from '@/components/manager/FarmMobileNav';
import {PrepareFarmOfflineWorkspace} from '@/components/offline/PrepareFarmOfflineWorkspace';
import { ArrowLeft, Menu } from "lucide-react";

const queuedFieldLabels: Record<string,string> = {
 date:"Activity date",report_date:"Report date",request_date:"Request date",product:"Product",other_product_name:"Product name",quantity:"Quantity",weight_kg:"Weight (kg)",unit_price:"Price",total_amount:"Sale value",amount:"Amount",cost:"Cost",category:"Category",description:"Description",notes:"Notes",reason:"Reason",cause:"Cause",customer_name:"Customer",customer_phone:"Customer contact",feed_type:"Feed for",feed_source:"Feed source",num_bags:"Bags purchased",bags_opened:"Bags opened",bags:"Bags",local_feed:"Local feed used",foreign_feed:"Foreign feed used",feed_kg:"Feed used (kg)",deaths:"Deaths",eggs:"Eggs",sample_weight_kg:"Sample weight (kg)",sample_count:"Animals sampled",expense_source:"Paid from",funding_source:"Paid from",pricing_basis:"Price measured by",gender:"Sex",decision_required:"CEO decision needed"
};
const queuedEntryNames:Record<string,string>={"/api/farm/sales":"Sale","/api/farm/expenses":"Expense","/api/farm/feed-purchases":"Feed purchase","/api/farm/daily-feed":"Daily feeding","/api/farm/daily-reports/submit":"Daily report","/api/farm/operational-requests":"Operational request","/api/farm/batch-records":"Batch daily record","/api/farm/inventory/transaction":"Stock or mortality entry"};

// Page title map

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/today": "Today",
  "/purchases": "Purchases & Deliveries",
  "/credit": "Customers and payments",
  "/stores": "Physical Counts & Eggs",
  "/health": "Health tasks",
  "/performance": "Batch performance",
  "/sales": "Record Sales",
  "/sales/catfish": "Catfish Sales",
  "/sales/cattle": "Cattle Sales",
  "/sales/goat": "Goat Sales",
  "/sales/chicken": "Chicken Sales",
  "/sales/pig": "Pig Sales",
  "/sales/turkey": "Turkey Sales",
  "/sales/crops": "Crops Sales",
  "/sales/other": "Other Sales",
  "/expenses": "Record Expenses",
  "/expenses/labor": "Labour Expenses",
  "/expenses/feed": "Feed Purchase",
  "/expenses/utilities": "Utilities",
  "/expenses/veterinary": "Veterinary",
  "/expenses/transport": "Transport",
  "/expenses/equipment": "Equipment",
  "/expenses/produce": "Farm Produce",
  "/expenses/other": "Other Expenses",
  "/daily-report": "Daily Report",
  "/daily-report/history": "Daily Report History",
  "/operational-requests": "Operational Requests",
  "/supplies": "Farm Supplies",
  "/inventory": "Farm Inventory",
  "/daily-feed": "Daily Feed",
  "/feed-stock": "Feed Inventory",
  "/stock": "Add Stock",
  "/mortality": "Mortality",
  "/records": "Past Records",
  "/cash": "Cash Summary",
};

// Layout

function ManagerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline, pendingCount, isSyncing, conflicts, quarantinedCount, retryEntry } = useOfflineSync();

  const normalised = pathname.replace(/^\/manager/, "") || "/";
  const pageTitle = PAGE_TITLES[normalised] ?? "Farm Portal";
  const back=operationalBackLink(pathname,"manager");

  return (
    <div onClickCapture={confirmUnsavedNavigation} className="flex min-h-screen" style={{ backgroundColor: "#f4fbf8" }}>
      <PrepareFarmOfflineWorkspace/>
      {/* Sidebar */}
      <ManagerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex min-h-14 items-center gap-3 px-4 py-2"
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

          <div className="min-w-0 flex-1">{back&&<Link href={back.href} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-800"><ArrowLeft aria-hidden="true" className="h-4 w-4"/>{back.label}</Link>}<h1
            className="font-bold text-base truncate"
            style={{ color: "#161d1b" }}
          >
            {pageTitle}
          </h1></div>

          {/* Primefield brand mark — visible on desktop when sidebar is shown */}
          <span
            className="hidden lg:block text-xs font-semibold"
            style={{ color: "rgba(27,67,50,0.35)" }}
          >
            Primefield Farm
          </span>
        </header>

        {/* Offline/sync banner — only renders when needed */}
        {quarantinedCount>0&&<p role="status" className="mx-auto max-w-3xl p-3 text-sm text-amber-900">Older offline entries are retained on this device for review. They will not be submitted under this account.</p>}
        <OfflineBanner
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
        />
        {conflicts.length > 0 && <details className="mx-4 my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">{conflicts.length} saved {conflicts.length === 1 ? "entry needs" : "entries need"} review</summary>
          <p className="mt-2">These entries remain on this device. Their dates have not been changed. Ask Bimbo to resolve closed-day or record conflicts before resubmitting.</p>
          {conflicts.map(item => <div key={item.id} className="mt-3 border-t pt-2"><p className="capitalize">{queuedEntryNames[item.endpoint]||"Saved farm entry"} · {String(item.data.date ?? item.data.report_date ?? item.data.request_date ?? item.createdAt)}</p><p className="text-amber-900">{isTechnicalMessage(item.conflict||"")?"This entry needs review before it can be sent. Ask Bimbo to check the original entry, then retry after the issue is resolved.":item.conflict}</p><button disabled={isSyncing} className="mt-1 min-h-11 rounded-lg border border-amber-400 px-3 font-semibold disabled:opacity-50" onClick={()=>void retryEntry(item.id)}>Retry original entry after resolution</button><dl className="text-xs mt-1">{Object.entries(item.data).filter(([key,value]) => key in queuedFieldLabels && value !== null && typeof value !== "object").map(([key,value]) => <div key={key}><dt className="inline">{queuedFieldLabels[key]}: </dt><dd className="inline">{displayRecordValue(value)}</dd></div>)}</dl></div>)}
        </details>}

        {/* Page content */}
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-4 pb-24 lg:p-6">
          {children}
        </main>
        <FarmMobileNav onMore={()=>setSidebarOpen(true)}/>
      </div>
    </div>
  );
}

export default function ManagerLayout({children}:{children:React.ReactNode}){const path=usePathname();if(path==="/manager/login"||path==="/login")return <>{children}</>;return <ManagerPeriodProvider business="farm"><ManagerHandoverGate><ManagerShell>{children}</ManagerShell></ManagerHandoverGate></ManagerPeriodProvider>;}
