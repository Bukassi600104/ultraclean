import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-orange-100 text-orange-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-primary/10 text-primary",
  lost: "bg-red-100 text-red-700",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}
