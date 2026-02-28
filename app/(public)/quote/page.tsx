import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { InstantQuoteWizard } from "@/components/quote/InstantQuoteWizard";
import { CheckCircle2, Clock, Phone, Shield, Star } from "lucide-react";
import { CONTACT_INFO, BUSINESS_HOURS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Instant Quote | UltraTidy Cleaning Services",
  description:
    "Get an instant price estimate for your cleaning service in seconds. Select your service, property details, and optional add-ons — no obligation.",
  alternates: {
    canonical: "https://ultratidy.ca/quote",
  },
  openGraph: {
    title: "Instant Quote | UltraTidy Cleaning Services",
    description:
      "Get an instant cleaning quote in seconds. Residential, commercial, deep cleaning, Airbnb and more.",
    url: "https://ultratidy.ca/quote",
  },
};

const TRUST_POINTS = [
  "No obligation — just an estimate",
  "Transparent pricing, no hidden fees",
  "Final price confirmed before any work begins",
  "Licensed, insured & 5-star rated",
];

export default function QuotePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&q=70"
            alt="Professional cleaning service"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Get Your Instant Quote"
            subtitle="Select your service, tell us about your property, and see your price in seconds — no obligation, no hidden fees."
            badge="Instant Quote"
            light
          />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Wizard */}
              <div className="lg:col-span-3">
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="p-6 md:p-8">
                    <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-xl" />}>
                      <InstantQuoteWizard />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                {/* Trust */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-heading font-bold text-sm">Why UltraTidy?</h3>
                    {TRUST_POINTS.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-sm">{point}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Stars */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold">500+ Happy Customers</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      &ldquo;Outstanding service from start to finish.&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      — Karanveer K., GTA
                    </p>
                  </CardContent>
                </Card>

                {/* Hours */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-sm">Business Hours</h3>
                    </div>
                    <div className="space-y-2.5">
                      {BUSINESS_HOURS.map((item) => (
                        <div key={item.day} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.day}</span>
                          <span className="font-semibold text-primary">{item.hours}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Call */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-sm">Prefer to Call?</h3>
                    </div>
                    <a
                      href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {CONTACT_INFO.phone}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      We&apos;re happy to quote over the phone!
                    </p>
                  </CardContent>
                </Card>

                {/* Licensed badge */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span>Fully licensed, insured, and background-checked team</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
