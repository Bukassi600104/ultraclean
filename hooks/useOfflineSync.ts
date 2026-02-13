"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPendingItems,
  removePending,
  savePending,
  getPendingCount,
} from "@/lib/offline-storage";
import { toast } from "sonner";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingCount(getPendingCount());

    function onOnline() {
      setIsOnline(true);
      toast.success("Back online");
    }
    function onOffline() {
      setIsOnline(false);
      toast.warning("You are offline — data will be saved locally");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const syncPending = useCallback(async () => {
    const items = getPendingItems();
    if (!items.length || !navigator.onLine) return;

    setIsSyncing(true);
    let synced = 0;

    for (const item of items) {
      try {
        const res = await fetch(item.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data),
        });

        if (res.ok) {
          removePending(item.id);
          synced++;
        }
      } catch {
        break; // stop on first failure
      }
    }

    setPendingCount(getPendingCount());
    setIsSyncing(false);

    if (synced > 0) {
      toast.success(`Synced ${synced} pending ${synced === 1 ? "entry" : "entries"}`);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingCount, syncPending]);

  const submitOrQueue = useCallback(
    async (endpoint: string, data: Record<string, unknown>) => {
      if (navigator.onLine) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          if (res.ok) {
            return { success: true, offline: false };
          }
          throw new Error("Request failed");
        } catch {
          // Fall through to offline save
        }
      }

      // Save locally
      savePending(endpoint, data);
      setPendingCount(getPendingCount());
      return { success: true, offline: true };
    },
    []
  );

  return { isOnline, pendingCount, isSyncing, submitOrQueue, syncPending };
}
