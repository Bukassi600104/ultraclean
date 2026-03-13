"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RegistrationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service: "DBA Course",
          business: "dba",
          specialRequests: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  async function handleProceedToPayment() {
    setPaymentLoading(true);
    setPaymentError("");

    // Try dynamic Stripe checkout session first
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // Log the real error for debugging but fall through to payment link
      console.warn("Checkout session failed:", data.error);
    } catch {
      console.warn("Checkout session network error, trying payment link fallback");
    }

    // Fallback: use static Stripe Payment Link if configured
    const paymentLink = process.env.NEXT_PUBLIC_DBA_PAYMENT_LINK;
    if (paymentLink) {
      window.location.href = paymentLink;
      return;
    }

    setPaymentError("Payment is not available right now. Please contact us at hello@ultratidycleaning.com to complete your registration.");
    setPaymentLoading(false);
  }

  if (submitted) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-heading font-bold">
          You&apos;re on the list!
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Thanks, {name.split(" ")[0]}! Your registration has been received. Complete your payment to secure your spot.
        </p>
        {paymentError && (
          <p className="text-sm text-destructive">{paymentError}</p>
        )}
        <button
          onClick={handleProceedToPayment}
          disabled={paymentLoading}
          className="inline-flex items-center justify-center w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {paymentLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Redirecting to payment...
            </>
          ) : (
            "Proceed to Payment →"
          )}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reg-name">Full Name</Label>
        <Input
          id="reg-name"
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email Address</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-phone">Phone Number</Label>
        <Input
          id="reg-phone"
          type="tel"
          placeholder="+1 (647) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          minLength={10}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-message">
          What are you hoping to learn?{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="reg-message"
          placeholder="Tell Bimbo a bit about your goals or any questions you have..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base font-semibold mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Register My Interest"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground pt-1">
        You will be directed to the payment portal after submitting.
      </p>
    </form>
  );
}
