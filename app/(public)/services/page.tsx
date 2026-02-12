import type { Metadata } from "next";
import Image from "next/image";
import { SERVICES } from "@/lib/constants";
import { ServiceCard } from "@/components/services/ServiceCard";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CTASection } from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Professional cleaning services: residential, commercial, deep cleaning, move-in/out, and post-construction. Serving Toronto, GTA & Brantford.",
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
    "Professional cleaning services in Toronto & the GTA.",
  url: "https://ultratidy.ca",
  telephone: "+16478238262",
  email: "hello@ultratidy.ca",
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

      {/* Service cards */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
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
