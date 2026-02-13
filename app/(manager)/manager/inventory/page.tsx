"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmInventoryTransactionSchema } from "@/lib/validations";
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
  product: string;
  action: "add" | "remove" | "sale" | "mortality";
  quantity: number;
  reason?: string;
  notes?: string;
}

export default function ManagerInventoryPage() {
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
    resolver: zodResolver(farmInventoryTransactionSchema) as any,
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setIsSuccess(false);

    const result = await submitOrQueue(
      "/api/farm/inventory/transaction",
      data as unknown as Record<string, unknown>
    );

    if (result.success) {
      setIsSuccess(true);
      toast.success(result.offline ? "Saved offline" : "Stock updated");
      setTimeout(() => {
        setIsSuccess(false);
        reset();
      }, 1500);
    } else {
      toast.error("Failed to save");
    }

    setIsLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="px-4 mb-4 text-xl font-bold text-gray-900">
        Update Inventory
      </h2>
      <FarmForm
        onSubmit={handleSubmit(onSubmit)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        submitLabel="Update Stock"
      >
        <div className="space-y-2">
          <Label>Product</Label>
          <Select onValueChange={(v) => setValue("product", v)}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="catfish">Catfish</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
              <SelectItem value="chicken">Chicken</SelectItem>
            </SelectContent>
          </Select>
          {errors.product && (
            <p className="text-xs text-destructive">{errors.product.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Select onValueChange={(v) => setValue("action", v as FormValues["action"])}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue placeholder="What happened?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add (new stock)</SelectItem>
              <SelectItem value="remove">Remove</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="mortality">Mortality</SelectItem>
            </SelectContent>
          </Select>
          {errors.action && (
            <p className="text-xs text-destructive">{errors.action.message}</p>
          )}
        </div>

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
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            className="h-12 text-lg"
            placeholder="e.g., New batch arrived"
            {...register("reason")}
          />
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
