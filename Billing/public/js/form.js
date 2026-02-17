document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const priceInput = document.getElementById("priceId");
  const globalError = document.getElementById("global-error");
  const btn = document.getElementById("submit-btn");

  // Read price from URL
  const params = new URLSearchParams(window.location.search);
  const priceId = params.get("price");

  if (!priceId || !/^price_[a-zA-Z0-9]{8,}$/.test(priceId)) {
    document.getElementById("form-section").style.display = "none";
    globalError.textContent =
      "Invalid or missing registration link. Please use the link provided to you.";
    globalError.classList.add("visible");
    return;
  }

  priceInput.value = priceId;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    // Disable button + show spinner
    btn.disabled = true;
    btn.classList.add("loading");

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      priceId: priceInput.value,
    };

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.errors) {
          json.errors.forEach((err) => {
            if (err.field) {
              showFieldError(err.field, err.message);
            } else {
              showGlobalError(err.message);
            }
          });
        } else {
          showGlobalError("Something went wrong. Please try again.");
        }
        btn.disabled = false;
        btn.classList.remove("loading");
        return;
      }

      // Redirect to Stripe Checkout
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      showGlobalError("Network error. Please check your connection and try again.");
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });

  function showFieldError(field, message) {
    const input = form.querySelector(`[name="${field}"]`);
    const errorEl = document.getElementById(`${field}-error`);
    if (input) input.classList.add("error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("visible");
    }
  }

  function showGlobalError(message) {
    globalError.textContent = message;
    globalError.classList.add("visible");
  }

  function clearErrors() {
    globalError.classList.remove("visible");
    form.querySelectorAll("input.error").forEach((el) => el.classList.remove("error"));
    form.querySelectorAll(".error-text").forEach((el) => {
      el.classList.remove("visible");
      el.textContent = "";
    });
  }
});
