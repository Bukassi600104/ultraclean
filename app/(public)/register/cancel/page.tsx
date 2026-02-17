import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Cancelled — Digital Boss Academy",
};

export default function RegistrationCancelPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border bg-card shadow-lg p-10">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">&#8617;</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold mb-2">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            No worries — you haven&apos;t been charged. You can try again
            whenever you&apos;re ready.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Try Again
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Digital Boss Academy. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
