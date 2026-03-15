import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BOLogo } from "@/components/register/BOLogo";

export const metadata: Metadata = {
  title: "Payment Cancelled — Bimbo Oyedotun",
};

export default function RegistrationCancelPage() {
  return (
    <section className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BOLogo size={32} color="#160C5A" />
          <span className="font-heading font-bold text-[#160C5A]">Bimbo Oyedotun</span>
        </div>
        <div className="rounded-2xl border border-[#160C5A]/10 bg-white shadow-lg shadow-[#160C5A]/10 p-10">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">&#8617;</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold mb-2 text-[#160C5A]">
            Hmm, something went wrong
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            No worries — nothing was submitted. You can try again
            whenever you&apos;re ready.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 font-semibold hover:underline"
            style={{ color: "#160C5A" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Try Again
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Bimbo Oyedotun. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
