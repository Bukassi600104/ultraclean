"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductTable } from "@/components/dashboard/dba/ProductTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { DBAProduct } from "@/types";

export default function DBAProductsPage() {
  const [products, setProducts] = useState<DBAProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProducts() {
    try {
      const res = await fetch("/api/dba/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? All associated sales will also be deleted.")) return;
    try {
      const res = await fetch(`/api/dba/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Product deleted");
      loadProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  }

  return (
    <>
      <DashboardHeader title="DBA Products" />
      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link href="/dashboard/dba/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <ProductTable products={products} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
