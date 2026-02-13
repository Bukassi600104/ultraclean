"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LeadTable } from "@/components/dashboard/leads/LeadTable";
import { LeadFilters } from "@/components/dashboard/leads/LeadFilters";
import { AddLeadForm } from "@/components/dashboard/leads/AddLeadForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Download } from "lucide-react";
import type { Lead } from "@/types";

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageSkeleton />}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageSkeleton() {
  return (
    <>
      <DashboardHeader title="Leads" />
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px]" />
      </div>
    </>
  );
}

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [business, setBusiness] = useState("all");
  const [showAddForm, setShowAddForm] = useState(
    searchParams.get("new") === "true"
  );

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (business !== "all") params.set("business", business);

    try {
      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      setLeads(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, business]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, status, business]);

  function exportCSV() {
    if (!leads.length) return;
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Service",
      "Status",
      "Business",
      "Date",
    ];
    const rows = leads.map((l) => [
      l.name,
      l.email,
      l.phone,
      l.service,
      l.status,
      l.business,
      l.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <DashboardHeader title="Leads" />
      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{total} total leads</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        <LeadFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          business={business}
          onBusinessChange={setBusiness}
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <LeadTable leads={leads} />
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <AddLeadForm open={showAddForm} onClose={() => setShowAddForm(false)} />
    </>
  );
}
