const express = require("express");
const {
  registrationRules,
  handleValidationErrors,
} = require("../middleware/validate");
const { createCheckoutSession } = require("../services/stripe");

const router = express.Router();

router.post("/", registrationRules, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, phone, priceId } = req.body;

    const session = await createCheckoutSession({
      name,
      email,
      phone,
      priceId,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err.message);

    if (err.type === "StripeInvalidRequestError") {
      return res
        .status(400)
        .json({ errors: [{ field: "priceId", message: "Invalid price. Please check the registration link." }] });
    }

    res.status(500).json({ errors: [{ message: "Something went wrong. Please try again." }] });
  }
});

module.exports = router;
