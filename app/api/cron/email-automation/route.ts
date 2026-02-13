import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  sendFollowUp,
  sendReminder,
  sendReEngagement,
} from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const results = { followUps: 0, reminders: 0, reEngagements: 0, errors: 0 };

  // 1. Follow-ups: status=new, created > 3 days ago, no follow-up sent
  const { data: newLeads } = await supabase
    .from("leads")
    .select("id, name, email, service")
    .eq("status", "new")
    .is("follow_up_sent_at", null)
    .lt("created_at", threeDaysAgo)
    .limit(50);

  for (const lead of newLeads || []) {
    const res = await sendFollowUp(lead);
    if (res) {
      await supabase
        .from("leads")
        .update({ follow_up_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.followUps++;
    } else {
      results.errors++;
    }
  }

  // 2. Reminders: status=booked, date_needed=tomorrow, no reminder sent
  const { data: bookedLeads } = await supabase
    .from("leads")
    .select("id, name, email, service, date_needed")
    .eq("status", "booked")
    .is("reminder_sent_at", null)
    .eq("date_needed", tomorrow)
    .limit(50);

  for (const lead of bookedLeads || []) {
    if (!lead.date_needed) continue;
    const res = await sendReminder({
      name: lead.name,
      email: lead.email,
      service: lead.service,
      date_needed: lead.date_needed,
    });
    if (res) {
      await supabase
        .from("leads")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.reminders++;
    } else {
      results.errors++;
    }
  }

  // 3. Re-engagement: status=completed, updated > 30 days ago, no re-engagement sent
  const { data: completedLeads } = await supabase
    .from("leads")
    .select("id, name, email")
    .eq("status", "completed")
    .is("reengagement_sent_at", null)
    .lt("updated_at", thirtyDaysAgo)
    .limit(50);

  for (const lead of completedLeads || []) {
    const res = await sendReEngagement(lead);
    if (res) {
      await supabase
        .from("leads")
        .update({ reengagement_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.reEngagements++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({ success: true, results });
}
