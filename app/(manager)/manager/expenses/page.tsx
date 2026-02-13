"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmExpenseSchema } from "@/lib/validations";
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
  category: "feed" | "labor" | "utilities" | "veterinary" | "transport" | "equipment";
  amount: number;
  paid_to?: string;
  payment_method: string;
  notes?: string;
}

export default function ManagerExpensesPage() {
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
    resolver: zodResolver(farmExpenseSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setIsSuccess(false);

    const result = await submitOrQueue("/api/farm/expenses", data as unknown as Record<string, unknown>);

    if (result.success) {
      setIsSuccess(true);
      toast.success(result.offline ? "Saved offline" : "Expense recorded");
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
        Record Expense
      </h2>
      <FarmForm
        onSubmit={handleSubmit(onSubmit)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        submitLabel="Record Expense"
      >
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" className="h-12 text-lg" {...register("date")} />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select onValueChange={(v) => setValue("category", v as FormValues["category"])}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feed">Feed</SelectItem>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="veterinary">Veterinary</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            className="h-12 text-lg"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paid_to">Paid To</Label>
          <Input
            id="paid_to"
            className="h-12 text-lg"
            placeholder="Who was paid?"
            {...register("paid_to")}
          />
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
