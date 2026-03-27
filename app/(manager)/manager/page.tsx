"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/manager/PWAInstallPrompt";
import { TrendingUp, Receipt, Clock, ChevronRight, LogOut, Eye, EyeOff, Package } from "lucide-react";

function fmt(n: number) {
  return `₦${Math.round(Math.abs(n)).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
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

export default function ManagerHomePage() {
  const { profile, signOut } = useAuth();
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [balanceErr, setBalanceErr] = useState(false);
  const [weekSales, setWeekSales] = useState<number | null>(null);
  const [weekExpenses, setWeekExpenses] = useState<number | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    const today = getTodayStr();

    // Fetch opening balance
    fetch(`/api/farm/balance?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.opening_balance !== undefined) setOpeningBalance(d.opening_balance);
        else setBalanceErr(true);
      })
      .catch(() => setBalanceErr(true));

    // Fetch this week's sales & expenses
    const { from, to } = getWeekRange();
    Promise.all([
      fetch(`/api/farm/sales?limit=100`).then((r) => r.json()),
      fetch(`/api/farm/expenses?limit=100`).then((r) => r.json()),
    ])
      .then(([salesData, expData]) => {
        const sales: { date: string; total_amount: number }[] = salesData.data || [];
        const exps: { date: string; amount: number }[] = expData.data || [];

        const ws = sales
          .filter((s) => s.date >= from && s.date <= to)
          .reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const we = exps
          .filter((e) => e.date >= from && e.date <= to)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        setWeekSales(ws);
        setWeekExpenses(we);
      })
      .catch(() => {
        setWeekSales(0);
        setWeekExpenses(0);
      });
  }, []);

  const balancePositive = openingBalance !== null && openingBalance > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f4fbf8" }}>
      {/* Forest Green Header */}
      <div
        style={{
          background: "linear-gradient(160deg, #1b4332 0%, #012d1d 100%)",
          padding: "48px 20px 80px",
        }}
      >
        {/* Row 1: Logo + Logout */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-white font-bold text-lg tracking-wide">Primefield</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-95"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Row 2+3: Welcome + Name */}
        <p
          className="uppercase tracking-widest text-xs mb-1"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Welcome back
        </p>
        <h1 className="text-2xl font-bold text-white mb-4">
          {profile?.name ?? "Farm Manager"}
        </h1>

        {/* Balance Card */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          <p
            className="uppercase tracking-widest mb-2"
            style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}
          >
            Today&apos;s Opening Balance
          </p>
          <div className="flex items-center gap-3">
            {balanceErr ? (
              <p className="text-base" style={{ color: "rgba(255,255,255,0.6)" }}>
                Balance unavailable
              </p>
            ) : openingBalance === null ? (
              <div
                className="h-12 w-44 rounded-lg animate-pulse"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              />
            ) : balanceVisible ? (
              <p
                className="text-5xl font-bold"
                style={{ color: balancePositive ? "#11d469" : "#ef4444" }}
              >
                {openingBalance < 0 ? "-" : ""}
                {fmt(openingBalance)}
              </p>
            ) : (
              <p className="text-5xl font-bold text-white tracking-widest">••••••</p>
            )}
            <button
              onClick={() => setBalanceVisible((v) => !v)}
              className="ml-auto rounded-full p-2 transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              aria-label={balanceVisible ? "Hide balance" : "Show balance"}
            >
              {balanceVisible ? (
                <EyeOff className="h-4 w-4" style={{ color: "rgba(255,255,255,0.6)" }} />
              ) : (
                <Eye className="h-4 w-4" style={{ color: "rgba(255,255,255,0.6)" }} />
              )}
            </button>
          </div>
        </div>

        {/* Week Stat Pills */}
        <div className="flex gap-3 mt-3">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-xs font-bold" style={{ color: "#11d469" }}>↑</span>
            <div>
              {weekSales === null ? (
                <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              ) : (
                <p className="text-xs font-bold text-white">{fmt(weekSales)}</p>
              )}
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>This Week Sales</p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-xs font-bold" style={{ color: "#F5C842" }}>↓</span>
            <div>
              {weekExpenses === null ? (
                <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              ) : (
                <p className="text-xs font-bold text-white">{fmt(weekExpenses)}</p>
              )}
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>This Week Expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* White Content Card (slides up over header) */}
      <div
        className="relative -mt-8 min-h-[60vh] px-5 pt-6 pb-32"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -4px 20px rgba(27,67,50,0.08)",
        }}
      >
        <p
          className="uppercase tracking-widest mb-4"
          style={{ fontSize: "11px", color: "#6b7280" }}
        >
          Quick Actions
        </p>

        {/* Record Sales */}
        <Link
          href="/sales"
          className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98] mb-3"
          style={{
            backgroundColor: "#11d469",
            height: "64px",
          }}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" style={{ color: "#012d1d" }} />
            <span className="text-base font-bold" style={{ color: "#012d1d" }}>
              Record Today&apos;s Sales
            </span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "rgba(1,45,29,0.5)" }} />
        </Link>

        {/* Record Expenses */}
        <Link
          href="/expenses"
          className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98] mb-3"
          style={{
            backgroundColor: "#fffbeb",
            border: "1.5px solid #F5C842",
            height: "64px",
          }}
        >
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6" style={{ color: "#F5C842" }} />
            <span className="text-base font-bold" style={{ color: "#1b4332" }}>
              Record Today&apos;s Expenses
            </span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "#F5C842" }} />
        </Link>

        {/* Farm Supplies */}
        <Link
          href="/supplies"
          className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            height: "64px",
          }}
        >
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6" style={{ color: "#1d4ed8" }} />
            <span className="text-base font-bold" style={{ color: "#1e3a8a" }}>
              Farm Supplies
            </span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "#3b82f6" }} />
        </Link>

        {/* View Records */}
        <Link
          href="/records"
          className="flex items-center justify-between w-full rounded-2xl px-5 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "#eef5f2",
            height: "64px",
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" style={{ color: "#2d6a4f" }} />
            <span className="text-base font-semibold" style={{ color: "#1b4332" }}>
              View Past Records
            </span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "#2d6a4f" }} />
        </Link>

        <PWAInstallPrompt />
      </div>
    </div>
  );
}
