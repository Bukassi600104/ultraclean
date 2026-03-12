import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceInCents = parseInt(process.env.DBA_COURSE_PRICE_CENTS || "0", 10);
  const courseName = process.env.DBA_COURSE_NAME || "Digital Boss Academy Course";

  if (!stripeKey) {
    return NextResponse.json(
      { error: "Payment not configured" },
      { status: 503 }
    );
  }

  if (!priceInCents || priceInCents <= 0) {
    return NextResponse.json(
      { error: "Course price not configured" },
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://register.ultratidycleaning.com";
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
            currency: "cad",
            unit_amount: priceInCents,
            product_data: {
              name: courseName,
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
