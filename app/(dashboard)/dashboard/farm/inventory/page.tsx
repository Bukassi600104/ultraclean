"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Skull, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import type { FarmInventory, FarmInventoryTransaction } from "@/types";

interface MortalitySummary {
  product: string;
  total_deaths: number;
  current_stock: number;
  mortality_rate: number;
}

export default function FarmInventoryPage() {
  const [inventory, setInventory] = useState<FarmInventory[]>([]);
  const [mortalityLog, setMortalityLog] = useState<FarmInventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, mortRes] = await Promise.all([
          fetch("/api/farm/inventory"),
          fetch("/api/farm/inventory/transaction?action=mortality"),
        ]);
        const invData = await invRes.json();
        const mortData = await mortRes.json();
        setInventory(Array.isArray(invData) ? invData : []);
        setMortalityLog(mortData.data || []);
      } catch {
        setInventory([]);
        setMortalityLog([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Calculate mortality rate per product
  const mortalitySummary: MortalitySummary[] = inventory.map((inv) => {
    const deaths = mortalityLog
      .filter((m) => m.product === inv.product)
      .reduce((sum, m) => sum + m.quantity, 0);
    const total = inv.current_stock + deaths; // current_stock + total deaths = original stock
    const rate = total > 0 ? Math.round((deaths / total) * 100) : 0;
    return {
      product: inv.product,
      total_deaths: deaths,
      current_stock: inv.current_stock,
      mortality_rate: rate,
    };
  });

  return (
    <>
      <DashboardHeader title="Farm Inventory" />
      <div className="p-4 lg:p-8 space-y-6">
        <Link
          href="/dashboard/farm"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Farm Overview
        </Link>

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="mortality">Mortality</TabsTrigger>
          </TabsList>

          {/* ── Stock Tab ── */}
          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Stock Levels</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : inventory.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium capitalize">
                            {item.product}
                          </TableCell>
                          <TableCell>{item.current_stock}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                item.current_stock > 10
                                  ? "bg-green-100 text-green-700"
                                  : item.current_stock > 0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              {item.current_stock > 10
                                ? "In Stock"
                                : item.current_stock > 0
                                  ? "Low"
                                  : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(item.last_updated).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No inventory data
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Mortality Tab ── */}
          <TabsContent value="mortality" className="mt-4 space-y-5">
            {/* Mortality Rate Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))
                : mortalitySummary.map((s) => (
                    <Card key={s.product}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-500 capitalize mb-1">
                              {s.product}
                            </p>
                            <p className="text-3xl font-bold text-red-600">
                              {s.mortality_rate}%
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              mortality rate
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                              <Skull className="h-5 w-5 text-red-400" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                          <span>
                            <span className="font-semibold text-red-600">
                              {s.total_deaths}
                            </span>{" "}
                            died
                          </span>
                          <span>
                            <span className="font-semibold text-gray-700">
                              {s.current_stock}
                            </span>{" "}
                            remaining
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            {/* Mortality Log Table */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base">Mortality Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : mortalityLog.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date of Mortality</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Deaths</TableHead>
                        <TableHead>Cause</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mortalityLog.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {m.date
                              ? format(new Date(m.date), "dd MMM yyyy")
                              : format(new Date(m.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="capitalize">
                            {m.product}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-red-600">
                              {m.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {m.reason || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-400">
                            {m.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No mortality records yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
