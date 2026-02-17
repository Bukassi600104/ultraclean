import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" &&
    (event.data.object as Stripe.Checkout.Session).payment_status === "paid"
  ) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
        { expand: ["line_items.data.price.product"] }
      );

      const { registrant_name, registrant_email, registrant_phone } =
        session.metadata || {};

      const lineItem = session.line_items?.data?.[0];
      const product = lineItem?.price?.product;
      const courseName =
        (typeof product === "object" && product !== null && "name" in product
          ? (product as Stripe.Product).name
          : null) ||
        lineItem?.description ||
        "Course";
      const amount = session.amount_total || 0;

      const formattedAmount = (amount / 100).toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
      });

      // Send emails via Resend (fire-and-forget)
      const resendKey = process.env.RESEND_API_KEY;
      const adminEmail = process.env.ADMIN_EMAIL || "hello@ultratidycleaning.com";

      if (resendKey && registrant_email) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);

        await Promise.allSettled([
          // Confirmation to registrant
          resend.emails.send({
            from: "DBA <courses@digitalbossacademy.com>",
            to: registrant_email,
            subject: `Registration Confirmed — ${courseName}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
                <h1 style="color:#0a2a28;font-size:24px">You're Registered!</h1>
                <p>Hi <strong>${registrant_name}</strong>,</p>
                <p>Thank you for registering for <strong>${courseName}</strong>. Your payment of <strong>${formattedAmount}</strong> has been received.</p>
                <p>We'll be in touch with more details soon.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                <p style="color:#999;font-size:13px">Digital Boss Academy — Empowering you to boss up.</p>
              </div>
            `,
          }),
          // Admin notification
          resend.emails.send({
            from: "DBA <courses@digitalbossacademy.com>",
            to: adminEmail,
            subject: `New Registration — ${courseName}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
                <h1 style="color:#0a2a28;font-size:24px">New Course Registration</h1>
                <table style="width:100%;border-collapse:collapse;font-size:15px">
                  <tr><td style="padding:8px 0;color:#888;width:100px">Course</td><td style="padding:8px 0;font-weight:600">${courseName}</td></tr>
                  <tr><td style="padding:8px 0;color:#888">Amount</td><td style="padding:8px 0;font-weight:600">${formattedAmount}</td></tr>
                  <tr><td style="padding:8px 0;color:#888">Name</td><td style="padding:8px 0">${registrant_name}</td></tr>
                  <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0">${registrant_email}</td></tr>
                  <tr><td style="padding:8px 0;color:#888">Phone</td><td style="padding:8px 0">${registrant_phone}</td></tr>
                </table>
              </div>
            `,
          }),
        ]);
      }

      console.log(`Registration complete: ${registrant_name} — ${courseName}`);
    } catch (err) {
      console.error("Webhook processing error:", (err as Error).message);
    }
  }

  // Always acknowledge receipt
  return NextResponse.json({ received: true });
}
