const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Checkout Session with registrant data stored in metadata.
 */
async function createCheckoutSession({ name, email, phone, priceId }) {
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: {
      registrant_name: name,
      registrant_email: email,
      registrant_phone: phone,
    },
    success_url: `${process.env.BASE_URL}/success.html`,
    cancel_url: `${process.env.BASE_URL}/cancel.html`,
  });
}

/**
 * Verify and construct a webhook event from the raw body + signature.
 */
function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Retrieve a session with line_items expanded to get the product name.
 */
async function retrieveSessionWithLineItems(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product"],
  });
}

module.exports = {
  createCheckoutSession,
  constructWebhookEvent,
  retrieveSessionWithLineItems,
};
