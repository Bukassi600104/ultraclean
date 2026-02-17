require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const webhookRoute = require("./routes/webhook");
const registerRoute = require("./routes/register");

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Security headers
app.use(helmet());

// 2. Webhook route MUST come before JSON parser (needs raw body)
app.use("/webhook", webhookRoute);

// 3. Body parsers (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 4. Static files
app.use(express.static("public"));

// 5. Rate limiter on registration only
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: [{ message: "Too many attempts. Please try again later." }] },
});

// 6. Registration route
app.use("/register", registerLimiter, registerRoute);

app.listen(PORT, () => {
  console.log(`Registration server running on port ${PORT}`);
});
