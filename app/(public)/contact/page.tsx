import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Star,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/ContactForm";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BUSINESS_HOURS, CONTACT_INFO, SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get a free cleaning quote from UltraTidy! Contact us for residential, commercial, and specialty cleaning services in Toronto & the GTA.",
  alternates: {
    canonical: "https://ultratidy.ca/contact",
  },
  openGraph: {
    title: "Contact Us | UltraTidy Cleaning Services",
    description:
      "Get a free cleaning quote from UltraTidy! Contact us for cleaning services in Toronto & the GTA.",
    url: "https://ultratidy.ca/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=70"
            alt="Modern clean bathroom"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Get Your Free Quote"
            subtitle="Fill out the form below and we'll get back to you within 24 hours with a personalized quote."
            badge="Contact Us"
            light
          />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact info sidebar */}
              <div className="lg:order-2 space-y-5 lg:sticky lg:top-24 lg:self-start">
                {/* Quick contact */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="p-7 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <h3 className="font-heading font-bold">
                        Quick Contact
                      </h3>
                    </div>

                    {[
                      {
                        icon: Phone,
                        label: "Phone",
                        value: CONTACT_INFO.phone,
                        href: `tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`,
                      },
                      {
                        icon: Mail,
                        label: "Email",
                        value: CONTACT_INFO.email,
                        href: `mailto:${CONTACT_INFO.email}`,
                      },
                      {
                        icon: MapPin,
                        label: "Service Area",
                        value: CONTACT_INFO.serviceArea,
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.label}
                          </p>
                          {item.href ? (
                            <a
                              href={item.href}
                              className="text-sm font-medium hover:text-primary transition-colors"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm">{item.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Hours */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold">
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

                {/* Social links */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-7">
                    <p className="font-heading font-bold text-sm mb-4">
                      Follow Us
                    </p>
                    <div className="flex gap-2">
                      {[
                        {
                          href: SOCIAL_LINKS.instagram,
                          icon: Instagram,
                          label: "Instagram",
                        },
                        {
                          href: SOCIAL_LINKS.facebook,
                          icon: Facebook,
                          label: "Facebook",
                        },
                        {
                          href: SOCIAL_LINKS.googleReview,
                          icon: Star,
                          label: "Google Reviews",
                        },
                      ].map((social) => (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-11 h-11 rounded-xl bg-muted hover:bg-primary/10 flex items-center justify-center transition-all duration-300 hover:scale-110"
                          aria-label={social.label}
                        >
                          <social.icon className="h-5 w-5" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Form */}
              <div className="lg:col-span-2 lg:order-1">
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="p-7 md:p-10">
                    <Suspense
                      fallback={
                        <div className="h-96 animate-pulse bg-muted rounded-xl" />
                      }
                    >
                      <ContactForm />
                    </Suspense>
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
