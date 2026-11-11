"use client";
import Link from "next/link";
import {ReportedExpenses} from "@/components/manager/FarmPurchases";
import type {ReportedExpense} from "@/lib/farm-purchases";
import {useFarmRecordRefresh} from "@/hooks/useFarmRecordRefresh";
import { formatCurrency } from "@/lib/utils";
import {formatExactCurrency,sumMoney} from "@/lib/money";
import { FarmAdminCorrection } from "@/components/dashboard/farm/FarmActivityPanel";

import { useEffect, useState } from "react";
import { format,parseISO } from "date-fns";
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
  | { _type: "feed"; data: FeedPurchase }
  | { _type: "purchase"; data: {id:string;date:string;amount:number;recipient:string;category:string} };

export default function FarmExpensesPage({searchParams={}}:{searchParams?:{period_id?:string;manager_id?:string;from?:string;to?:string}}) {
  const refresh=useFarmRecordRefresh();
  const {period_id:periodId,manager_id:managerId,from,to}=searchParams;
  const filters=new URLSearchParams();
  if(periodId)filters.set("period_id",periodId);if(managerId)filters.set("manager_id",managerId);
  const scopeQuery=filters.toString();
  const [reported,setReported]=useState<ReportedExpense[]>([]),[reportError,setReportError]=useState(false);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalFeed, setTotalFeed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const limit = 20;

  const [loadError, setLoadError] = useState("");
  useEffect(()=>{
    const controller=new AbortController();setReportError(false);setReported([]);
    fetch('/api/farm/purchases?'+scopeQuery,{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error();const body=await response.json();if(!controller.signal.aborted)setReported(body.exceptions.filter((e:ReportedExpense)=>!e.resolution));
    }).catch(()=>{if(!controller.signal.aborted)setReportError(true);});return()=>controller.abort();
  },[scopeQuery,version,refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setLoadError("");
    const params = new URLSearchParams(scopeQuery);params.set("page",String(page));params.set("limit",String(limit));params.set("category",category);
    if(from)params.set("from",from);if(to)params.set("to",to);
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
  }, [page, category, version,scopeQuery,from,to,refresh]);

  const combinedTotal = totalExpenses + totalFeed;
  const totalPages = Math.ceil(combinedTotal / limit);

  // Grand total amount for current page
  const pageTotalAmount = sumMoney(rows.map(row=>row._type==="feed"?row.data.cost:row.data.amount));

  if(loadError)return <DashboardReadError title="Farm Expenses" message={loadError} onRetry={()=>setVersion(v=>v+1)}/>;
  return (
    <>
      <DashboardHeader title="Farm Expenses" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
        <ReportedExpenses compact admin reports={reported} periodId={periodId}/>
        {reportError&&<p role="alert">Emergency reports could not be loaded. <button className="min-h-11 underline" onClick={()=>setVersion(v=>v+1)}>Retry reports</button></p>}
        <h2 className="text-xl font-bold">Recorded expenses</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{isLoading?'Loading records…':combinedTotal+' records'} · {from||to?[from||'Beginning',to||'Today'].join(' to '):'All dates'} · {periodId||managerId?'Selected manager':'Whole farm'}</p>
            {!isLoading && rows.length > 0 && (
              <p className="text-xs text-gray-600">
                Page total · {formatExactCurrency(pageTotalAmount,"NGN")}
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
                    if(row._type === "purchase")return <TableRow key={`purchase-${row.data.id}`}><TableCell>{format(parseISO(row.data.date),"d MMM yyyy")}</TableCell><TableCell>{row.data.category}</TableCell><TableCell>{row.data.recipient}</TableCell><TableCell>{formatCurrency(row.data.amount)}</TableCell><TableCell><Link className="inline-flex min-h-11 items-center text-emerald-800 underline" href={"/dashboard/farm/purchases"+(scopeQuery?"?"+scopeQuery:"")}>View purchase payment</Link></TableCell><TableCell className="hidden md:table-cell">Recorded payment</TableCell></TableRow>;
                    if (row._type === "feed") {
                      const f = row.data;
                      return (
                        <TableRow key={`feed-${f.id}`}>
                          <TableCell className="text-sm">
                            {format(parseISO(f.date), "d MMM yyyy")}
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
                          {format(parseISO(e.date), "d MMM yyyy")}
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
