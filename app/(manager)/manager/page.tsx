"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/manager/PWAInstallPrompt";
import {
  TrendingUp,
  Receipt,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  BarChart3,
  Clock,
  Wallet,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₦${Math.round(Math.abs(n)).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerHomePage() {
  const { profile } = useAuth();
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [balanceErr, setBalanceErr] = useState(false);
  const [weekSales, setWeekSales] = useState<number | null>(null);
  const [weekExpenses, setWeekExpenses] = useState<number | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    const today = getTodayStr();

    fetch(`/api/farm/balance?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.opening_balance !== undefined) setOpeningBalance(d.opening_balance);
        else setBalanceErr(true);
      })
      .catch(() => setBalanceErr(true));

    const { from, to } = getWeekRange();
    Promise.all([
      fetch(`/api/farm/sales?limit=100`).then((r) => r.json()),
      fetch(`/api/farm/expenses?limit=100`).then((r) => r.json()),
    ])
      .then(([salesData, expData]) => {
        const sales: { date: string; total_amount: number }[] = salesData.data || [];
        const exps: { date: string; amount: number }[] = expData.data || [];
        setWeekSales(
          sales.filter((s) => s.date >= from && s.date <= to).reduce((sum, s) => sum + (s.total_amount || 0), 0)
        );
        setWeekExpenses(
          exps.filter((e) => e.date >= from && e.date <= to).reduce((sum, e) => sum + (e.amount || 0), 0)
        );
      })
      .catch(() => { setWeekSales(0); setWeekExpenses(0); });
  }, []);

  const balancePositive = openingBalance !== null && openingBalance >= 0;
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Balance card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(160deg, #1b4332 0%, #012d1d 100%)" }}
      >
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          {today}
        </p>
        <p className="font-semibold text-white text-base mb-4">
          Welcome back, {profile?.name?.split(" ")[0] ?? "Manager"}
        </p>

        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          Today&apos;s Opening Balance
        </p>
        <div className="flex items-center gap-3">
          {balanceErr ? (
            <p className="text-base" style={{ color: "rgba(255,255,255,0.55)" }}>Balance unavailable</p>
          ) : openingBalance === null ? (
            <div className="h-12 w-44 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          ) : balanceVisible ? (
            <p className="text-4xl font-bold" style={{ color: balancePositive ? "#11d469" : "#ef4444" }}>
              {openingBalance < 0 ? "-" : ""}{fmt(openingBalance)}
            </p>
          ) : (
            <p className="text-4xl font-bold text-white tracking-widest">••••••</p>
          )}
          <button
            onClick={() => setBalanceVisible((v) => !v)}
            className="ml-auto rounded-full p-2"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            aria-label={balanceVisible ? "Hide balance" : "Show balance"}
          >
            {balanceVisible
              ? <EyeOff className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
              : <Eye className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
            }
          </button>
        </div>
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#fff", border: "1px solid rgba(27,67,50,0.08)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>This Week Sales</p>
          {weekSales === null ? (
            <div className="h-7 w-28 rounded-lg animate-pulse" style={{ backgroundColor: "#e8efec" }} />
          ) : (
            <p className="text-xl font-bold" style={{ color: "#11d469" }}>{fmt(weekSales)}</p>
          )}
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#fff", border: "1px solid rgba(27,67,50,0.08)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>This Week Expenses</p>
          {weekExpenses === null ? (
            <div className="h-7 w-28 rounded-lg animate-pulse" style={{ backgroundColor: "#e8efec" }} />
          ) : (
            <p className="text-xl font-bold" style={{ color: "#F5C842" }}>{fmt(weekExpenses)}</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>
          Quick Actions
        </p>
        <div className="space-y-2.5">

          <Link
            href="/sales"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#11d469", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" style={{ color: "#012d1d" }} />
              <span className="font-bold text-sm" style={{ color: "#012d1d" }}>Record Today&apos;s Sales</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "rgba(1,45,29,0.45)" }} />
          </Link>

          <Link
            href="/expenses"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#fffbeb", border: "1.5px solid #fde68a", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5" style={{ color: "#92400e" }} />
              <span className="font-bold text-sm" style={{ color: "#1b4332" }}>Record Today&apos;s Expenses</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "#F5C842" }} />
          </Link>

          <Link
            href="/supplies"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5" style={{ color: "#1d4ed8" }} />
              <span className="font-bold text-sm" style={{ color: "#1e3a8a" }}>Farm Supplies</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "#3b82f6" }} />
          </Link>

          <Link
            href="/inventory"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f3e8ff", border: "1.5px solid #d8b4fe", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5" style={{ color: "#7e22ce" }} />
              <span className="font-bold text-sm" style={{ color: "#581c87" }}>Update Inventory</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "#a855f7" }} />
          </Link>

          <Link
            href="/records"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#eef5f2", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" style={{ color: "#2d6a4f" }} />
              <span className="font-semibold text-sm" style={{ color: "#1b4332" }}>View Past Records</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "#2d6a4f" }} />
          </Link>

          <Link
            href="/cash"
            className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", height: "60px" }}
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5" style={{ color: "#166534" }} />
              <span className="font-semibold text-sm" style={{ color: "#166534" }}>Today&apos;s Cash Summary</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "#16a34a" }} />
          </Link>

        </div>
      </div>

      <PWAInstallPrompt />
    </div>
  );
}
