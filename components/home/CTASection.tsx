import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { CONTACT_INFO } from "@/lib/constants";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_50%)]" />

      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10" />

      <div className="container mx-auto px-4 relative text-center max-w-5xl">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-tight">
          Ready for a Spotless Home?
        </h2>
        <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">
          Get a free, no-obligation quote today. Experience the UltraTidy
          difference that hundreds of GTA homeowners trust.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-full text-base px-8 h-14 font-semibold bg-white text-[#0a2a28] hover:bg-white/90 shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Link href="/contact" className="flex items-center gap-2">
              Get Your Free Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="rounded-full text-base px-8 h-14 bg-white/10 border border-white/25 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
          >
            <a
              href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Call Us Now
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
