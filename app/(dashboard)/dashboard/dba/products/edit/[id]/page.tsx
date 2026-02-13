"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductForm } from "@/components/dashboard/dba/ProductForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { DBAProduct } from "@/types";

export default function EditDBAProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<DBAProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dba/products/${params.id}`);
        if (!res.ok) throw new Error();
        setProduct(await res.json());
      } catch {
        toast.error("Product not found");
        router.push("/dashboard/dba/products");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Edit Product" />
        <div className="p-4 lg:p-8">
          <Skeleton className="h-[400px] max-w-xl" />
        </div>
      </>
    );
  }

  if (!product) return null;

  return (
    <>
      <DashboardHeader title="Edit Product" />
      <div className="p-4 lg:p-8">
        <ProductForm product={product} />
      </div>
    </>
  );
}
