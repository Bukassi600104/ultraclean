"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fish, Beef, Drumstick, Package, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  product: string;
  current_stock: number;
  last_updated?: string;
}

interface SupplyItem {
  id: string;
  item_name: string;
  category: string;
  current_quantity: number;
  unit: string;
  restock_threshold?: number;
}

const LIVESTOCK = [
  { key: "catfish", label: "Catfish", icon: Fish, color: "#3b82f6", bg: "#eff6ff" },
  { key: "goat", label: "Goat", icon: Beef, color: "#f59e0b", bg: "#fffbeb" },
  { key: "chicken", label: "Chicken", icon: Drumstick, color: "#f97316", bg: "#fff7ed" },
];

export default function InventoryPage() {
  const router = useRouter();
  const [livestock, setLivestock] = useState<InventoryItem[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [invRes, supRes] = await Promise.all([
        fetch("/api/farm/inventory").then((r) => r.json()),
        fetch("/api/farm/supplies").then((r) => r.json()),
      ]);
      setLivestock(invRes.data || []);
      setSupplies(supRes.data || []);
    } catch { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function getStock(product: string) {
    return livestock.find((i) => i.product === product)?.current_stock ?? 0;
  }

  // Group supplies by category
  const supplyGroups = supplies.reduce<Record<string, SupplyItem[]>>((acc, item) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Inventory</h1>
        <button onClick={loadData} className="p-2 rounded-xl border border-gray-200 text-gray-500">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => router.push("/stock")}
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-left"
          style={{ backgroundColor: "#dcfce7", border: "1.5px solid #86efac" }}>
          <span className="text-sm font-bold text-green-800">Add Stock</span>
          <ChevronRight className="h-4 w-4 text-green-600" />
        </button>
        <button onClick={() => router.push("/mortality")}
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-left"
          style={{ backgroundColor: "#fee2e2", border: "1.5px solid #fca5a5" }}>
          <span className="text-sm font-bold text-red-800">Record Mortality</span>
          <ChevronRight className="h-4 w-4 text-red-500" />
        </button>
      </div>

      {/* Livestock stock */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Livestock Stock</p>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {LIVESTOCK.map((animal) => {
              const stock = getStock(animal.key);
              return (
                <div key={animal.key} className="rounded-2xl p-3 text-center" style={{ backgroundColor: animal.bg }}>
                  <animal.icon className="h-5 w-5 mx-auto mb-1" style={{ color: animal.color }} />
                  <p className="text-xs font-semibold text-gray-500">{animal.label}</p>
                  <p className="text-xl font-bold" style={{ color: animal.color }}>{stock}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Farm supplies */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Farm Supplies</p>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : supplies.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-6 text-center">
            <Package className="h-7 w-7 text-gray-300 mx-auto mb-1" />
            <p className="text-sm text-gray-400">No supplies recorded yet</p>
          </div>
        ) : (
          Object.entries(supplyGroups).map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 capitalize">{cat}</p>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const isLow = item.restock_threshold != null && item.current_quantity <= item.restock_threshold;
                  const isOut = item.current_quantity <= 0;
                  return (
                    <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.item_name}</p>
                        <p className="text-xs text-gray-400">{item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{item.current_quantity}</p>
                        {isOut && <span className="text-xs font-semibold text-red-500">Out</span>}
                        {!isOut && isLow && <span className="text-xs font-semibold text-amber-500">Low</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
