"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  business: string;
  onBusinessChange: (value: string) => void;
}

export function LeadFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  business,
  onBusinessChange,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="contacted">Contacted</SelectItem>
          <SelectItem value="quoted">Quoted</SelectItem>
          <SelectItem value="booked">Booked</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="lost">Lost</SelectItem>
        </SelectContent>
      </Select>
      <Select value={business} onValueChange={onBusinessChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All businesses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All businesses</SelectItem>
          <SelectItem value="ultratidy">UltraTidy</SelectItem>
          <SelectItem value="dba">DBA</SelectItem>
          <SelectItem value="primefield">Primefield</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
