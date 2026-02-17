import type { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BookingForm } from "@/components/booking/BookingForm";
import { Phone, Clock, CheckCircle2 } from "lucide-react";
import { CONTACT_INFO, BUSINESS_HOURS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Book a Free Consultation",
  description:
    "Book a free consultation call with UltraTidy. Pick a date and time that works for you and we'll discuss your cleaning needs.",
  alternates: {
    canonical: "https://ultratidy.ca/book",
  },
  openGraph: {
    title: "Book a Free Consultation | UltraTidy Cleaning Services",
    description:
      "Book a free consultation call with UltraTidy. Pick a time that works for you.",
    url: "https://ultratidy.ca/book",
  },
};

export default function BookingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=70"
            alt="Professional consultation"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Book a Free Consultation"
            subtitle="Pick a date and time that works for you. We'll call to discuss your cleaning needs — no obligation, no pressure."
            badge="Schedule a Call"
            light
          />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main booking form */}
              <div className="lg:col-span-3">
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="p-6 md:p-8">
                    <BookingForm />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar info */}
              <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-heading font-bold text-sm">
                      What to Expect
                    </h3>
                    {[
                      "Pick a convenient date & time",
                      "We'll call you at the scheduled time",
                      "Discuss your cleaning needs",
                      "Get a personalized quote",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-sm">
                        Business Hours
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {BUSINESS_HOURS.map((item) => (
                        <div
                          key={item.day}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.day}
                          </span>
                          <span className="font-semibold text-primary">
                            {item.hours}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-sm">
                        Prefer to Call?
                      </h3>
                    </div>
                    <a
                      href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {CONTACT_INFO.phone}
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
