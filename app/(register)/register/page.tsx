import type { Metadata } from "next";
import { RegistrationForm } from "@/components/register/RegistrationForm";
import { BOLogo } from "@/components/register/BOLogo";

export const metadata: Metadata = {
  title: "Register — Digital Income to Blueprint | Bimbo Oyedotun",
  description:
    "Register for the Digital Income to Blueprint program by Bimbo Oyedotun. Your path to financial freedom and entrepreneurial success starts here.",
};

export default function RegisterPage() {
  return (
    <section className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BOLogo size={48} color="#160C5A" />
            <div className="text-left">
              <h1 className="text-xl font-heading font-extrabold text-[#160C5A] leading-tight">
                Bimbo Oyedotun
              </h1>
              <p className="text-xs text-[#160C5A]/60 font-medium tracking-wide uppercase">
                Digital Income to Blueprint
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#160C5A]/10 bg-white shadow-lg shadow-[#160C5A]/10 p-8">
          <h2 className="text-xl font-heading font-bold mb-1 text-[#160C5A]">
            Register Your Interest
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in your details and Bimbo will be in touch with full program
            information, pricing, and next steps.
          </p>
          <RegistrationForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Bimbo Oyedotun. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
