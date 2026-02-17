const express = require("express");
const {
  constructWebhookEvent,
  retrieveSessionWithLineItems,
} = require("../services/stripe");
const { sendConfirmation, sendAdminNotification } = require("../services/email");

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === "checkout.session.completed" &&
    event.data.object.payment_status === "paid"
  ) {
    try {
      const session = await retrieveSessionWithLineItems(event.data.object.id);

      const { registrant_name, registrant_email, registrant_phone } =
        session.metadata;

      const lineItem = session.line_items?.data?.[0];
      const courseName =
        lineItem?.price?.product?.name || lineItem?.description || "Course";
      const amount = session.amount_total || 0;

      // Fire-and-forget: send both emails, don't let failures block the 200
      await Promise.allSettled([
        sendConfirmation({
          email: registrant_email,
          name: registrant_name,
          courseName,
          amount,
        }),
        sendAdminNotification({
          name: registrant_name,
          email: registrant_email,
          phone: registrant_phone,
          courseName,
          amount,
        }),
      ]);

      console.log(
        `Registration complete: ${registrant_name} — ${courseName}`
      );
    } catch (err) {
      console.error("Webhook processing error:", err.message);
    }
  }

  // Always acknowledge receipt to Stripe
  res.json({ received: true });
});

module.exports = router;
