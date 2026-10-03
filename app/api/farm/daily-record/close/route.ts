import { farmDateToday } from "@/lib/farm-products";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";

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

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const date = (body as Record<string, unknown>).date as string | undefined
    || farmDateToday();

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  const { data, error } = await farmWrite(profile, "day", "close", { date }, { requestId: request.headers.get("X-Request-ID") || undefined });
  if (error) return farmErrorResponse(error);
  return NextResponse.json({ record: data });
}
