"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dbaSaleSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DBAProduct } from "@/types";

interface FormValues {
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  amount: number;
  payment_method?: string;
  notes?: string;
}

interface LogSaleFormProps {
  open: boolean;
  onClose: () => void;
  products: DBAProduct[];
  onSuccess: () => void;
}

export function LogSaleForm({
  open,
  onClose,
  products,
  onSuccess,
}: LogSaleFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dbaSaleSchema) as any,
    defaultValues: { payment_method: "transfer" },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dba/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Sale logged");
      reset();
      onClose();
      onSuccess();
    } catch {
      toast.error("Failed to log sale");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select onValueChange={(v) => setValue("product_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${p.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_id && (
              <p className="text-xs text-destructive">
                {errors.product_id.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_name">Buyer Name *</Label>
              <Input id="buyer_name" {...register("buyer_name")} />
              {errors.buyer_name && (
                <p className="text-xs text-destructive">
                  {errors.buyer_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_email">Buyer Email *</Label>
              <Input
                id="buyer_email"
                type="email"
                {...register("buyer_email")}
              />
              {errors.buyer_email && (
                <p className="text-xs text-destructive">
                  {errors.buyer_email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                defaultValue="transfer"
                onValueChange={(v) => setValue("payment_method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Log Sale
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
