import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCourseSettings } from "@/lib/course-settings";

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return NextResponse.json(
      { error: "Payment not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { name, email, phone } = body as {
    name?: string;
    email?: string;
    phone?: string;
  };

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  // Read course settings from database (falls back to defaults)
  const settings = await getCourseSettings();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const baseUrl = siteUrl.includes("localhost")
    ? "http://localhost:3000/register"
    : "https://register.ultratidycleaning.com";

  try {
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: settings.currency,
            unit_amount: settings.price_cents,
            product_data: {
              name: settings.course_name,
              description: "Digital Boss Academy — Empowering you to boss up.",
            },
          },
        },
      ],
      metadata: {
        registrant_name: name,
        registrant_email: email,
        registrant_phone: phone || "",
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
