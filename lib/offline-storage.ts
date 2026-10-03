const PREFIX = "farm_pending_";

export interface PendingItem {
  id: string;
  endpoint: string;
  data: Record<string, unknown>;
  createdAt: string;
  conflict?: string;
  requestId?: string;
}

export function savePending(endpoint: string, data: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const id = `${PREFIX}${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const item: PendingItem = {
    id,
    endpoint,
    data,
    createdAt: new Date().toISOString(),
    requestId: typeof data.request_id === "string" ? data.request_id : crypto.randomUUID(),
  };

  localStorage.setItem(id, JSON.stringify(item));
  window.dispatchEvent(new Event("farm-pending-changed"));
  return id;
}

export function getPendingItems(): PendingItem[] {
  if (typeof window === "undefined") return [];

  const items: PendingItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      try {
        items.push(JSON.parse(localStorage.getItem(key)!));
      } catch {
        // skip corrupt entries
      }
    }
  }

  return items.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function removePending(id: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(id);
  window.dispatchEvent(new Event("farm-pending-changed"));
}

export function updatePending(item: PendingItem) {
  if (typeof window === "undefined") return;
  localStorage.setItem(item.id, JSON.stringify(item));
  window.dispatchEvent(new Event("farm-pending-changed"));
}

export function getPendingCount(): number {
  return getPendingItems().length;
}
