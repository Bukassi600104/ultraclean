import { Resend } from "resend";
import { format } from "date-fns";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "UltraTidy <hello@ultratidy.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ultratidy.ca";
const GOOGLE_REVIEW_URL = "https://g.page/r/CbgkPYbL4D3JEBM/review";

function caslFooter(email: string) {
  return `
    <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      UltraTidy Cleaning Services<br/>
      Toronto, ON, Canada<br/><br/>
      You received this email because you submitted an inquiry on our website.<br/>
      <a href="${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999;">Unsubscribe</a>
    </p>
  `;
}

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

// Template 3: Follow-up (3 days, no response)
export async function sendFollowUp(data: {
  name: string;
  email: string;
  service: string;
}) {
  if (!resend) return null;
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `${data.name}, still interested in ${data.service}?`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">Hi ${data.name},</h1>
          <p>We reached out a few days ago about your interest in <strong>${data.service}</strong>, and we wanted to follow up.</p>
          <p>If you still need help, we'd love to chat! You can reply to this email or give us a call at <a href="tel:+16478238262" style="color: #0BBDB2;">(647) 823-8262</a>.</p>
          <p>If the timing isn't right, no worries — we're here whenever you're ready.</p>
          <p>It's not clean until it's <strong>ULTRACLEAN!</strong></p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          ${caslFooter(data.email)}
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send follow-up email:", error);
    return null;
  }
}

// Template 4: Booking confirmation
export async function sendBookingConfirmation(data: {
  name: string;
  email: string;
  service: string;
  date_needed?: string | null;
}) {
  if (!resend) return null;
  const dateStr = data.date_needed
    ? format(new Date(data.date_needed), "EEEE, MMMM d, yyyy")
    : "the scheduled date";
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Your UltraTidy booking is confirmed!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">Booking Confirmed!</h1>
          <p>Hi ${data.name},</p>
          <p>Great news — your <strong>${data.service}</strong> is confirmed for <strong>${dateStr}</strong>.</p>
          <h3 style="color: #333;">What to expect:</h3>
          <ul>
            <li>Our team will arrive on time with all necessary supplies</li>
            <li>We'll do a quick walkthrough before we start</li>
            <li>You'll receive a reminder the day before your appointment</li>
          </ul>
          <p>If you need to reschedule, please contact us at least 24 hours in advance at <a href="tel:+16478238262" style="color: #0BBDB2;">(647) 823-8262</a>.</p>
          <p>It's not clean until it's <strong>ULTRACLEAN!</strong></p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          ${caslFooter(data.email)}
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send booking confirmation:", error);
    return null;
  }
}

// Template 5: Reminder (day before appointment)
export async function sendReminder(data: {
  name: string;
  email: string;
  service: string;
  date_needed: string;
}) {
  if (!resend) return null;
  const dateStr = format(new Date(data.date_needed), "EEEE, MMMM d");
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Reminder: Your UltraTidy cleaning is tomorrow!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">See You Tomorrow!</h1>
          <p>Hi ${data.name},</p>
          <p>Just a friendly reminder that your <strong>${data.service}</strong> is scheduled for tomorrow, <strong>${dateStr}</strong>.</p>
          <p>Please ensure the areas to be cleaned are accessible. If you have any last-minute requests or need to reschedule, call us at <a href="tel:+16478238262" style="color: #0BBDB2;">(647) 823-8262</a>.</p>
          <p>We can't wait to make your space sparkle!</p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          ${caslFooter(data.email)}
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send reminder email:", error);
    return null;
  }
}

// Template 6: Thank you + review request
export async function sendThankYouReview(data: {
  name: string;
  email: string;
}) {
  if (!resend) return null;
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Thank you for choosing UltraTidy!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">Thank You, ${data.name}!</h1>
          <p>We hope you're enjoying your freshly cleaned space. It was a pleasure working with you!</p>
          <p>Your feedback helps us grow and helps others find quality cleaning services. Would you take a moment to leave us a review?</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${GOOGLE_REVIEW_URL}" style="background-color: #0BBDB2; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Leave a Review</a>
          </p>
          <p>If there's anything we could have done better, please let us know by replying to this email. Your satisfaction is our priority.</p>
          <p>It's not clean until it's <strong>ULTRACLEAN!</strong></p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          ${caslFooter(data.email)}
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send thank you email:", error);
    return null;
  }
}

// Template 7: Re-engagement (30 days later)
export async function sendReEngagement(data: {
  name: string;
  email: string;
}) {
  if (!resend) return null;
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `${data.name}, ready for another clean?`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0BBDB2;">We Miss You, ${data.name}!</h1>
          <p>It's been a while since your last cleaning, and we'd love to help you again.</p>
          <p>Whether it's a regular maintenance clean or a deep clean refresh, we've got you covered.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${SITE_URL}/contact" style="background-color: #0BBDB2; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Book Your Next Clean</a>
          </p>
          <p>It's not clean until it's <strong>ULTRACLEAN!</strong></p>
          <p style="margin-top: 24px;">Best regards,<br/>The UltraTidy Team</p>
          ${caslFooter(data.email)}
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send re-engagement email:", error);
    return null;
  }
}
