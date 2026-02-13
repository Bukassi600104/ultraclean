"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FarmInventory } from "@/types";

export default function FarmInventoryPage() {
  const [inventory, setInventory] = useState<FarmInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/farm/inventory");
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
      } catch {
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

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
      </div>
    </>
  );
}
