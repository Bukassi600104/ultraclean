"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmSaleSchema } from "@/lib/validations";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { FarmForm } from "@/components/manager/FarmForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FormValues {
  date: string;
  customer_name: string;
  product: "catfish" | "goat" | "chicken" | "other";
  quantity: number;
  unit_price: number;
  payment_method: string;
  notes?: string;
}

export default function ManagerSalesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { submitOrQueue } = useOfflineSync();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(farmSaleSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setIsSuccess(false);

    const result = await submitOrQueue("/api/farm/sales", data as unknown as Record<string, unknown>);

    if (result.success) {
      setIsSuccess(true);
      toast.success(result.offline ? "Saved offline" : "Sale recorded");
      setTimeout(() => {
        setIsSuccess(false);
        reset({ date: new Date().toISOString().split("T")[0], payment_method: "cash" });
      }, 1500);
    } else {
      toast.error("Failed to save");
    }

    setIsLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="px-4 mb-4 text-xl font-bold text-gray-900">
        Record Sale
      </h2>
      <FarmForm
        onSubmit={handleSubmit(onSubmit)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        submitLabel="Record Sale"
      >
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" className="h-12 text-lg" {...register("date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input
            id="customer_name"
            className="h-12 text-lg"
            placeholder="Enter customer name"
            {...register("customer_name")}
          />
          {errors.customer_name && (
            <p className="text-xs text-destructive">{errors.customer_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Product</Label>
          <Select defaultValue="catfish" onValueChange={(v) => setValue("product", v as FormValues["product"])}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="catfish">Catfish</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
              <SelectItem value="chicken">Chicken</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              className="h-12 text-lg"
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_price">Unit Price (₦)</Label>
            <Input
              id="unit_price"
              type="number"
              inputMode="numeric"
              className="h-12 text-lg"
              {...register("unit_price")}
            />
            {errors.unit_price && (
              <p className="text-xs text-destructive">{errors.unit_price.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select defaultValue="cash" onValueChange={(v) => setValue("payment_method", v)}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="transfer">Bank Transfer</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            className="text-base"
            rows={2}
            placeholder="Optional notes..."
            {...register("notes")}
          />
        </div>
      </FarmForm>
    </div>
  );
}
