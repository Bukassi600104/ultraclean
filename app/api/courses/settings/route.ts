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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const course_name = (String(body.course_name ?? "")).trim();
  const price_cents = parseInt(String(body.price_cents ?? ""), 10);
  const currency = (String(body.currency ?? "usd")).toLowerCase();
  const rawLink = (String(body.stripe_payment_link ?? "")).trim();

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

  // Only accept Stripe-hosted payment links to prevent open-redirect abuse
  if (rawLink) {
    try {
      const parsed = new URL(rawLink);
      const isStripe =
        parsed.protocol === "https:" &&
        (parsed.hostname === "buy.stripe.com" ||
          parsed.hostname === "checkout.stripe.com" ||
          parsed.hostname.endsWith(".stripe.com"));
      if (!isStripe) {
        return NextResponse.json(
          { error: "Payment link must be a valid Stripe URL (buy.stripe.com or checkout.stripe.com)" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid payment link URL" }, { status: 400 });
    }
  }

  const stripe_payment_link = rawLink || undefined;

  const { error } = await saveCourseSettings({ course_name, price_cents, currency, stripe_payment_link });
  if (error) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ course_name, price_cents, currency, stripe_payment_link });
}
