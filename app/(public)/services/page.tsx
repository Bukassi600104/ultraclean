import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SERVICES } from "@/lib/constants";
import { ServiceCard } from "@/components/services/ServiceCard";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CTASection } from "@/components/home/CTASection";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Professional cleaning services: residential, commercial, deep cleaning, move-in/out, and post-construction. Serving Brantford & the GTA.",
  alternates: {
    canonical: "https://ultratidy.ca/services",
  },
  openGraph: {
    title: "Our Services | UltraTidy Cleaning Services",
    description:
      "Professional cleaning services: residential, commercial, deep cleaning, move-in/out, and post-construction.",
    url: "https://ultratidy.ca/services",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "UltraTidy Cleaning Services",
  description:
    "Professional cleaning services in Brantford & the GTA.",
  url: "https://ultratidy.ca",
  telephone: "+15483286260",
  email: "hello@ultratidycleaning.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Toronto",
    addressRegion: "ON",
    addressCountry: "CA",
  },
  areaServed: [
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: 43.6532, longitude: -79.3832 },
      geoRadius: "50000",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: 43.1394, longitude: -80.2644 },
      geoRadius: "40000",
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Cleaning Services",
    itemListElement: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service.name, description: service.description },
      priceSpecification: { "@type": "PriceSpecification", price: service.startingPrice, priceCurrency: "CAD", minPrice: service.startingPrice },
    })),
  },
};

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* Page hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=70"
            alt="Cleaning supplies and equipment"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Our Services"
            subtitle="We offer a full range of professional cleaning services tailored to your needs. Every job includes our UltraTidy guarantee."
            badge="What We Offer"
            light
          />
        </div>
      </section>

      {/* Pricing overview */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Simple, Transparent Pricing"
            subtitle="No hidden fees. Every quote is tailored to your space — contact us for a free estimate."
            badge="Pricing"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-2">
            {/* Residential card */}
            <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-8 pt-8 pb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                  Residential
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-heading font-extrabold text-foreground">
                    $150
                  </span>
                  <span className="text-sm text-muted-foreground mb-1.5">
                    &nbsp;starting at
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Perfect for homes of any size
                </p>
              </div>
              <div className="px-8 pb-8 flex-1 flex flex-col justify-between">
                <ul className="space-y-3 mb-8">
                  {[
                    "Regular home cleaning",
                    "Deep cleaning",
                    "Move-in / Move-out",
                    "Kitchens & bathrooms",
                    "Vacuuming & mopping",
                    "Eco-friendly products",
                  ].map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-foreground/70">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-full h-11 font-semibold">
                  <Link href="/contact?service=residential">
                    Get a Free Quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Commercial card */}
            <div className="bg-[#0a2a28] rounded-3xl border border-primary/20 shadow-xl overflow-hidden flex flex-col relative">
              <div className="absolute top-5 right-5 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
                Popular
              </div>
              <div className="px-8 pt-8 pb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                  Commercial
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-heading font-extrabold text-white">
                    $200
                  </span>
                  <span className="text-sm text-white/50 mb-1.5">
                    &nbsp;starting at
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  Offices, medical, retail & more
                </p>
              </div>
              <div className="px-8 pb-8 flex-1 flex flex-col justify-between">
                <ul className="space-y-3 mb-8">
                  {[
                    "Office & workspace cleaning",
                    "Medical & dental facilities",
                    "Retail & restaurant spaces",
                    "Post-construction clean-up",
                    "Restroom sanitization",
                    "Flexible scheduling",
                  ].map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-white/70">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full rounded-full h-11 font-semibold bg-primary hover:bg-primary/90 text-white"
                >
                  <Link href="/contact?service=commercial">
                    Get a Free Quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All prices are starting rates in CAD. Final quotes are based on
            property size, condition, and service type.{" "}
            <Link href="/faq" className="text-primary hover:underline">
              See our FAQ
            </Link>{" "}
            for more details.
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="All Services"
            subtitle="Every job includes our UltraTidy guarantee — it&apos;s not clean until it&apos;s ULTRACLEAN."
            badge="What We Offer"
          />
          <div className="space-y-8 max-w-4xl mx-auto">
            {SERVICES.map((service, index) => (
              <div
                key={service.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ServiceCard service={service} variant="full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
