"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/manager/PWAInstallPrompt";
import { TrendingUp, Receipt, Clock } from "lucide-react";

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
  const { profile } = useAuth();
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [balanceErr, setBalanceErr] = useState(false);
  const [weekSales, setWeekSales] = useState<number | null>(null);
  const [weekExpenses, setWeekExpenses] = useState<number | null>(null);

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
    <div className="min-h-screen px-4 pt-6 pb-32" style={{ backgroundColor: "#0A1628" }}>
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Welcome back
        </p>
        <h1 className="text-2xl font-bold text-white">
          {profile?.name ?? "Farm Manager"}
        </h1>
        <p className="text-sm font-medium" style={{ color: "#11d469" }}>
          Primefield Farm
        </p>
      </div>

      {/* Opening Balance Card */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>
          Today&apos;s Opening Balance
        </p>
        {balanceErr ? (
          <p className="text-base" style={{ color: "#94a3b8" }}>
            Balance unavailable
          </p>
        ) : openingBalance === null ? (
          <div className="h-10 w-40 rounded-lg animate-pulse" style={{ backgroundColor: "#1e3a5f" }} />
        ) : (
          <p
            className="text-4xl font-bold"
            style={{ color: balancePositive ? "#11d469" : "#ef4444" }}
          >
            {openingBalance < 0 ? "-" : ""}
            {fmt(openingBalance)}
          </p>
        )}
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" style={{ color: "#11d469" }} />
            <p className="text-xs font-semibold" style={{ color: "#94a3b8" }}>
              This Week&apos;s Sales
            </p>
          </div>
          {weekSales === null ? (
            <div className="h-7 w-24 rounded animate-pulse" style={{ backgroundColor: "#1e3a5f" }} />
          ) : (
            <p className="text-xl font-bold text-white">{fmt(weekSales)}</p>
          )}
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4" style={{ color: "#F5C842" }} />
            <p className="text-xs font-semibold" style={{ color: "#94a3b8" }}>
              This Week&apos;s Expenses
            </p>
          </div>
          {weekExpenses === null ? (
            <div className="h-7 w-24 rounded animate-pulse" style={{ backgroundColor: "#1e3a5f" }} />
          ) : (
            <p className="text-xl font-bold text-white">{fmt(weekExpenses)}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Link
          href="/sales"
          className="flex items-center justify-between w-full rounded-2xl px-5 py-5 text-white font-semibold text-lg transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#11d469", color: "#0A1628" }}
        >
          <span>Record Today&apos;s Sales</span>
          <TrendingUp className="h-6 w-6" />
        </Link>

        <Link
          href="/expenses"
          className="flex items-center justify-between w-full rounded-2xl px-5 py-5 font-semibold text-lg transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#112240", border: "2px solid #F5C842", color: "#F5C842" }}
        >
          <span>Record Today&apos;s Expenses</span>
          <Receipt className="h-6 w-6" />
        </Link>

        <Link
          href="/records"
          className="flex items-center justify-between w-full rounded-2xl px-5 py-5 font-semibold text-lg transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f", color: "white" }}
        >
          <span>View Past Records</span>
          <Clock className="h-6 w-6" style={{ color: "#94a3b8" }} />
        </Link>
      </div>

      <PWAInstallPrompt />
    </div>
  );
}
