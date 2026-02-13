"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "./LeadStatusBadge";
import type { Lead } from "@/types";

const BUSINESS_STYLES: Record<string, string> = {
  ultratidy: "bg-primary/10 text-primary",
  dba: "bg-indigo-100 text-indigo-700",
  primefield: "bg-amber-100 text-amber-700",
};

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  if (!leads.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">
        No leads found.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Email</TableHead>
          <TableHead className="hidden md:table-cell">Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Business</TableHead>
          <TableHead className="hidden md:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <Link
                href={`/dashboard/leads/${lead.id}`}
                className="font-medium hover:text-primary"
              >
                {lead.name}
              </Link>
              <p className="text-xs text-gray-400 sm:hidden">{lead.email}</p>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-sm text-gray-500">
              {lead.email}
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-gray-500">
              {lead.service}
            </TableCell>
            <TableCell>
              <LeadStatusBadge status={lead.status} />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Badge
                variant="secondary"
                className={BUSINESS_STYLES[lead.business]}
              >
                {lead.business}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-gray-500">
              {format(new Date(lead.created_at), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
