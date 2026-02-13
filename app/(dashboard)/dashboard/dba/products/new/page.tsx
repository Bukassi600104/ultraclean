"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductForm } from "@/components/dashboard/dba/ProductForm";

export default function NewDBAProductPage() {
  return (
    <>
      <DashboardHeader title="New Product" />
      <div className="p-4 lg:p-8">
        <ProductForm />
      </div>
    </>
  );
}
