import type { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PrimefieldContactForm } from "@/components/primefield/PrimefieldContactForm";
import {
  Leaf,
  TruckIcon,
  DollarSign,
  ShieldCheck,
  Fish,
  Beef,
  Egg,
  Sprout,
  ArrowRight,
  MapPin,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Primefield Farms | Fresh Produce from Ibadan, Nigeria",
  description:
    "Primefield Farms — premium catfish, goat, chicken, and farm produce from Ibadan, Nigeria. Reliable supply, competitive pricing, farm-to-table freshness.",
  openGraph: {
    title: "Primefield Farms | Fresh Produce from Ibadan, Nigeria",
    description:
      "Premium catfish, goat, chicken, and farm produce from Ibadan, Nigeria.",
  },
};

const STATS = [
  { value: "500+", label: "Happy Clients" },
  { value: "4", label: "Product Lines" },
  { value: "100%", label: "Farm Fresh" },
  { value: "24hr", label: "Order Turnaround" },
];

const PRODUCTS = [
  {
    name: "Catfish",
    description:
      "Farm-raised African catfish (Clarias gariepinus), fed on premium feed for exceptional taste. Available whole or dressed in all sizes.",
    icon: Fish,
    // Nigerian catfish in water — Unsplash
    image:
      "https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400&q=70",
    badge: "Most Popular",
  },
  {
    name: "Goat",
    description:
      "Healthy, well-nourished goats raised free-range in open pastures. Perfect for events, celebrations, and restaurants.",
    icon: Beef,
    // Goat in open field — Unsplash
    image:
      "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400&q=70",
    badge: null,
  },
  {
    name: "Chicken",
    description:
      "Free-range chickens raised without antibiotics. Fresh, clean, and ready for your kitchen or foodservice business.",
    icon: Egg,
    image:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70",
    badge: null,
  },
  {
    name: "Farm Produce",
    description:
      "Seasonal vegetables, grains, and other farm products grown using sustainable farming practices.",
    icon: Sprout,
    image:
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=70",
    badge: "Seasonal",
  },
];

const VALUE_PROPS = [
  {
    icon: Leaf,
    title: "Farm Fresh",
    description:
      "Direct from our farm to your table — no middlemen, maximum freshness guaranteed.",
  },
  {
    icon: TruckIcon,
    title: "Reliable Supply",
    description:
      "Consistent availability and dependable delivery to meet your business needs.",
  },
  {
    icon: DollarSign,
    title: "Competitive Pricing",
    description:
      "Fair, transparent pricing that helps your business maintain healthy margins.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Assured",
    description:
      "Every product meets our strict standards — healthy livestock, sustainable practices.",
  },
];

export default function PrimefieldPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-[#1B4332]">
        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=70"
            alt="Lush green farmland"
            fill
            className="object-cover opacity-35"
            sizes="100vw"
            loading="eager"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332]/95 via-[#1B4332]/80 to-[#2D6A4F]/50" />
        </div>

        {/* Decorative rings */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full border border-[#95D5B2]/8 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full border border-[#95D5B2]/12 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-[#40916C]/15 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-white/10 text-[#95D5B2] border border-[#95D5B2]/20">
                <MapPin className="h-3 w-3" />
                Ibadan, Oyo State, Nigeria
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-white tracking-tight leading-[1.1]">
                From Our Farm,
                <br />
                <span className="text-[#95D5B2]">Fresh to Your</span>
                <br />
                Table
              </h1>

              <p className="mt-6 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
                Primefield Farms raises premium livestock and grows fresh produce
                in Ibadan, Nigeria. We supply households, restaurants, and
                businesses with the freshest products — direct, no middlemen.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 px-7 h-13 rounded-full text-base font-semibold bg-[#40916C] text-white hover:bg-[#52B788] transition-all duration-300 shadow-xl hover:shadow-[#40916C]/30 hover:scale-105"
                >
                  View Products
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-7 h-13 rounded-full text-base font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  Contact Us
                </a>
              </div>

              {/* Stats row */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-lg">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl sm:text-3xl font-heading font-extrabold text-[#95D5B2]">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/55 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 2×2 product image collage (desktop only) */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-8">
                <div className="relative h-52 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400&q=70"
                    alt="Catfish"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    sizes="280px"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-semibold">Catfish</p>
                  </div>
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=70"
                    alt="Farm Produce"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    sizes="280px"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-semibold">Farm Produce</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="relative h-44 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400&q=70"
                    alt="Goat"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    sizes="280px"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-semibold">Goat</p>
                  </div>
                </div>
                <div className="relative h-52 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70"
                    alt="Chicken"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    sizes="280px"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-semibold">Chicken</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 20C480 40 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[#2D6A4F]/10 text-[#2D6A4F]">
              About Us
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              Rooted in Ibadan, Growing for You
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Primefield Farms is a modern agricultural enterprise based in
              Ibadan, Nigeria. We specialize in raising premium livestock
              including catfish, goats, and chickens, along with seasonal farm
              produce. Our commitment to quality, sustainability, and reliable
              supply makes us a trusted partner for individuals and businesses
              across Oyo State and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section id="products" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[#2D6A4F]/10 text-[#2D6A4F]">
              Our Products
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              What We Offer
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
              Quality livestock and fresh farm produce, raised and harvested with
              care right here in Ibadan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PRODUCTS.map((product) => (
              <Card
                key={product.name}
                className="border-0 shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {product.badge && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-[#2D6A4F] text-white shadow-md">
                      {product.badge}
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <product.icon className="h-5 w-5 text-[#2D6A4F]" />
                    <h3 className="font-heading font-bold">{product.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Primefield ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[#2D6A4F]/10 text-[#2D6A4F]">
              Why Choose Us
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              The Primefield Difference
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {VALUE_PROPS.map((item) => (
              <div
                key={item.title}
                className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-[#2D6A4F]" />
                </div>
                <h3 className="font-heading font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action Banner ── */}
      <section className="py-16 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mb-4">
            Ready to Order Fresh Farm Products?
          </h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8">
            Send us a message and we&apos;ll get back to you within 24 hours with
            availability and pricing.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 h-13 rounded-full text-base font-semibold bg-white text-[#1B4332] hover:bg-[#95D5B2] transition-all duration-300 shadow-xl hover:scale-105"
          >
            Get in Touch
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[#2D6A4F]/10 text-[#2D6A4F]">
                Contact Us
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
                Let&apos;s Talk Business
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Interested in our products or a partnership? Drop us a message
                and we&apos;ll get back to you within 24 hours.
              </p>
            </div>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C]" />
              <CardContent className="p-6 md:p-8">
                <PrimefieldContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1B4332] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-heading font-bold mb-2">
              Primefield <span className="text-[#95D5B2]">Farms</span>
            </h3>
            <p className="text-white/60 text-sm mb-2">
              Ibadan, Oyo State, Nigeria
            </p>
            <p className="text-white/40 text-xs mb-6">
              Fresh produce • Reliable supply • Quality guaranteed
            </p>
            <div className="border-t border-white/10 pt-6">
              <p className="text-white/40 text-xs">
                &copy; {new Date().getFullYear()} Primefield Farms. All rights
                reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
