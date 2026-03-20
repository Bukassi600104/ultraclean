import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCourseSettings, saveCourseSettings } from "@/lib/course-settings";

export async function GET() {
  const settings = await getCourseSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const course_name = (body.course_name || "").trim();
  const price_cents = parseInt(body.price_cents, 10);
  const currency = (body.currency || "usd").toLowerCase();
  const stripe_payment_link = (body.stripe_payment_link || "").trim() || undefined;

  if (!course_name) {
    return NextResponse.json(
      { error: "Course name is required" },
      { status: 400 }
    );
  }

  if (isNaN(price_cents) || price_cents <= 0) {
    return NextResponse.json(
      { error: "Price must be a positive number" },
      { status: 400 }
    );
  }

  const { error } = await saveCourseSettings({ course_name, price_cents, currency, stripe_payment_link });
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ course_name, price_cents, currency, stripe_payment_link });
}
