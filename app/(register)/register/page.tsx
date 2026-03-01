import type { Metadata } from "next";
import { RegistrationForm } from "@/components/register/RegistrationForm";

export const metadata: Metadata = {
  title: "Course Registration — Digital Boss Academy",
  description:
    "Register your interest for a Digital Boss Academy course. Powered by BossBimbz.",
};

export default function RegisterPage() {
  return (
    <section className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-extrabold text-[#0a2a28]">
            Digital <span className="text-primary">Boss</span> Academy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">by BossBimbz</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-8">
          <h2 className="text-xl font-heading font-bold mb-1">
            Register Your Interest
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in your details and Bimbo will be in touch with full course
            information, pricing, and next steps.
          </p>
          <RegistrationForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Digital Boss Academy. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
