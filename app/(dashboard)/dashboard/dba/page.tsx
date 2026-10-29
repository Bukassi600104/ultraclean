"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FinancialPeriodForm, businessMoney } from "@/components/dashboard/BusinessFinancialCharts";
import { farmDateToday } from "@/lib/farm-products";
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
  const [financeError,setFinanceError] = useState(false);
  const [recordsError,setRecordsError] = useState(false);
  const [financeLoading,setFinanceLoading] = useState(true);
  const [summary,setSummary] = useState<{revenue:number}|null>(null);
  const [period,setPeriod] = useState({from:"",to:farmDateToday()});

  async function loadData() {
    setIsLoading(true);setFinanceLoading(true);setFinanceError(false);setRecordsError(false);setSummary(null);
    const params=new URLSearchParams(window.location.search),from=params.get("from")||"0001-01-01",to=params.get("to")||farmDateToday();setPeriod({from:params.get("from")||"",to});
    await Promise.all([
      (async()=>{try {
        const [prodRes,salesRes]=await Promise.all([fetch("/api/dba/products"),fetch("/api/dba/sales?limit=10")]);
        if(!prodRes.ok||!salesRes.ok)throw Error();
        const [prods,salesData]=await Promise.all([prodRes.json(),salesRes.json()]);
        setProducts(Array.isArray(prods)?prods:[]);setSales(salesData.data||[]);
      }catch{setRecordsError(true);}finally{setIsLoading(false);}})(),
      (async()=>{try {
        const response=await fetch(`/api/ceo/overview?from=${from}&to=${to}`);if(!response.ok)throw Error();
        const overview=await response.json();if(overview.dba.error)throw Error();setSummary(overview.dba.data);
      }catch{setFinanceError(true);}finally{setFinanceLoading(false);}})()
    ]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeProducts = products.filter((p) => p.status === "active").length;
  const totalRevenue = summary?.revenue;

  return (
    <>
      <DashboardHeader title="DBA Products" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-6 max-w-7xl">
        <FinancialPeriodForm from={period.from} to={period.to}/>
        {financeError&&<p role="alert" className="text-red-700">DBA finances unavailable. <button className="underline min-h-11" onClick={loadData}>Retry</button></p>}
        <p className="text-xs text-slate-500">The financial amount uses the selected period; the recent-sales list remains a separate history preview. Currency is not recorded in this sales ledger.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px]" />
            ))
          ) : (
            <>
              <SummaryCard
                title="Total Products"
                value={recordsError?"Unavailable":products.length}
                icon={Package}
              />
              <SummaryCard
                title="Active Products"
                value={recordsError?"Unavailable":activeProducts}
                icon={ShoppingBag}
              />
              <SummaryCard
                title="Recorded sales amount"
                value={financeLoading?"Loading…":totalRevenue===undefined?"Unavailable":businessMoney(totalRevenue,null)}
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
            ) : recordsError ? <p className="p-4 text-red-700">Recent sales unavailable.</p> : (
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
