"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
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
import { Card, CardContent } from "@/components/ui/card";
import { appointmentSchema, type AppointmentFormValues } from "@/lib/validations";
import { SERVICE_OPTIONS } from "@/lib/constants";
import { CalendarDays, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Business hours per day of week (0 = Sunday)
const BUSINESS_HOURS: Record<number, { open: number; close: number } | null> = {
  0: { open: 10, close: 16 }, // Sunday
  1: { open: 9, close: 18 },  // Monday
  2: { open: 9, close: 18 },
  3: { open: 9, close: 18 },
  4: { open: 9, close: 18 },
  5: { open: 9, close: 18 },  // Friday
  6: { open: 8, close: 18 },  // Saturday
};

function generateTimeSlots(date: Date): string[] {
  const dayOfWeek = date.getDay();
  const hours = BUSINESS_HOURS[dayOfWeek];
  if (!hours) return [];

  const slots: string[] = [];
  for (let h = hours.open; h < hours.close; h++) {
    for (const m of [0, 30]) {
      // Skip the last 30-min slot if it would end after close
      if (h === hours.close - 1 && m === 30) continue;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const min = m === 0 ? "00" : "30";
      slots.push(`${hour12}:${min} ${ampm}`);
    }
  }
  return slots;
}

export function BookingForm() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(appointmentSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      notes: "",
      appointment_date: "",
      appointment_time: "",
    },
  });

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    setValue("appointment_time", "");
    if (date) {
      setValue("appointment_date", format(date, "yyyy-MM-dd"));
    } else {
      setValue("appointment_date", "");
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setValue("appointment_time", time);
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to book appointment");
      }

      setIsSuccess(true);
      toast.success("Consultation booked! Check your email for confirmation.");
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
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-heading font-bold mb-3">
          You&apos;re All Set!
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your free consultation is booked for{" "}
          <strong>
            {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
          </strong>{" "}
          at <strong>{selectedTime}</strong>. We&apos;ll send you a confirmation
          email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Date + Time picker */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-lg">Pick a Date</h3>
            </div>
            <Card className="border shadow-sm">
              <CardContent className="p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) =>
                    isBefore(startOfDay(date), startOfDay(new Date()))
                  }
                />
              </CardContent>
            </Card>
            {errors.appointment_date && (
              <p className="text-sm text-red-500 mt-1">
                {errors.appointment_date.message}
              </p>
            )}
          </div>

          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-bold text-lg">
                  Available Times —{" "}
                  {format(selectedDate, "EEE, MMM d")}
                </h3>
              </div>
              {timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleTimeSelect(slot)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 font-medium ${
                        selectedTime === slot
                          ? "bg-primary text-white border-primary shadow-md"
                          : "bg-white hover:bg-primary/5 hover:border-primary/50 border-gray-200"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No available time slots for this date.
                </p>
              )}
              {errors.appointment_time && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.appointment_time.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Contact form fields */}
        <div className="space-y-5">
          <h3 className="font-heading font-bold text-lg">Your Details</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Jane Doe"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (647) 000-0000"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">What would you like to discuss?</Label>
            <Select
              onValueChange={(val) => setValue("service", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service (optional)" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value="general">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Anything you'd like us to know..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full h-12 text-base font-semibold"
            disabled={isSubmitting || !selectedDate || !selectedTime}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Book Free Consultation"
            )}
          </Button>

          {(!selectedDate || !selectedTime) && (
            <p className="text-xs text-muted-foreground text-center">
              {!selectedDate
                ? "Please select a date to continue"
                : "Please select a time slot to continue"}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
