import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendThankYouReview } from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { leadId, type } = await request.json();

  if (!leadId || !type) {
    return NextResponse.json(
      { error: "leadId and type are required" },
      { status: 400 }
    );
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let result = null;

  if (type === "booking") {
    result = await sendBookingConfirmation({
      name: lead.name,
      email: lead.email,
      service: lead.service,
      date_needed: lead.date_needed,
    });
  } else if (type === "review") {
    result = await sendThankYouReview({
      name: lead.name,
      email: lead.email,
    });
    if (result) {
      await supabase
        .from("leads")
        .update({ review_sent_at: new Date().toISOString() })
        .eq("id", leadId);
    }
  } else {
    return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
  }

  if (!result) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
