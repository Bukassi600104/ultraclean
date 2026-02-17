import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Registration Successful — Digital Boss Academy",
};

export default function RegistrationSuccessPage() {
  return (
    <section className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border bg-card shadow-lg p-10">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold mb-2">
            You&apos;re Registered!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Payment received successfully. Check your email for a confirmation
            with all the details. We&apos;re excited to have you!
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Digital Boss Academy. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
