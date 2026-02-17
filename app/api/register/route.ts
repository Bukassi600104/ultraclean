import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeKey);

  const body = await request.json();
  const { name, email, phone, priceId } = body;

  // Validate
  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { errors: [{ field: "name", message: "Name must be at least 2 characters" }] },
      { status: 400 }
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { errors: [{ field: "email", message: "Please enter a valid email" }] },
      { status: 400 }
    );
  }
  if (!phone || !/^[+]?[\d\s()-]{7,20}$/.test(phone)) {
    return NextResponse.json(
      { errors: [{ field: "phone", message: "Please enter a valid phone number" }] },
      { status: 400 }
    );
  }
  if (!priceId || !/^price_[a-zA-Z0-9]{8,}$/.test(priceId)) {
    return NextResponse.json(
      { errors: [{ field: "priceId", message: "Invalid registration link" }] },
      { status: 400 }
    );
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: {
        registrant_name: name,
        registrant_email: email,
        registrant_phone: phone,
      },
      success_url: `${siteUrl}/register/success`,
      cancel_url: `${siteUrl}/register/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const stripeErr = err as { type?: string; message?: string };
    console.error("Stripe checkout error:", stripeErr.message);

    if (stripeErr.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { errors: [{ field: "priceId", message: "Invalid price. Please contact the administrator." }] },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { errors: [{ message: "Something went wrong. Please try again." }] },
      { status: 500 }
    );
  }
}
