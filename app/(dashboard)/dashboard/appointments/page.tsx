"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Appointment } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadAppointments(status: string) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/appointments?${params}`);
      const json = await res.json();
      setAppointments(json.data || []);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments(statusFilter);
  }, [statusFilter]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Appointment ${newStatus}`);
      loadAppointments(statusFilter);
    } catch {
      toast.error("Failed to update appointment");
    }
  }

  return (
    <>
      <DashboardHeader title="Appointments" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Consultation Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">
                No appointments found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Service
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Contact
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-medium">
                          {apt.name}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(apt.appointment_date),
                            "MMM d, yyyy"
                          )}
                        </TableCell>
                        <TableCell>{apt.appointment_time}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {apt.service || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={STATUS_COLORS[apt.status]}
                          >
                            {apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-xs space-y-0.5">
                            <a
                              href={`mailto:${apt.email}`}
                              className="text-primary hover:underline block"
                            >
                              {apt.email}
                            </a>
                            <a
                              href={`tel:${apt.phone}`}
                              className="text-gray-500 hover:text-primary block"
                            >
                              {apt.phone}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {apt.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() =>
                                  updateStatus(apt.id, "confirmed")
                                }
                              >
                                Confirm
                              </Button>
                            )}
                            {apt.status === "confirmed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() =>
                                  updateStatus(apt.id, "completed")
                                }
                              >
                                Complete
                              </Button>
                            )}
                            {(apt.status === "pending" ||
                              apt.status === "confirmed") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 text-red-500 hover:text-red-700"
                                onClick={() =>
                                  updateStatus(apt.id, "cancelled")
                                }
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
