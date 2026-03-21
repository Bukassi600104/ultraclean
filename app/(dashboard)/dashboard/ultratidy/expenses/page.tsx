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

const CATEGORIES = ["supplies", "transport", "equipment", "labor", "marketing", "utilities", "other"];
const PAYMENT_METHODS = ["e-transfer", "cash", "cheque", "credit_card"];
const CAD = (v: number) => v.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  paid_to: string | null;
  payment_method: string;
  notes: string | null;
}

const LIMIT = 20;

export default function UltraTidyExpensesPage() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], category: "supplies", description: "", amount: "", paid_to: "", payment_method: "e-transfer", notes: "" });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ultratidy/expenses?page=${page}&limit=${LIMIT}&category=${catFilter}`);
    const j = await res.json();
    setRecords(j.data || []);
    setCount(j.count || 0);
    setLoading(false);
  }, [page, catFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setFormError("");
    if (!form.description.trim()) { setFormError("Description is required."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("Enter a valid amount."); return; }
    setSaving(true);
    const res = await fetch("/api/ultratidy/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error || "Failed to save."); return; }
    toast.success("Expense recorded!");
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], category: "supplies", description: "", amount: "", paid_to: "", payment_method: "e-transfer", notes: "" });
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/ultratidy/expenses/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    toast.success("Record deleted.");
    load();
  }

  function exportCSV() {
    const headers = ["Date", "Category", "Description", "Amount (CAD)", "Paid To", "Payment Method", "Notes"];
    const rows = records.map((r) => [r.date, r.category, r.description, CAD(Number(r.amount)), r.paid_to || "", r.payment_method, r.notes || ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "ultratidy-expenses.csv"; a.click();
  }

  const totalPages = Math.ceil(count / LIMIT);

  return (
    <>
      <DashboardHeader title="UltraTidy — Expenses" />
      <div className="p-4 lg:p-8 space-y-6 max-w-5xl">
        <Link href="/dashboard/ultratidy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to UltraTidy Overview
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{count} total record{count !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1.5" />Add Expense</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  {["Date", "Category", "Description", "Amount", "Paid To", "Payment", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No expenses recorded yet. Click Add Expense to log your first cost.</td></tr>
                ) : records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 tabular-nums">{new Date(r.date + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{r.description}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{CAD(Number(r.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.paid_to || "—"}</td>
                    <td className="px-4 py-3 capitalize hidden md:table-cell">{r.payment_method.replace(/-/g, " ")}</td>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
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
              <Label>Description</Label>
              <Input placeholder="e.g. Cleaning supplies from Costco" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
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
              <Label>Paid To (optional)</Label>
              <Input placeholder="e.g. Costco, Amazon" value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. Receipt #1234" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Expense"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
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
