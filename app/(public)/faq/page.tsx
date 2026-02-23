import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CONTACT_INFO } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Got questions about UltraTidy Cleaning Services? Find answers about booking, pricing, supplies, cancellations, and more. Serving Brantford & the GTA.",
  alternates: {
    canonical: "https://ultratidy.ca/faq",
  },
  openGraph: {
    title: "FAQ | UltraTidy Cleaning Services",
    description:
      "Answers to the most common questions about UltraTidy Cleaning Services.",
    url: "https://ultratidy.ca/faq",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are you insured?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, UltraTidy is fully insured. You can rest easy knowing your property and belongings are protected at all times.",
      },
    },
    {
      "@type": "Question",
      name: "How do I book a cleaning appointment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Simply fill out our online contact form or give us a call. You'll receive a quote within a few hours. Once you approve it, we'll confirm your appointment and send you our service guidelines.",
      },
    },
    {
      "@type": "Question",
      name: "Do you bring your own cleaning supplies and equipment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Our team arrives fully equipped with professional-grade tools, microfiber cloths, vacuums, and eco-friendly cleaning products safe for your family and pets. If you'd prefer we use your own supplies, just let us know in advance.",
      },
    },
    {
      "@type": "Question",
      name: "What is your minimum booking duration?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our minimum booking is 3 hours for commercial cleaning and 4 hours for residential. Deep cleaning, move-in/out, and post-construction jobs typically require more time depending on the size of the space.",
      },
    },
    {
      "@type": "Question",
      name: "Do I have to be home during the cleaning?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not at all. Most of our clients provide access instructions and return to a freshly cleaned space. If you'd prefer to be home, that's perfectly fine — whatever makes you most comfortable.",
      },
    },
    {
      "@type": "Question",
      name: "What is your cancellation policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We ask for at least 24 hours' notice for any cancellations or reschedules. Same-day cancellations may be subject to a fee. We understand life happens, so please reach out as early as possible.",
      },
    },
    {
      "@type": "Question",
      name: "What if something gets damaged during service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our team takes great care with your belongings. In the rare event of damage, we photograph and report it immediately and work promptly and fairly to resolve the issue.",
      },
    },
    {
      "@type": "Question",
      name: "What if I have pets?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We love pets! Our cleaners are trained to work safely around animals and use pet-friendly products. To keep everyone comfortable, we recommend putting pets in a crate or separate room during the clean.",
      },
    },
    {
      "@type": "Question",
      name: "Will my initial clean take longer than regular visits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Usually, yes. The first clean often takes extra time to get your space to our UltraTidy standard. Once that foundation is set, recurring visits are faster and more efficient.",
      },
    },
    {
      "@type": "Question",
      name: "How often can I schedule cleaning service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can choose the frequency that suits you — weekly, bi-weekly, monthly, or a one-time clean. We'll work around your schedule.",
      },
    },
    {
      "@type": "Question",
      name: "What areas do you serve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We serve the Greater Toronto Area (GTA) and Brantford within a 40km radius, including Toronto, Mississauga, Brampton, Markham, Vaughan, Oakville, Burlington, and Hamilton.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept e-transfer and major credit cards. Payment is due upon completion of service.",
      },
    },
  ],
};

