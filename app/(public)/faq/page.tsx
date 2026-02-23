import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Calendar,
  Wrench,
  DollarSign,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_INFO } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Got questions about UltraTidy Cleaning Services? Find answers about booking, pricing, supplies, cancellations, and more. Serving Brantford & the GTA.",
  alternates: { canonical: "https://ultratidy.ca/faq" },
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
    { "@type": "Question", name: "Are you insured?", acceptedAnswer: { "@type": "Answer", text: "Yes, UltraTidy is fully insured. You can rest easy knowing your property and belongings are protected at all times." } },
    { "@type": "Question", name: "How do I book a cleaning appointment?", acceptedAnswer: { "@type": "Answer", text: "Simply fill out our online contact form or give us a call. You'll receive a quote within a few hours. Once you approve it, we'll confirm your appointment and send you our service guidelines." } },
    { "@type": "Question", name: "Do you bring your own cleaning supplies and equipment?", acceptedAnswer: { "@type": "Answer", text: "Absolutely. Our team arrives fully equipped with professional-grade tools, microfiber cloths, vacuums, and eco-friendly cleaning products safe for your family and pets." } },
    { "@type": "Question", name: "What is your minimum booking duration?", acceptedAnswer: { "@type": "Answer", text: "Our minimum booking is 3 hours for commercial cleaning and 4 hours for residential." } },
    { "@type": "Question", name: "Do I have to be home during the cleaning?", acceptedAnswer: { "@type": "Answer", text: "Not at all. Most of our clients provide access instructions and return to a freshly cleaned space." } },
    { "@type": "Question", name: "What is your cancellation policy?", acceptedAnswer: { "@type": "Answer", text: "We ask for at least 24 hours' notice for any cancellations or reschedules. Same-day cancellations may be subject to a fee." } },
    { "@type": "Question", name: "What if something gets damaged during service?", acceptedAnswer: { "@type": "Answer", text: "Our team takes great care with your belongings. In the rare event of damage, we photograph and report it immediately and work promptly and fairly to resolve the issue." } },
    { "@type": "Question", name: "What if I have pets?", acceptedAnswer: { "@type": "Answer", text: "We love pets! Our cleaners are trained to work safely around animals and use pet-friendly products." } },
    { "@type": "Question", name: "What areas do you serve?", acceptedAnswer: { "@type": "Answer", text: "We serve the Greater Toronto Area (GTA) and Brantford within a 40km radius." } },
    { "@type": "Question", name: "What payment methods do you accept?", acceptedAnswer: { "@type": "Answer", text: "We accept e-transfer and major credit cards. Payment is due upon completion of service." } },
  ],
};

