"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations";
import { SERVICE_OPTIONS } from "@/lib/constants";

export function ContactForm() {
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service") || "";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      service: preselectedService,
      propertyType: "",
      squareFootage: "",
      dateNeeded: "",
      timePreference: "",
      frequency: "",
      specialRequests: "",
      referralSource: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }

      toast.success("Thank you! We'll be in touch within 24 hours.");
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit. Please try again."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <Label htmlFor="name">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Your full name"
          {...register("name")}
          className="mt-1.5"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Phone & Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(647) 000-0000"
            {...register("phone")}
            className="mt-1.5"
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1">
              {errors.phone.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            className="mt-1.5"
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Service type */}
      <div>
        <Label htmlFor="service">
          Service Type <span className="text-destructive">*</span>
        </Label>
        <Select
          defaultValue={preselectedService}
          onValueChange={(value) => setValue("service", value)}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.service && (
          <p className="text-sm text-destructive mt-1">
            {errors.service.message}
          </p>
        )}
      </div>

      {/* Property type & Square footage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="propertyType">Property Type</Label>
          <Select onValueChange={(value) => setValue("propertyType", value)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="condo">Condo / Apartment</SelectItem>
              <SelectItem value="townhouse">Townhouse</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="retail">Retail Space</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="squareFootage">Approximate Square Footage</Label>
          <Input
            id="squareFootage"
            placeholder="e.g., 1500"
            {...register("squareFootage")}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Date & Time preference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateNeeded">Preferred Date</Label>
          <Input
            id="dateNeeded"
            type="date"
            {...register("dateNeeded")}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="timePreference">Time Preference</Label>
          <Select onValueChange={(value) => setValue("timePreference", value)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
              <SelectItem value="evening">Evening (4PM - 6PM)</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Frequency */}
      <div>
        <Label htmlFor="frequency">Cleaning Frequency</Label>
        <Select onValueChange={(value) => setValue("frequency", value)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one-time">One-Time</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Special requests */}
      <div>
        <Label htmlFor="specialRequests">Special Requests or Notes</Label>
        <Textarea
          id="specialRequests"
          placeholder="Any specific areas, concerns, or instructions..."
          rows={4}
          {...register("specialRequests")}
          className="mt-1.5"
        />
      </div>

      {/* Referral source */}
      <div>
        <Label htmlFor="referralSource">How did you hear about us?</Label>
        <Select onValueChange={(value) => setValue("referralSource", value)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">Google Search</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="referral">Friend / Family Referral</SelectItem>
            <SelectItem value="flyer">Flyer / Print</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="rounded-full px-8 h-11 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Inquiry"
        )}
      </Button>
    </form>
  );
}
