"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  priceId: string;
}

interface FieldError {
  field?: string;
  message: string;
}

export function RegistrationForm({ priceId }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const fieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;
  const globalError = errors.find((e) => !e.field)?.message;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          priceId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors || [{ message: "Something went wrong." }]);
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setErrors([{ message: "Network error. Please try again." }]);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {globalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {globalError}
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
          className={fieldError("name") ? "border-red-400" : ""}
        />
        {fieldError("name") && (
          <p className="text-xs text-red-600">{fieldError("name")}</p>
        )}
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
          className={fieldError("email") ? "border-red-400" : ""}
        />
        {fieldError("email") && (
          <p className="text-xs text-red-600">{fieldError("email")}</p>
        )}
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
          className={fieldError("phone") ? "border-red-400" : ""}
        />
        {fieldError("phone") && (
          <p className="text-xs text-red-600">{fieldError("phone")}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base font-semibold mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Redirecting to payment...
          </>
        ) : (
          "Continue to Payment"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground pt-2">
        You&apos;ll be redirected to Stripe&apos;s secure checkout to complete
        payment.
      </p>
    </form>
  );
}
