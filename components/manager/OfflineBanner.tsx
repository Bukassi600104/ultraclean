"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

export function OfflineBanner({
  isOnline,
  pendingCount,
  isSyncing,
}: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "px-4 py-2 text-sm font-medium text-center",
        isOnline
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800"
      )}
    >
      {!isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Offline — data saved locally
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </span>
      ) : isSyncing ? (
        <span className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing ({pendingCount} remaining)...
        </span>
      ) : (
        <span>
          {pendingCount} pending {pendingCount === 1 ? "entry" : "entries"} to sync
        </span>
      )}
    </div>
  );
}