const CATEGORIES = [
  {
    id: "booking",
    label: "Booking & Scheduling",
    Icon: Calendar,
    color: "from-sky-500/20 to-sky-500/5",
    iconColor: "text-sky-500",
    items: [
      {
        q: "How do I book a cleaning appointment?",
        a: `Fill out our online contact form or call us at ${CONTACT_INFO.phone}. You'll receive a personalised quote within a few hours. Once approved, we confirm your appointment and send our detailed service checklist.`,
      },
      {
        q: "Do I have to be home during the cleaning?",
        a: "Not at all. Most clients give us access instructions and come home to a spotless space. If you prefer to be present, that's perfectly fine — we work around whatever makes you comfortable.",
      },
      {
        q: "How often can I schedule service?",
        a: "Choose the frequency that fits your lifestyle — weekly, bi-weekly, monthly, or a one-time clean. We adapt to your schedule, not the other way around.",
      },
      {
        q: "Will my first clean take longer than follow-up visits?",
        a: "Usually yes. The initial clean brings your space up to the UltraTidy standard. Once that baseline is set, recurring visits are faster, smoother, and more efficient.",
      },
    ],
  },
  {
    id: "services",
    label: "Our Services",
    Icon: Wrench,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-500",
    items: [
      {
        q: "What exactly is included in a clean?",
        a: "Every job follows our detailed, standardised checklist — dusting all surfaces, vacuuming, mopping, sanitising kitchens and bathrooms, emptying bins, wiping baseboards, and more. Have a special request? Just let us know in advance.",
      },
      {
        q: "Do you bring your own supplies and equipment?",
        a: "Absolutely. Our crew arrives fully equipped with professional-grade tools, microfiber cloths, HEPA vacuums, and eco-friendly products that are safe for children and pets. Prefer we use your supplies? No problem — just say the word.",
      },
      {
        q: "What is your minimum booking duration?",
        a: "Commercial jobs start at 3 hours and residential at 4 hours. Deep cleaning, move-in/out, and post-construction jobs require additional time depending on the size and condition of the space.",
      },
      {
        q: "What areas do you serve?",
        a: "We cover the Greater Toronto Area and Brantford within a 40 km radius — including Toronto, Mississauga, Brampton, Markham, Vaughan, Oakville, Burlington, and Hamilton.",
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing & Payment",
    Icon: DollarSign,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
    items: [
      {
        q: "How is pricing determined?",
        a: "Pricing is based on service type, space size, and cleaning frequency. Residential services start at $150 and commercial at $200. Contact us for a free, no-obligation quote tailored to your exact needs.",
      },
      {
        q: "Are there any hidden fees?",
        a: "Never. Your quote is your price. The only time costs change is if the scope of work expands significantly — and we'll always discuss that with you before proceeding.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept Interac e-transfer and all major credit cards. Payment is due upon completion of service.",
      },
      {
        q: "Can the cleaners accept tips?",
        a: "Tips aren't expected but are always appreciated by our hardworking team. You can add a tip in cash or include it with your e-transfer.",
      },
    ],
  },
  {
    id: "trust",
    label: "Trust & Safety",
    Icon: ShieldCheck,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
    items: [
      {
        q: "Are you insured?",
        a: "Yes — UltraTidy carries full liability insurance. Your property and belongings are protected on every single visit, giving you complete peace of mind.",
      },
      {
        q: "What if something is damaged during service?",
        a: "We treat every home like our own. In the rare event of an issue, our team photographs and reports it immediately and works quickly and fairly to make it right.",
      },
      {
        q: "What is your cancellation policy?",
        a: "We kindly ask for 24 hours' notice for cancellations or reschedules. Same-day cancellations may incur a fee. Life happens — just reach out as early as you can and we'll do our best to accommodate.",
      },
      {
        q: "What if I have pets?",
        a: "We're pet-friendly! Our cleaners are trained to work safely around animals and use pet-safe products. For everyone's comfort, we recommend placing pets in a separate room or crate while we work.",
      },
    ],
  },
];

const QUICK_STATS = [
  { value: "500+", label: "Happy Clients" },
  { value: "5★", label: "Google Rating" },
  { value: "Fully", label: "Insured" },
  { value: "GTA &", label: "Brantford" },
];

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/gallery/residential-kitchen-island-clean.jpg"
            alt="Spotless kitchen cleaned by UltraTidy"
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          {/* Same two-layer gradient as every other inner-page hero */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(11,189,178,0.12)_0%,_transparent_55%)]" />
        </div>

        {/* Floating blur blobs */}
        <div className="absolute top-1/4 right-[15%] w-56 h-56 bg-primary/10 rounded-full blur-[90px]" />
        <div className="absolute bottom-1/4 left-[8%] w-40 h-40 bg-primary/5 rounded-full blur-[70px]" />

        <div className="container mx-auto px-4 relative text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-xs font-bold uppercase tracking-widest mb-6">
            Got Questions?
          </span>
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold tracking-tight text-white mb-5 max-w-3xl mx-auto leading-tight">
            Frequently Asked{" "}
            <span className="text-primary">Questions</span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about booking, pricing, and what to
            expect from UltraTidy Cleaning Services.
          </p>
        </div>

        {/* Bottom fade — matches homepage & services page */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="bg-[#0a2a28] border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {QUICK_STATS.map((stat) => (
              <div key={stat.label} className="py-5 px-6 text-center">
                <p className="text-2xl font-heading font-extrabold text-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ Body ─────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-10 max-w-6xl mx-auto">

            {/* Sticky category nav — desktop only */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-3">
                  Categories
                </p>
                {CATEGORIES.map((cat) => (
                  <a
                    key={cat.id}
                    href={`#${cat.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-foreground/60 hover:text-primary hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                      <cat.Icon className={`h-4 w-4 ${cat.iconColor}`} />
                    </span>
                    {cat.label}
                  </a>
                ))}

                {/* Contact aside */}
                <div className="mt-8 p-4 rounded-2xl bg-muted/60 border border-border/50">
                  <p className="text-xs font-semibold text-foreground/60 mb-3">
                    Still have questions?
                  </p>
                  <a
                    href={`tel:${CONTACT_INFO.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-2"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {CONTACT_INFO.phone}
                  </a>
                  <a
                    href={`mailto:${CONTACT_INFO.email}`}
                    className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email us
                  </a>
                </div>
              </div>
            </aside>

            {/* FAQ sections */}
            <div className="flex-1 space-y-16">
              {CATEGORIES.map((cat, catIdx) => (
                <div key={cat.id} id={cat.id} className="scroll-mt-28">
                  {/* Category header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                      <cat.Icon className={`h-5 w-5 ${cat.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Section {String(catIdx + 1).padStart(2, "0")}
                      </p>
                      <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground">
                        {cat.label}
                      </h2>
                    </div>
                  </div>

                  {/* FAQ items */}
                  <div className="space-y-3">
                    {cat.items.map((item, i) => (
                      <details
                        key={i}
                        className="group peer bg-white border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 open:shadow-lg open:border-primary/30"
                      >
                        <summary className="flex items-center gap-4 px-6 py-5 cursor-pointer list-none select-none">
                          {/* Number badge */}
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0 group-open:bg-primary group-open:text-white transition-colors duration-200">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="flex-1 font-semibold text-foreground text-sm md:text-base leading-snug">
                            {item.q}
                          </span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground group-open:text-primary shrink-0 transition-transform duration-300 group-open:rotate-180" />
                        </summary>
                        {/* Answer */}
                        <div className="relative px-6 pb-6 pt-0 ml-11">
                          <div className="absolute left-6 top-0 bottom-6 w-px bg-primary/20" />
                          <p className="text-sm text-muted-foreground leading-relaxed pl-5">
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
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a2a28]" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-white tracking-tight mb-4">
              Didn&apos;t find your answer?
            </h2>
            <p className="text-white/50 mb-10 text-lg">
              Our friendly team is ready to help — reach out by phone or message
              and we&apos;ll get back to you fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="rounded-full px-10 h-12 font-semibold shadow-lg shadow-primary/30"
              >
                <Link href="/contact" className="flex items-center gap-2">
                  Send Us a Message
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <a
                href={`tel:${CONTACT_INFO.phone.replace(/\D/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-full px-10 h-12 font-semibold bg-white/10 border border-white/25 text-white hover:bg-white/20 transition-colors duration-200 text-base"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>{CONTACT_INFO.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
