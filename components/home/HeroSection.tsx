"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shield, Star, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const TRUST_BADGES = [
  { icon: Shield, label: "Licensed & Insured" },
  { icon: Star, label: "5-Star Rated" },
  { icon: CheckCircle2, label: "100% Satisfaction" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden -mt-16 md:-mt-20">
      {/* Background image — team photo */}
      <Image
        src="/images/team/staffs.png"
        alt="UltraTidy professional cleaning team"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/80 via-[#0a2a28]/60 to-[#0a2a28]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(11,189,178,0.15)_0%,_transparent_50%)]" />

      {/* Decorative blurs */}
      <div className="absolute top-1/4 right-[15%] w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 left-[10%] w-48 h-48 bg-primary/5 rounded-full blur-[80px] animate-float [animation-delay:3s]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-white/90">
              Trusted by 500+ homeowners in the GTA
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-white leading-[1.1] tracking-tight animate-fade-in [animation-delay:100ms]">
            It&apos;s not clean
            <br />
            until it&apos;s{" "}
            <span className="text-primary">ULTRACLEAN!</span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed animate-fade-in [animation-delay:200ms]">
            Professional cleaning services in Brantford &amp; the GTA.
            Residential, commercial, and specialty cleaning delivered with care
            and precision.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in [animation-delay:300ms]">
            <Button
              asChild
              size="lg"
              className="rounded-full text-base text-white px-8 h-14 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
            >
              <Link href="/quote" className="flex items-center gap-2">
                Get Instant Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="rounded-full text-base px-8 h-14 bg-white/10 border border-white/25 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
            >
              <Link href="/services">View Our Services</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap justify-center gap-6 md:gap-10 animate-fade-in [animation-delay:500ms]">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2.5 glass px-4 py-2.5 rounded-full"
              >
                <badge.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-white/90">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
