"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LeadStatusBadge } from "@/components/dashboard/leads/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import Link from "next/link";

const STATUSES = ["new", "contacted", "quoted", "booked", "completed", "lost"] as const;

const STATUS_PIPELINE_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  quoted: "bg-orange-500",
  booked: "bg-green-500",
  completed: "bg-primary",
  lost: "bg-red-500",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadLead() {
      try {
        const res = await fetch(`/api/leads/${params.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLead(data);
        setNotes(data.notes || "");
      } catch {
        toast.error("Lead not found");
        router.push("/dashboard/leads");
      } finally {
        setIsLoading(false);
      }
    }
    loadLead();
  }, [params.id, router]);

  async function updateLead(updates: Partial<Lead>) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLead(updated);
      toast.success("Lead updated");
    } catch {
      toast.error("Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLead() {
    try {
      const res = await fetch(`/api/leads/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Lead deleted");
      router.push("/dashboard/leads");
    } catch {
      toast.error("Failed to delete lead");
    }
  }

  async function sendEmail(type: "booking" | "review") {
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: params.id, type }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        type === "booking"
          ? "Booking confirmation sent"
          : "Review request sent"
      );
    } catch {
      toast.error("Failed to send email");
    }
  }

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Lead Details" />
        <div className="p-4 lg:p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px]" />
        </div>
      </>
    );
  }

  if (!lead) return null;

  const currentStatusIndex = STATUSES.indexOf(
    lead.status as (typeof STATUSES)[number]
  );

  return (
    <>
      <DashboardHeader title="Lead Details" />
      <div className="p-4 lg:p-8 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Link>
        </Button>

        {/* Status Pipeline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUSES.filter((s) => s !== "lost").map((s, i) => (
                <button
                  key={s}
                  onClick={() => updateLead({ status: s })}
                  className={cn(
                    "flex-1 min-w-[80px] py-2 px-3 text-xs font-medium rounded text-center transition-colors cursor-pointer",
                    i <= currentStatusIndex && lead.status !== "lost"
                      ? `${STATUS_PIPELINE_COLORS[s]} text-white`
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{lead.name}</CardTitle>
                <LeadStatusBadge status={lead.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Mail className="h-4 w-4 text-gray-400" />
                  {lead.email}
                </a>
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-gray-400" />
                  {lead.phone}
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs text-gray-400">Service</p>
                  <p className="text-sm font-medium">{lead.service}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Business</p>
                  <p className="text-sm font-medium capitalize">
                    {lead.business}
                  </p>
                </div>
                {lead.property_size && (
                  <div>
                    <p className="text-xs text-gray-400">Property Size</p>
                    <p className="text-sm font-medium">{lead.property_size}</p>
                  </div>
                )}
                {lead.date_needed && (
                  <div>
                    <p className="text-xs text-gray-400">Date Needed</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {lead.date_needed}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-400 mb-2">Notes</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about this lead..."
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={isSaving || notes === (lead.notes || "")}
                  onClick={() => updateLead({ notes })}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : null}
                  Save Notes
                </Button>
              </div>

              <div className="text-xs text-gray-400 border-t pt-4">
                Created {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                {lead.updated_at !== lead.created_at && (
                  <>
                    {" · "}Updated{" "}
                    {format(
                      new Date(lead.updated_at),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Change Status</p>
                <Select
                  value={lead.status}
                  onValueChange={(v) => updateLead({ status: v as Lead["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs text-gray-400">Send Email</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => sendEmail("booking")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Booking Confirmation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => sendEmail("review")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Thank You + Review
                </Button>
              </div>

              <div className="border-t pt-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Lead
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {lead.name}&apos;s lead
                        record. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteLead}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
