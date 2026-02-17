import { NextRequest, NextResponse } from "next/server";
import { appointmentSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import {
  sendAppointmentConfirmation,
  sendAppointmentAdminNotification,
} from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

// POST — public: create a new appointment
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const result = appointmentSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 }
    );
  }

  const data = result.data;
  const supabase = createServerClient();

  if (supabase) {
    const { error } = await supabase.from("appointments").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service || null,
      business: data.business || "ultratidy",
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      notes: data.notes || null,
      status: "pending",
    });

    if (error) {
      console.error("Failed to save appointment:", error);
      return NextResponse.json(
        { error: "Failed to save your appointment. Please try again." },
        { status: 500 }
      );
    }
  }

  // Fire-and-forget emails
  Promise.allSettled([
    sendAppointmentConfirmation({
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
    }),
    sendAppointmentAdminNotification({
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
    }),
  ]).catch((error) => {
    console.error("Appointment email sending failed:", error);
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

// GET — admin: list appointments
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ data: [] });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: true });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
