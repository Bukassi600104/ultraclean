"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { ProductForm } from "@/components/dashboard/dba/ProductForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { DBAProduct } from "@/types";

export default function EditDBAProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<DBAProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError,setLoadError]=useState("");
  const [version,setVersion]=useState(0);

  useEffect(() => {
    const controller=new AbortController();setIsLoading(true);setLoadError("");
    void (async()=>{try {const res=await fetch(`/api/dba/products/${params.id}`,{signal:controller.signal});if(!res.ok)throw Error();const data=await res.json();if(!data?.id)throw Error();if(!controller.signal.aborted){setProduct(data);}}
    catch {if(!controller.signal.aborted)setLoadError("This record could not be loaded. Please retry or use the Back link.");}
    finally {if(!controller.signal.aborted)setIsLoading(false);}})();
    return ()=>controller.abort();
  }, [params.id,version]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Edit Product" />
        <div className="mx-auto w-full p-4 lg:p-8 max-w-7xl">
          <Skeleton className="h-[400px] max-w-xl" />
        </div>
      </>
    );
  }

  if (loadError||!product) return <DashboardReadError title="Edit Product" message={loadError||"Record unavailable. Please retry."} onRetry={()=>setVersion(v=>v+1)}/>;

  return (
    <>
      <DashboardHeader title="Edit Product" />
      <div className="mx-auto w-full p-4 lg:p-8 max-w-7xl">
        <ProductForm product={product} />
      </div>
    </>
  );
}
