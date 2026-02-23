import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { BookingCTA } from "@/components/home/BookingCTA";
import { CTASection } from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "UltraTidy Cleaning Services | Brantford & GTA",
  description:
    "Professional cleaning services in Brantford & the GTA. Residential, commercial, deep cleaning, move-in/out, and post-construction cleaning. It's not clean until it's ULTRACLEAN!",
  alternates: {
    canonical: "https://ultratidy.ca",
  },
  openGraph: {
    title: "UltraTidy Cleaning Services | Brantford & GTA",
    description:
      "Professional cleaning services in Brantford & the GTA. It's not clean until it's ULTRACLEAN!",
    url: "https://ultratidy.ca",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://ultratidy.ca/#organization",
  name: "UltraTidy Cleaning Services",
  alternateName: "UltraTidy",
  description:
    "Professional cleaning services in Brantford and the Greater Toronto Area. Residential, commercial, deep cleaning, move-in/move-out, and post-construction cleaning.",
  url: "https://ultratidy.ca",
  telephone: "+15483286260",
  email: "hello@ultratidycleaning.com",
  founder: {
    "@type": "Person",
    name: "Bimbo Oyedotun",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Toronto",
    addressRegion: "ON",
    addressCountry: "CA",
  },
  areaServed: [
    {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 43.6532,
        longitude: -79.3832,
      },
      geoRadius: "50000",
    },
    {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 43.1394,
        longitude: -80.2644,
      },
      geoRadius: "40000",
    },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "10:00",
      closes: "16:00",
    },
  ],
  sameAs: [
    "https://instagram.com/ultratidycleaningservices",
    "https://facebook.com/UltraTidyCleaningServices",
    "https://g.page/r/CbgkPYbL4D3JEBM/review",
  ],
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "500",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HeroSection />
      <StatsBar />
      <ServicesPreview />
      <WhyChooseUs />
      <GalleryPreview />
      <TestimonialsCarousel />
      <BookingCTA />
      <CTASection />
    </>
  );
}
