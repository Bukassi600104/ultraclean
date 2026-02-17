import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import { sendLeadConfirmation, sendAdminNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Parse and validate
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Support both the full contact form and simpler lead forms (e.g. Primefield)
  const business = body.business || "ultratidy";
  const validBusinesses = ["ultratidy", "dba", "primefield"];
  if (!validBusinesses.includes(business)) {
    return NextResponse.json(
      { error: "Invalid business value" },
      { status: 400 }
    );
  }

  const result = contactFormSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  const data = result.data;

  // Save to Supabase
  const supabase = createServerClient();
  let leadId: string | null = null;

  if (supabase) {
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        business: business as "ultratidy" | "dba" | "primefield",
        source: "website",
        name: data.name,
        email: data.email,
        phone: data.phone,
        service: data.service,
        property_size: data.squareFootage || null,
        date_needed: data.dateNeeded || null,
        notes: [
          data.propertyType && `Property: ${data.propertyType}`,
          data.timePreference && `Time: ${data.timePreference}`,
          data.frequency && `Frequency: ${data.frequency}`,
          data.specialRequests && `Requests: ${data.specialRequests}`,
          data.referralSource && `Referral: ${data.referralSource}`,
        ]
          .filter(Boolean)
          .join("\n") || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save lead:", error);
      return NextResponse.json(
        { error: "Failed to save your inquiry. Please try again." },
        { status: 500 }
      );
    }

    leadId = lead?.id || null;
  } else {
    console.warn("Supabase not configured. Lead data not saved to database.");
  }

  // Fire-and-forget emails
  Promise.allSettled([
    sendLeadConfirmation({
      name: data.name,
      email: data.email,
      service: data.service,
    }),
    sendAdminNotification({
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service,
      notes: data.specialRequests,
    }),
  ]).catch((error) => {
    console.error("Email sending failed:", error);
  });

  return NextResponse.json(
    { success: true, leadId },
    { status: 201 }
  );
}
