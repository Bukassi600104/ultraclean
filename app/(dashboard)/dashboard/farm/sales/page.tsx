"use client";
import Link from "next/link";
import {saleProductLabel} from "@/lib/farm-products";
import {SalePaymentDetails} from "@/components/manager/SalePaymentDetails";
import { formatCurrency } from "@/lib/utils";
import { livestockGroupLabel } from "@/lib/farm-livestock-categories";
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

import { PenLine } from "lucide-react";
import type { FarmSale } from "@/types";

export default function FarmSalesPage({searchParams={}}:{searchParams?:Record<string,string|undefined>}) {
  const [sales, setSales] = useState<FarmSale[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError,setLoadError]=useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState("all");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const limit = 20;
  const scope=new URLSearchParams();
  for(const key of ["from","to","period_id","manager_id"]){const value=searchParams[key];if(value)scope.set(key,value);}
  const filters=scope.toString();

  useEffect(() => {
    const controller=new AbortController();
    async function load() {
      setIsLoading(true);setLoadError("");
      const params = new URLSearchParams(filters);
      params.set("with_payment","1");
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (product !== "all") params.set("product", product);

      try {
        const res = await fetch(`/api/farm/sales?${params}`,{signal:controller.signal,cache:"no-store"});
        const json = await res.json();
        if(!res.ok||!Array.isArray(json.data))throw Error();
        setSales(json.data);
        setTotal(json.total || 0);
      } catch {
        if(!controller.signal.aborted)setLoadError("Farm sales could not be loaded. Please retry.");
      } finally {
        if(!controller.signal.aborted)setIsLoading(false);
      }
    }
    load();return()=>controller.abort();
  }, [page, product, version, filters]);

  const totalPages = Math.ceil(total / limit);

  if(loadError)return <DashboardReadError title="Farm Sales" message={loadError} onRetry={()=>setVersion(v=>v+1)}/>;
  return (
    <>
      <DashboardHeader title="Farm Sales" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
        
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600">{total} sales{scope.get("from")?" from "+scope.get("from"):""}{scope.get("to")?" to "+scope.get("to"):""}</p><Link className="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={"/dashboard/farm/credit?"+filters}>Customers &amp; payments</Link></div>
          <Select value={product} onValueChange={(v) => { setProduct(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="catfish">Catfish</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
              <SelectItem value="chicken">Chicken</SelectItem>
              <SelectItem value="eggs">Eggs</SelectItem>
              <SelectItem value="pig">Pig</SelectItem>
              <SelectItem value="turkey">Turkey</SelectItem>
              <SelectItem value="cattle">Cattle</SelectItem>
              <SelectItem value="crops">Crops</SelectItem>
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
              <Table className="block md:table">
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Qty</TableHead>
                    <TableHead className="hidden sm:table-cell">Price</TableHead>
                    <TableHead>Sale value</TableHead><TableHead>Payment status</TableHead><TableHead>Actions</TableHead>
                    <TableHead className="hidden sm:table-cell"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="block md:table-row-group">
                  {sales.map((s) => (
                    <TableRow key={s.id} className="grid grid-cols-2 gap-x-2 p-3 md:table-row md:p-0">
                      <TableCell className="text-sm">
                        {format(new Date(s.date+"T12:00:00"), "d MMM yyyy")}
                      </TableCell>
                      <TableCell>{s.customer_name}</TableCell>
                      <TableCell className="capitalize">{saleProductLabel(s)}{s.stock_group&&<span className="block text-xs normal-case text-gray-600">{livestockGroupLabel(s.stock_group)}</span>}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.quantity}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatCurrency(s.unit_price)} {(s as FarmSale & { pricing_basis?: string }).pricing_basis?.replace("per_", "/")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block text-xs font-normal text-slate-600 md:hidden">Sale value</span>{formatCurrency(s.total_amount)}
                      </TableCell>
                      <TableCell className="col-span-2"><SalePaymentDetails sale={s}/></TableCell>
                      <TableCell><FarmAdminCorrection recordType="sale" record={s} onSaved={() => setVersion(v => v + 1)} /></TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {(s as FarmSale & { is_edited?: boolean }).is_edited && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <PenLine className="h-3 w-3" />
                            Edited
                          </span>
                        )}
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
