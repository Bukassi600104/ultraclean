"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import {
  primefieldLeadSchema,
  type PrimefieldLeadFormValues,
} from "@/lib/validations";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  { value: "buying", label: "Buying Farm Produce" },
  { value: "partnership", label: "Business Partnership" },
  { value: "investment", label: "Investment Opportunity" },
  { value: "other", label: "Other Inquiry" },
];

export function PrimefieldContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PrimefieldLeadFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(primefieldLeadSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      interest: "",
      message: "",
    },
  });

  const onSubmit = async (data: PrimefieldLeadFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          service: data.interest,
          specialRequests: data.message,
          business: "primefield",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }

      setIsSuccess(true);
      toast.success("Thank you! We'll be in touch soon.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-[#2D6A4F]" />
        </div>
        <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
        <p className="text-gray-600">
          Thank you for your interest in Primefield Farms. We&apos;ll get back
          to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pf-name">Full Name *</Label>
          <Input
            id="pf-name"
            placeholder="Your name"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pf-email">Email *</Label>
          <Input
            id="pf-email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pf-phone">Phone *</Label>
          <Input
            id="pf-phone"
            type="tel"
            placeholder="+234 000 000 0000"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pf-interest">I&apos;m Interested In *</Label>
          <Select onValueChange={(val) => setValue("interest", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your interest" />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.interest && (
            <p className="text-sm text-red-500">{errors.interest.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pf-message">Message</Label>
        <Textarea
          id="pf-message"
          placeholder="Tell us more about what you're looking for..."
          rows={4}
          {...register("message")}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full h-12 text-base font-semibold bg-[#2D6A4F] hover:bg-[#1B4332]"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Get in Touch"
        )}
      </Button>
    </form>
  );
}
