import type { Metadata } from "next";
import { RegistrationForm } from "@/components/register/RegistrationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Course Registration — Digital Boss Academy",
  description:
    "Register and pay for your Digital Boss Academy course. Powered by BossBimbz.",
};

async function getStripePriceId(): Promise<string> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${siteUrl}/api/courses/settings`, {
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.stripe_price_id || "";
  } catch {
    return "";
  }
}

export default async function RegisterPage() {
  const priceId = await getStripePriceId();

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 px-4">
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
          {priceId ? (
            <>
              <h2 className="text-xl font-heading font-bold mb-1">
                Course Registration
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Fill in your details below to proceed to payment.
              </p>
              <RegistrationForm priceId={priceId} />
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">&#9888;</span>
              </div>
              <h2 className="text-lg font-heading font-bold mb-2">
                Registration Not Available
              </h2>
              <p className="text-sm text-muted-foreground">
                Course registration is not currently open. Please check back
                later or contact us for more information.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Digital Boss Academy. All rights
          reserved.
        </p>
      </div>
    </section>
  );
}
