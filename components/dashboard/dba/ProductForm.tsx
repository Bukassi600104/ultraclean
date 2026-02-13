"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dbaProductSchema } from "@/lib/validations";
import { ImageUpload } from "@/components/dashboard/blog/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DBAProduct } from "@/types";

interface FormValues {
  name: string;
  description?: string;
  price: number;
  file_url?: string;
  thumbnail?: string | null;
  status?: "active" | "inactive";
}

interface ProductFormProps {
  product?: DBAProduct;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(
    product?.thumbnail || null
  );
  const [isActive, setIsActive] = useState(product?.status !== "inactive");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dbaProductSchema) as any,
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      file_url: product?.file_url || "",
      status: product?.status || "active",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    data.thumbnail = thumbnail;
    data.status = isActive ? "active" : "inactive";

    try {
      const url = product
        ? `/api/dba/products/${product.id}`
        : "/api/dba/products";
      const res = await fetch(url, {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error();

      toast.success(product ? "Product updated" : "Product created");
      router.push("/dashboard/dba/products");
    } catch {
      toast.error("Failed to save product");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register("price")}
          />
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="file_url">Download URL</Label>
          <Input
            id="file_url"
            type="url"
            placeholder="https://..."
            {...register("file_url")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thumbnail</Label>
        <ImageUpload value={thumbnail} onChange={setThumbnail} />
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
        <Label htmlFor="active">{isActive ? "Active" : "Inactive"}</Label>
      </div>

      <div className="flex gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/dba/products")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {product ? "Update" : "Create"} Product
        </Button>
      </div>
    </form>
  );
}
