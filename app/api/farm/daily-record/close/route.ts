import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  let profile;
  try {
    profile = await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const date = (body as Record<string, unknown>).date as string | undefined
    || new Date().toISOString().split("T")[0];

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("farm_daily_records")
    .upsert(
      { date, status: "closed", manager_id: profile.id, closed_at: new Date().toISOString() },
      { onConflict: "date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data, message: "Day closed successfully" });
}
