const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.FROM_EMAIL || "DBA <courses@digitalbossacademy.com>";
const ADMIN = process.env.ADMIN_EMAIL || "hello@ultratidycleaning.com";

/**
 * Send confirmation email to the registrant.
 */
async function sendConfirmation({ email, name, courseName, amount }) {
  const formattedAmount = (amount / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Registration Confirmed — ${courseName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="color: #0a2a28; font-size: 24px; margin-bottom: 8px;">You're Registered!</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Hi <strong>${name}</strong>,
        </p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Thank you for registering for <strong>${courseName}</strong>. Your payment of <strong>${formattedAmount}</strong> has been received.
        </p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          We'll be in touch with more details soon. If you have any questions, just reply to this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 13px;">
          Digital Boss Academy — Empowering you to boss up.
        </p>
      </div>
    `,
  });
}

/**
 * Send admin notification with full registration details.
 */
async function sendAdminNotification({
  name,
  email,
  phone,
  courseName,
  amount,
}) {
  const formattedAmount = (amount / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });

  return resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `New Registration — ${courseName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="color: #0a2a28; font-size: 24px; margin-bottom: 16px;">New Course Registration</h1>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 8px 0; color: #888; width: 100px;">Course</td><td style="padding: 8px 0; font-weight: 600;">${courseName}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Amount</td><td style="padding: 8px 0; font-weight: 600;">${formattedAmount}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td></tr>
        </table>
      </div>
    `,
  });
}

module.exports = { sendConfirmation, sendAdminNotification };
