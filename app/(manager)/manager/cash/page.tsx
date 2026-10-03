"use client";
import { farmDateToday } from "@/lib/farm-products";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function ManagerCashPage() {
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }));
  }, []);

  const loadToday = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    const today = farmDateToday();
    setError(false);
    try {
      const response = await fetch(`/api/farm/balance?date=${today}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Balance unavailable");
      setTodaySales(data.total_sales_today);
      setTodayExpenses(data.today_total_expenses);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const net = todaySales - todayExpenses;
  const isPositive = net >= 0;

  return (
    <div className="mx-auto max-w-lg px-4">
      {/* Page header with refresh */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "#1B4332" }}>
          Today&apos;s Farm Finances
        </h2>
        <button
          onClick={() => loadToday(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ color: "#1B4332", backgroundColor: "#11d469" + "22" }}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            style={{ color: "#1B4332" }}
          />
          <span style={{ color: "#1B4332" }}>Refresh</span>
        </button>
      </div>

      {error && <p role="alert" className="text-red-600">Could not load financial figures. Please refresh.</p>}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : !error && (
          <>
            {/* Sales card */}
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ backgroundColor: "#F0FBF4", border: "1px solid #b7e8c8" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#2D6A4F" }}>
                  Total Sales Today
                </p>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#11d469" + "33" }}
                >
                  <TrendingUp className="h-5 w-5" style={{ color: "#1B4332" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#1B4332" }}>
                ₦{todaySales.toLocaleString("en-NG")}
              </p>
            </div>

            {/* Expenses card */}
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ backgroundColor: "#FFF5F5", border: "1px solid #fecaca" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-600">
                  Total Expenses Today
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">
                ₦{todayExpenses.toLocaleString("en-NG")}
              </p>
            </div>

            {/* Net card */}
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{
                backgroundColor: isPositive ? "#F0FBF4" : "#FFF5F5",
                border: `1px solid ${isPositive ? "#b7e8c8" : "#fecaca"}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-sm font-medium"
                  style={{ color: isPositive ? "#2D6A4F" : "#dc2626" }}
                >
                  Net Operating Result Today
                </p>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: isPositive ? "#11d469" + "33" : "#fecaca" }}
                >
                  <Wallet
                    className="h-5 w-5"
                    style={{ color: isPositive ? "#1B4332" : "#dc2626" }}
                  />
                </div>
              </div>
              <p
                className="text-3xl font-bold"
                style={{ color: isPositive ? "#1B4332" : "#dc2626" }}
              >
                {isPositive ? "+" : ""}₦{net.toLocaleString("en-NG")}
              </p>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm" style={{ color: "#2D6A4F" }}>
        {dateLabel}
      </p>
    </div>
  );
}
