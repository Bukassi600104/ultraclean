import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "UltraTidy <hello@ultratidy.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ultratidy.ca";

export async function sendLeadConfirmation(data: {
  name: string;
  email: string;
  service: string;
}) {
  if (!resend) {
    console.warn("Resend not configured. Skipping lead confirmation email.");
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Thank you for contacting UltraTidy!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">Thank You, ${data.name}!</h1>
          <p>We've received your inquiry about <strong>${data.service}</strong> and we're excited to help.</p>
          <p>A member of our team will get back to you within 24 hours to discuss your needs and provide a personalized quote.</p>
          <p>In the meantime, feel free to check out our <a href="${SITE_URL}/services" style="color: #0BBDB2;">services</a> or view our <a href="${SITE_URL}/gallery" style="color: #0BBDB2;">gallery</a> to see our work.</p>
          <p>It's not clean until it's <strong>ULTRACLEAN!</strong></p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">
            UltraTidy Cleaning Services<br/>
            Toronto, ON, Canada<br/><br/>
            You received this email because you submitted an inquiry on our website.<br/>
            <a href="${SITE_URL}/unsubscribe?email=${encodeURIComponent(data.email)}" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send lead confirmation email:", error);
    return null;
  }
}

export async function sendAdminNotification(data: {
  name: string;
  email: string;
  phone: string;
  service: string;
  notes?: string;
}) {
  if (!resend) {
    console.warn("Resend not configured. Skipping admin notification email.");
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set. Skipping admin notification.");
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `New Lead: ${data.name} — ${data.service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">New Lead Received!</h1>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${data.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;"><a href="tel:${data.phone}">${data.phone}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Service:</td><td style="padding: 8px;">${data.service}</td></tr>
            ${data.notes ? `<tr><td style="padding: 8px; font-weight: bold;">Notes:</td><td style="padding: 8px;">${data.notes}</td></tr>` : ""}
          </table>
          <p style="margin-top: 16px;"><a href="${SITE_URL}/dashboard/leads" style="color: #0BBDB2;">View in Dashboard →</a></p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send admin notification email:", error);
    return null;
  }
}
