"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { SalesTable } from "@/components/dashboard/dba/SalesTable";
import { LogSaleForm } from "@/components/dashboard/dba/LogSaleForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, DollarSign, Package, Plus } from "lucide-react";
import type { DBAProduct } from "@/types";

export default function DBAOverviewPage() {
  const [products, setProducts] = useState<DBAProduct[]>([]);
  const [sales, setSales] = useState<
    { id: string; buyer_name: string; buyer_email: string; amount: number; payment_method: string; created_at: string; product?: { name: string } | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogSale, setShowLogSale] = useState(false);

  async function loadData() {
    try {
      const [prodRes, salesRes] = await Promise.all([
        fetch("/api/dba/products"),
        fetch("/api/dba/sales?limit=10"),
      ]);
      const prods = await prodRes.json();
      const salesData = await salesRes.json();
      setProducts(Array.isArray(prods) ? prods : []);
      setSales(salesData.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeProducts = products.filter((p) => p.status === "active").length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <>
      <DashboardHeader title="DBA Products" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px]" />
            ))
          ) : (
            <>
              <SummaryCard
                title="Total Products"
                value={products.length}
                icon={Package}
              />
              <SummaryCard
                title="Active Products"
                value={activeProducts}
                icon={ShoppingBag}
              />
              <SummaryCard
                title="Revenue (recent)"
                value={`$${totalRevenue.toFixed(2)}`}
                icon={DollarSign}
              />
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/dashboard/dba/products">
              <Package className="mr-2 h-4 w-4" />
              Manage Products
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLogSale(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Sale
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <SalesTable sales={sales} />
            )}
          </CardContent>
        </Card>
      </div>

      <LogSaleForm
        open={showLogSale}
        onClose={() => setShowLogSale(false)}
        products={products}
        onSuccess={loadData}
      />
    </>
  );
}
