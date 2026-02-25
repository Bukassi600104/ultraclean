import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/constants";
import { ServiceCard } from "@/components/services/ServiceCard";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CTASection } from "@/components/home/CTASection";

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
  description: "Professional cleaning services in Brantford & the GTA.",
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
      priceSpecification: {
        "@type": "PriceSpecification",
        price: service.startingPrice,
        priceCurrency: "CAD",
        minPrice: service.startingPrice,
      },
    })),
  },
};

// Index of the "featured" service (commercial = index 1)
const FEATURED_INDEX = 1;

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/team/staff-cleaning-office.png"
            alt="UltraTidy professional cleaner at work"
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Our Services & Pricing"
            subtitle="Transparent starting rates, no hidden fees. Every job comes with the UltraTidy guarantee — it's not clean until it's ULTRACLEAN!"
            badge="What We Offer"
            light
          />
        </div>
      </section>

      {/* ── Pricing Cards ─────────────────────────────── */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {SERVICES.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                variant="pricing"
                featured={index === FEATURED_INDEX}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            All prices are starting rates in CAD. Final quotes are based on
            property size, condition, and service type.{" "}
            <Link href="/faq" className="text-primary hover:underline">
              See our FAQ
            </Link>{" "}
            for details.
          </p>
        </div>
      </section>

      <CTASection />
    </>
  );
}
