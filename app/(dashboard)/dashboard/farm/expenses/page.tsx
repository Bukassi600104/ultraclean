"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
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
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalFeed, setTotalFeed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const expParams = new URLSearchParams();
        expParams.set("page", page.toString());
        expParams.set("limit", limit.toString());
        // Only filter by category for non-feed, non-all selections
        if (category !== "all" && category !== "feed") {
          expParams.set("category", category);
        }

        const feedParams = new URLSearchParams();
        feedParams.set("page", page.toString());
        feedParams.set("limit", limit.toString());

        const fetches: Promise<Response>[] = [];

        // Fetch expenses (skip if filtering by feed-only)
        if (category !== "feed") {
          fetches.push(fetch(`/api/farm/expenses?${expParams}`));
        }
        // Fetch feed purchases (skip if filtering by non-feed category)
        if (category === "all" || category === "feed") {
          fetches.push(fetch(`/api/farm/feed-purchases?${feedParams}`));
        }

        const results = await Promise.all(fetches);

        let expData: FarmExpense[] = [];
        let expTotal = 0;
        let feedData: FeedPurchase[] = [];
        let feedTotal = 0;

        if (category === "feed") {
          const feedJson = await results[0].json();
          feedData = feedJson.data || [];
          feedTotal = feedJson.total || 0;
        } else if (category === "all") {
          const expJson = await results[0].json();
          const feedJson = await results[1].json();
          expData = expJson.data || [];
          expTotal = expJson.total || 0;
          feedData = feedJson.data || [];
          feedTotal = feedJson.total || 0;
        } else {
          const expJson = await results[0].json();
          expData = expJson.data || [];
          expTotal = expJson.total || 0;
        }

        setExpenses(expData);
        setFeedPurchases(feedData);
        setTotalExpenses(expTotal);
        setTotalFeed(feedTotal);
      } catch {
        setExpenses([]);
        setFeedPurchases([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [page, category]);

  // Merge and sort by date desc
  const rows: DisplayRow[] = [
    ...expenses.map((e) => ({ _type: "expense" as const, data: e })),
    ...feedPurchases.map((f) => ({ _type: "feed" as const, data: f })),
  ].sort((a, b) => {
    const dateA = a.data.date;
    const dateB = b.data.date;
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime();
  });

  const combinedTotal = totalExpenses + totalFeed;
  const totalPages = Math.ceil(combinedTotal / limit);

  // Grand total amount for current page
  const pageTotalAmount =
    expenses.reduce((s, e) => s + (e.amount || 0), 0) +
    feedPurchases.reduce((s, f) => s + (f.cost || 0), 0);

  return (
    <>
      <DashboardHeader title="Farm Expenses" />
      <div className="p-4 lg:p-8 space-y-4">
        <Link
          href="/dashboard/farm"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Farm Overview
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{combinedTotal} total records</p>
            {pageTotalAmount > 0 && (
              <p className="text-xs text-gray-400">
                Page total: ₦{pageTotalAmount.toLocaleString()}
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
            ) : rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
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
                            ₦{f.cost.toLocaleString()}
                          </TableCell>
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
                          {e.paid_to || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₦{e.amount.toLocaleString()}
                        </TableCell>
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
