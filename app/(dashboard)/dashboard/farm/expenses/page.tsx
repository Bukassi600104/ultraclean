"use client";
import { formatCurrency } from "@/lib/utils";
import { FarmAdminCorrection } from "@/components/dashboard/farm/FarmActivityPanel";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";


import type { FarmExpense } from "@/types";

interface FeedPurchase {
  id: string;
  date: string;
  feed_type: string;
  num_bags: number;
  cost: number;
  notes?: string;
  created_at: string;
}

type DisplayRow =
  | { _type: "expense"; data: FarmExpense }
  | { _type: "feed"; data: FeedPurchase };

export default function FarmExpensesPage() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalFeed, setTotalFeed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const limit = 20;

  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setLoadError("");
    const params = new URLSearchParams({page: String(page), limit: String(limit), category});
    fetch(`/api/farm/expense-history?${params}`, {signal: controller.signal, cache: "no-store"})
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; })
      .then(result => {
        if (controller.signal.aborted) return;
        setRows(result.data);
        setTotalExpenses(result.total); setTotalFeed(0);
      })
      .catch(error => { if (error.name !== "AbortError") {setRows([]);setLoadError("Expense history unavailable. Please retry.");} })
      .finally(() => {if (!controller.signal.aborted) setIsLoading(false);});
    return () => controller.abort();
  }, [page, category, version]);

  const combinedTotal = totalExpenses + totalFeed;
  const totalPages = Math.ceil(combinedTotal / limit);

  // Grand total amount for current page
  const pageTotalAmount =
    rows.reduce((sum, row) => sum + Number(row._type === "expense" ? row.data.amount : row.data.cost), 0);

  if(loadError)return <DashboardReadError title="Farm Expenses" message={loadError} onRetry={()=>setVersion(v=>v+1)}/>;
  return (
    <>
      <DashboardHeader title="Farm Expenses" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{combinedTotal} total records</p>
            {pageTotalAmount > 0 && (
              <p className="text-xs text-gray-600">
                Page total: {formatCurrency(pageTotalAmount)}
              </p>
            )}
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="feed">Feed Purchases</SelectItem>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="veterinary">Veterinary</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="produce">Farm Produce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : loadError ? <p className="p-4 text-red-700">Expense records unavailable.</p> : rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Actions</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    if (row._type === "feed") {
                      const f = row.data;
                      return (
                        <TableRow key={`feed-${f.id}`}>
                          <TableCell className="text-sm">
                            {format(new Date(f.date), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              Feed
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 capitalize">
                            {f.feed_type} feed · {f.num_bags} bag{f.num_bags !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(f.cost)}
                          </TableCell><TableCell><FarmAdminCorrection recordType="feed" record={f} onSaved={() => setVersion(v => v + 1)} /></TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-500">
                            —
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const e = row.data;
                    return (
                      <TableRow key={`exp-${e.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(e.date), "MMM d")}
                        </TableCell>
                        <TableCell className="capitalize">{e.category}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {e.category === "produce"
                            ? (e.item_name || e.paid_to || "—")
                            : (e.paid_to || "—")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(e.amount)}
                        </TableCell><TableCell><FarmAdminCorrection recordType="expense" record={e} onSaved={() => setVersion(v => v + 1)} /></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500 capitalize">
                          {e.payment_method}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-12">
                No expense data
              </p>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="flex items-center text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
