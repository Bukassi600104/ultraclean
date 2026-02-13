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

export default function FarmExpensesPage() {
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (category !== "all") params.set("category", category);

      try {
        const res = await fetch(`/api/farm/expenses?${params}`);
        const json = await res.json();
        setExpenses(json.data || []);
        setTotal(json.total || 0);
      } catch {
        setExpenses([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [page, category]);

  const totalPages = Math.ceil(total / limit);

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
          <p className="text-sm text-gray-500">{total} total expenses</p>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="feed">Feed</SelectItem>
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
            ) : expenses.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Paid To</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">
                        {format(new Date(e.date), "MMM d")}
                      </TableCell>
                      <TableCell className="capitalize">{e.category}</TableCell>
                      <TableCell className="font-medium">
                        ₦{e.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {e.paid_to || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500 capitalize">
                        {e.payment_method}
                      </TableCell>
                    </TableRow>
                  ))}
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
