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
import { Skull, Package, PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";

interface FormValues {
  product: string;
  action: "add" | "remove" | "sale" | "mortality";
  quantity: number;
  date: string;
  reason?: string;
  notes?: string;
}

const ACTION_OPTIONS = [
  {
    value: "add",
    label: "Add Stock",
    description: "New batch arrived",
    icon: PlusCircle,
    color: "#1B4332",
    bg: "#F0FBF4",
    border: "#b7e8c8",
  },
  {
    value: "sale",
    label: "Sale",
    description: "Sold to a customer",
    icon: ShoppingCart,
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    value: "remove",
    label: "Remove",
    description: "Other stock reduction",
    icon: MinusCircle,
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  {
    value: "mortality",
    label: "Report Deaths",
    description: "Livestock died — report here",
    icon: Skull,
    color: "#991b1b",
    bg: "#fff1f2",
    border: "#fecdd3",
  },
];

export default function ManagerInventoryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const { submitOrQueue } = useOfflineSync();

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(farmInventoryTransactionSchema) as any,
    defaultValues: { date: today },
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
        setSelectedAction("");
        reset({ date: today });
      }, 1500);
    } else {
      toast.error("Failed to save");
    }

    setIsLoading(false);
  }

  const isMortality = selectedAction === "mortality";
  const activeOption = ACTION_OPTIONS.find((o) => o.value === selectedAction);

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="px-4 mb-4 text-xl font-bold" style={{ color: "#1B4332" }}>
        Update Inventory
      </h2>

      {/* Action picker cards */}
      {!selectedAction && (
        <div className="px-4 mb-4 space-y-3">
          <p className="text-sm font-medium text-gray-500 mb-2">
            What would you like to record?
          </p>
          {ACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSelectedAction(opt.value);
                setValue("action", opt.value as FormValues["action"]);
              }}
              className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
              style={{
                backgroundColor: opt.bg,
                border: `1.5px solid ${opt.border}`,
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: opt.color + "22" }}
              >
                <opt.icon className="h-6 w-6" style={{ color: opt.color }} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Form — shown only after action is picked */}
      {selectedAction && (
        <>
          {/* Active action banner */}
          <div
            className="mx-4 mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              backgroundColor: activeOption?.bg,
              border: `1.5px solid ${activeOption?.border}`,
            }}
          >
            {activeOption && (
              <activeOption.icon
                className="h-5 w-5 shrink-0"
                style={{ color: activeOption.color }}
              />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: activeOption?.color }}>
                {activeOption?.label}
              </p>
              {isMortality && (
                <p className="text-xs text-red-600 mt-0.5">
                  This will reduce stock and be reported to Bimbo.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAction("");
                setValue("action", "" as FormValues["action"]);
              }}
              className="text-xs text-gray-400 underline"
            >
              Change
            </button>
          </div>

          <div className="mx-4 rounded-2xl bg-white shadow-sm overflow-hidden mb-4">
            <FarmForm
              onSubmit={handleSubmit(onSubmit)}
              isLoading={isLoading}
              isSuccess={isSuccess}
              submitLabel={
                isMortality
                  ? "Report Deaths"
                  : selectedAction === "add"
                  ? "Add Stock"
                  : selectedAction === "sale"
                  ? "Record Sale"
                  : "Remove Stock"
              }
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
                <Label htmlFor="date">
                  {isMortality ? "Date of Death" : "Date"}
                </Label>
                <Input
                  id="date"
                  type="date"
                  className="h-12 text-lg"
                  max={today}
                  {...register("date")}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  {isMortality ? "Number of Deaths" : "Quantity"}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  className="h-12 text-lg"
                  placeholder={isMortality ? "How many died?" : "Enter quantity"}
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">
                  {isMortality ? "Cause of Death" : "Reason"}
                </Label>
                <Input
                  id="reason"
                  className="h-12 text-lg"
                  placeholder={
                    isMortality
                      ? "e.g. Disease, Injury, Unknown"
                      : "e.g. New batch arrived"
                  }
                  {...register("reason")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  className="text-base"
                  rows={2}
                  placeholder="Any additional details..."
                  {...register("notes")}
                />
              </div>
            </FarmForm>
          </div>
        </>
      )}

      {/* Empty state hint */}
      {!selectedAction && (
        <div className="px-4 mt-2 flex items-center gap-2 text-xs text-gray-400">
          <Package className="h-4 w-4" />
          <span>Select an action above to continue</span>
        </div>
      )}
    </div>
  );
}
