"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Download, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const SERVICES = ["residential", "commercial", "deep", "move_in_out", "post_construction", "airbnb", "other"];
const PAYMENT_METHODS = ["e-transfer", "cash", "cheque", "credit_card"];
const CAD = (v: number) => v.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

interface InflowRecord {
  id: string;
  date: string;
  client_name: string;
  service: string;
  amount: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

const LIMIT = 20;

export default function UltraTidyInflowPage() {
  const [records, setRecords] = useState<InflowRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], client_name: "", service: "residential", amount: "", payment_method: "e-transfer", notes: "" });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ultratidy/inflow?page=${page}&limit=${LIMIT}&service=${serviceFilter}`);
    const j = await res.json();
    setRecords(j.data || []);
    setCount(j.count || 0);
    setLoading(false);
  }, [page, serviceFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setFormError("");
    if (!form.client_name.trim()) { setFormError("Client name is required."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("Enter a valid amount."); return; }
    setSaving(true);
    const res = await fetch("/api/ultratidy/inflow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error || "Failed to save."); return; }
    toast.success("Inflow record saved!");
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], client_name: "", service: "residential", amount: "", payment_method: "e-transfer", notes: "" });
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/ultratidy/inflow/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) { toast.error("Failed to delete record."); return; }
    toast.success("Record deleted.");
    load();
  }

  function exportCSV() {
    const headers = ["Date", "Client", "Service", "Amount (CAD)", "Payment Method", "Notes"];
    const rows = records.map((r) => [r.date, r.client_name, r.service.replace(/_/g, " "), CAD(Number(r.amount)), r.payment_method, r.notes || ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "ultratidy-inflow.csv"; a.click();
  }

  const totalPages = Math.ceil(count / LIMIT);

  return (
    <>
      <DashboardHeader title="UltraTidy — Inflow" />
      <div className="p-4 lg:p-8 space-y-6 max-w-5xl">
        <Link href="/dashboard/ultratidy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to UltraTidy Overview
        </Link>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{count} total record{count !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {SERVICES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1.5" />Add Inflow</Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  {["Date", "Client", "Service", "Amount", "Payment", "Notes", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No inflow records yet. Click Add Inflow to record your first payment.</td></tr>
                ) : records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 tabular-nums">{new Date(r.date + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3 font-medium">{r.client_name}</td>
                    <td className="px-4 py-3 capitalize">{r.service.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{CAD(Number(r.amount))}</td>
                    <td className="px-4 py-3 capitalize hidden sm:table-cell">{r.payment_method.replace(/-/g, " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[180px] truncate">{r.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Add Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Inflow</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {formError && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (CAD)</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Client Name</Label>
              <Input placeholder="e.g. Sarah Johnson" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/-/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. 123 Main St, deep clean" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Record"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
