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
import type { FarmSale } from "@/types";

export default function FarmSalesPage() {
  const [sales, setSales] = useState<FarmSale[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (product !== "all") params.set("product", product);

      try {
        const res = await fetch(`/api/farm/sales?${params}`);
        const json = await res.json();
        setSales(json.data || []);
        setTotal(json.total || 0);
      } catch {
        setSales([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [page, product]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <DashboardHeader title="Farm Sales" />
      <div className="p-4 lg:p-8 space-y-4">
        <Link
          href="/dashboard/farm"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Farm Overview
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} total sales</p>
          <Select value={product} onValueChange={(v) => { setProduct(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="catfish">Catfish</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
              <SelectItem value="chicken">Chicken</SelectItem>
              <SelectItem value="other">Other</SelectItem>
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
            ) : sales.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Qty</TableHead>
                    <TableHead className="hidden sm:table-cell">Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">
                        {format(new Date(s.date), "MMM d")}
                      </TableCell>
                      <TableCell>{s.customer_name}</TableCell>
                      <TableCell className="capitalize">{s.product}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.quantity}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        ₦{s.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₦{s.total_amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-12">
                No sales data
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
