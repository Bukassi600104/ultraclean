import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SERVICES } from "@/lib/constants";
import { ServiceCard } from "@/components/services/ServiceCard";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function ServicesPreview() {
  const featured = SERVICES.slice(0, 3);

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(11,189,178,0.04)_0%,_transparent_70%)]" />
      <div className="container mx-auto px-4 relative">
        <SectionHeading
          title="Our Services"
          subtitle="From regular home cleaning to post-construction cleanup, we handle it all with care and precision."
          badge="What We Offer"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {featured.map((service, index) => (
            <div
              key={service.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <ServiceCard service={service} variant="compact" />
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300"
          >
            View All Services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
