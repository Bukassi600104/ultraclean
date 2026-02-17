const { body, validationResult } = require("express-validator");

const registrationRules = [
  body("name")
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2–100 characters"),
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("phone")
    .matches(/^[+]?[\d\s()-]{7,20}$/)
    .withMessage("Please enter a valid phone number"),
  body("priceId")
    .matches(/^price_[a-zA-Z0-9]{8,}$/)
    .withMessage("Invalid price identifier"),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { registrationRules, handleValidationErrors };
