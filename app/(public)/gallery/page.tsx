import type { Metadata } from "next";
import Image from "next/image";
import { GALLERY_ITEMS } from "@/lib/constants";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CTASection } from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "See the UltraTidy difference! Browse our portfolio of cleaning transformations across Brantford & the GTA.",
  alternates: {
    canonical: "https://ultratidy.ca/gallery",
  },
  openGraph: {
    title: "Gallery | UltraTidy Cleaning Services",
    description:
      "See the UltraTidy difference! Browse our portfolio of cleaning transformations.",
    url: "https://ultratidy.ca/gallery",
  },
};

export default function GalleryPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=1200&q=70"
            alt="Sparkling clean home interior"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Our Work"
            subtitle="Browse our portfolio to see the UltraTidy difference. Real results from real clients across the GTA."
            badge="Portfolio"
            light
          />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <GalleryGrid items={GALLERY_ITEMS} />
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
