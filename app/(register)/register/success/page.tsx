import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { BOLogo } from "@/components/register/BOLogo";

export const metadata: Metadata = {
  title: "Registration Successful — Bimbo Oyedotun",
};

export default function RegistrationSuccessPage() {
  return (
    <section className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BOLogo size={32} color="#160C5A" />
          <span className="font-heading font-bold text-[#160C5A]">Bimbo Oyedotun</span>
        </div>
        <div className="rounded-2xl border border-[#160C5A]/10 bg-white shadow-lg shadow-[#160C5A]/10 p-10">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold mb-2 text-[#160C5A]">
            You&apos;re Registered!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Your registration has been received! Bimbo will be in touch shortly
            with full program details and next steps. We&apos;re excited to have
            you on this journey!
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Bimbo Oyedotun. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
