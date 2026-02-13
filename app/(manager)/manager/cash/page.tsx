"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerCashPage() {
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadToday() {
      const today = new Date().toISOString().split("T")[0];
      try {
        const [salesRes, expensesRes] = await Promise.all([
          fetch(`/api/farm/sales?limit=100`),
          fetch(`/api/farm/expenses?limit=100`),
        ]);

        const salesData = await salesRes.json();
        const expensesData = await expensesRes.json();

        const sales = (salesData.data || []).filter(
          (s: { date: string }) => s.date === today
        );
        const expenses = (expensesData.data || []).filter(
          (e: { date: string }) => e.date === today
        );

        setTodaySales(
          sales.reduce(
            (sum: number, s: { total_amount: number }) =>
              sum + (s.total_amount || 0),
            0
          )
        );
        setTodayExpenses(
          expenses.reduce(
            (sum: number, e: { amount: number }) => sum + (e.amount || 0),
            0
          )
        );
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadToday();
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        Today&apos;s Cash Summary
      </h2>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Total Sales Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-700">
                  ₦{todaySales.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Total Expenses Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  ₦{todayExpenses.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Net Cash Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${
                    todaySales - todayExpenses >= 0
                      ? "text-green-700"
                      : "text-red-600"
                  }`}
                >
                  ₦{(todaySales - todayExpenses).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-400">
        {new Date().toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
