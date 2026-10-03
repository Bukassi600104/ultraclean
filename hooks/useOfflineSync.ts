"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingItems,
  removePending,
  savePending,
  getPendingCount,
  updatePending,
} from "@/lib/offline-storage";
import { toast } from "sonner";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncing = useRef(false);
  const [conflicts, setConflicts] = useState<ReturnType<typeof getPendingItems>>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingCount(getPendingCount());
    function refreshPending() {
      setPendingCount(getPendingCount());
      setConflicts(getPendingItems().filter(item => item.conflict));
    }
    refreshPending();

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
    window.addEventListener("farm-pending-changed", refreshPending);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("farm-pending-changed", refreshPending);
    };
  }, []);

  const syncPending = useCallback(async () => {
    const items = getPendingItems();
    if (!items.length || !navigator.onLine || syncing.current) return;
    syncing.current = true;

    setIsSyncing(true);
    let synced = 0;

    for (const item of items) {
      if (item.conflict) continue;
      try {
        // Assign once even to legacy queued entries, and preserve it across reloads.
        if (!item.requestId) { item.requestId = crypto.randomUUID(); updatePending(item); }
        const payload = { ...item.data, request_id: item.requestId };
        const needsBatch = ["/api/farm/sales", "/api/farm/expenses", "/api/farm/feed-purchases"].includes(item.endpoint);
        const res = await fetch(item.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Request-ID": item.requestId },
          body: JSON.stringify(needsBatch ? [payload] : payload),
        });

        if (res.ok) {
          removePending(item.id);
          synced++;
        } else if (res.status < 500) {
          const result = await res.json().catch(() => ({}));
          item.conflict = result.error || "This saved entry needs review before it can be submitted.";
          updatePending(item);
          toast.error(item.conflict);
        } else {
          break;
        }
      } catch {
        break; // stop on first failure
      }
    }

    setPendingCount(getPendingCount());
    setIsSyncing(false);
    syncing.current = false;

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
      const payload = { ...data, request_id: typeof data.request_id === "string" ? data.request_id : crypto.randomUUID() };
      if (navigator.onLine) {
        try {
          const needsBatch = ["/api/farm/sales", "/api/farm/expenses", "/api/farm/feed-purchases"].includes(endpoint);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          body: JSON.stringify(needsBatch ? [payload] : payload),
          });

          if (res.ok) {
            return { success: true, offline: false };
          }
          if (res.status < 500) {
            const result = await res.json().catch(() => ({}));
            const id = savePending(endpoint, payload);
            if (id) { const item = getPendingItems().find(entry => entry.id === id); if (item) updatePending({ ...item, conflict: result.error || "Entry requires review" }); }
            return { success: false, offline: false, error: result.error || "Entry requires review" };
          }
        } catch {
          // Fall through to offline save
        }
      }

      // Save locally
      savePending(endpoint, payload);
      setPendingCount(getPendingCount());
      return { success: true, offline: true };
    },
    []
  );

  return { isOnline, pendingCount, isSyncing, submitOrQueue, syncPending, conflicts };
}
