"use client";

import { useEffect, useState } from "react";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { SalesTable } from "@/components/dashboard/dba/SalesTable";
import { LogSaleForm } from "@/components/dashboard/dba/LogSaleForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { DBAProduct } from "@/types";

export default function DBASalesPage() {
  const [sales, setSales] = useState<
    { id: string; buyer_name: string; buyer_email: string; amount: number; payment_method: string; created_at: string; product?: { name: string } | null }[]
  >([]);
  const [products, setProducts] = useState<DBAProduct[]>([]);
  const [loadError,setLoadError]=useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showLogSale, setShowLogSale] = useState(false);

  async function loadData() {
    setIsLoading(true);setLoadError("");
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch("/api/dba/sales?limit=50"),
        fetch("/api/dba/products"),
      ]);
      const salesData = await salesRes.json();
      const prods = await prodRes.json();
      if(!salesRes.ok||!prodRes.ok||!Array.isArray(salesData.data)||!Array.isArray(prods))throw Error();
      setSales(salesData.data);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch {
      setLoadError("Sales could not be loaded. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if(loadError)return <DashboardReadError title="DBA Sales" message={loadError} onRetry={()=>void loadData()}/>;
  return (
    <>
      <DashboardHeader title="DBA Sales" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowLogSale(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Sale
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
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