const FAQ_CATEGORIES = [
  {
    category: "Booking & Scheduling",
    items: [
      {
        q: "How do I book a cleaning appointment?",
        a: "Simply fill out our online contact form or give us a call at " +
          CONTACT_INFO.phone +
          ". You'll receive a quote within a few hours. Once you approve it, we'll confirm your appointment and send you our service checklist.",
      },
      {
        q: "Do I have to be home during the cleaning?",
        a: "Not at all. Most of our clients provide access instructions and return to a freshly cleaned space. If you prefer to be home, that's perfectly fine — whatever makes you most comfortable.",
      },
      {
        q: "How often can I schedule cleaning service?",
        a: "You choose the frequency that suits your lifestyle — weekly, bi-weekly, monthly, or a one-time clean. We work around your schedule.",
      },
      {
        q: "Will my initial clean take longer than regular visits?",
        a: "Usually, yes. The first clean often takes extra time to bring your space up to our UltraTidy standard. Once that foundation is set, recurring visits are faster and more efficient.",
      },
    ],
  },
  {
    category: "Our Services",
    items: [
      {
        q: "What tasks are covered during my cleaning?",
        a: "Every clean is guided by our detailed, standardized checklist — dusting, vacuuming, mopping, sanitizing kitchens and bathrooms, wiping surfaces, and more. If there's something specific you'd like added, just let us know in advance.",
      },
      {
        q: "What is your minimum booking duration?",
        a: "Our minimum is 3 hours for commercial cleaning and 4 hours for residential. Deep cleaning, move-in/out, and post-construction jobs typically require more time based on the size of the space.",
      },
      {
        q: "Do you bring your own cleaning supplies and equipment?",
        a: "Absolutely. Our team arrives fully equipped with professional-grade tools, microfiber cloths, vacuums, and eco-friendly products safe for families and pets. If you'd prefer we use your own supplies, just let us know.",
      },
      {
        q: "What areas do you serve?",
        a: "We serve the Greater Toronto Area (GTA) and Brantford within a 40km radius — including Toronto, Mississauga, Brampton, Markham, Vaughan, Oakville, Burlington, and Hamilton.",
      },
    ],
  },
  {
    category: "Pricing & Payment",
    items: [
      {
        q: "How is pricing determined?",
        a: "Pricing is based on the type of service, size of the space, and frequency. Our residential services start at $150, and commercial at $200. Contact us for a free, no-obligation quote tailored to your needs.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept e-transfer and major credit cards. Payment is due upon completion of service.",
      },
      {
        q: "Can the cleaners accept tips?",
        a: "Yes, absolutely. While tipping isn't required, it's always appreciated by our hardworking team. Tips can be given in cash or added to your e-transfer payment.",
      },
    ],
  },
  {
    category: "Trust & Safety",
    items: [
      {
        q: "Are you insured?",
        a: "Yes, UltraTidy is fully insured. You can rest easy knowing your property and belongings are protected at all times.",
      },
      {
        q: "What if something gets damaged during service?",
        a: "Our team takes great care with your belongings. In the rare event of damage, we document and report it immediately and work promptly and fairly to resolve the situation.",
      },
      {
        q: "What is your cancellation policy?",
        a: "We ask for at least 24 hours' notice for any cancellations or reschedules. Same-day cancellations may be subject to a fee. We understand life happens — please reach out as early as possible.",
      },
      {
        q: "What if I have pets?",
        a: "We love pets! Our cleaners are trained to work safely around animals and use pet-friendly products. To keep everyone comfortable, we recommend placing pets in a crate or separate room during the clean.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden gradient-primary">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10" />
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about booking, pricing, and what to expect from UltraTidy Cleaning Services."
            badge="Got Questions?"
            light
          />
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-14">
            {FAQ_CATEGORIES.map((section) => (
              <div key={section.category}>
                <h2 className="text-xl font-heading font-bold text-foreground mb-6 pb-3 border-b border-border flex items-center gap-3">
                  <span className="w-1.5 h-6 rounded-full bg-primary inline-block shrink-0" />
                  {section.category}
                </h2>
                <div className="space-y-3">
                  {section.items.map((item, i) => (
                    <details
                      key={i}
                      className="group bg-white border border-border/60 rounded-2xl overflow-hidden shadow-sm open:shadow-md transition-shadow duration-200"
                    >
                      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none">
                        <span className="font-semibold text-foreground text-sm md:text-base leading-snug">
                          {item.q}
                        </span>
                        <ChevronDown className="h-5 w-5 text-primary shrink-0 transition-transform duration-300 group-open:rotate-180" />
                      </summary>
                      <div className="px-6 pb-5 pt-1">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight mb-4">
              Still have questions?
            </h2>
            <p className="text-muted-foreground mb-8">
              Our team is happy to help. Reach out and we&apos;ll get back to
              you promptly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 h-12 font-semibold"
              >
                <Link href="/contact" className="flex items-center gap-2">
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 font-semibold"
              >
                <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}>
                  Call {CONTACT_INFO.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
