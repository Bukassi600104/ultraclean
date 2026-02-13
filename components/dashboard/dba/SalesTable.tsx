"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Sale {
  id: string;
  buyer_name: string;
  buyer_email: string;
  amount: number;
  payment_method: string;
  created_at: string;
  product?: { name: string } | null;
}

interface SalesTableProps {
  sales: Sale[];
}

export function SalesTable({ sales }: SalesTableProps) {
  if (!sales.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">
        No sales recorded yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="hidden md:table-cell">Payment</TableHead>
          <TableHead className="hidden md:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div>
                <p className="font-medium">{s.buyer_name}</p>
                <p className="text-xs text-gray-400">{s.buyer_email}</p>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-sm">
              {s.product?.name || "—"}
            </TableCell>
            <TableCell className="font-medium">
              ${s.amount.toFixed(2)}
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-gray-500 capitalize">
              {s.payment_method}
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-gray-500">
              {format(new Date(s.created_at), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
