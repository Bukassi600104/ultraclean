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

const PRODUCTS = [
  {
    name: "Catfish",
    description:
      "Farm-raised catfish, fed with premium feed for the best taste and quality. Available in various sizes.",
    icon: Fish,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=70",
  },
  {
    name: "Goat",
    description:
      "Healthy, well-nourished goats raised in open pastures. Perfect for events and daily consumption.",
    icon: Beef,
    image:
      "https://images.unsplash.com/photo-1524024973431-2ad916746264?w=400&q=70",
  },
  {
    name: "Chicken",
    description:
      "Free-range chickens raised without antibiotics. Fresh and ready for your kitchen or business.",
    icon: Egg,
    image:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70",
  },
  {
    name: "Farm Produce",
    description:
      "Seasonal vegetables, grains, and other farm products grown using sustainable farming practices.",
    icon: Sprout,
    image:
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=70",
  },
];

const VALUE_PROPS = [
  {
    icon: Leaf,
    title: "Fresh Produce",
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
      "Every product meets our strict quality standards — healthy livestock, sustainable practices.",
  },
];

export default function PrimefieldPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=70"
            alt="Lush green farmland"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B4332]/90 via-[#1B4332]/70 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-white/10 text-white/80">
              Ibadan, Nigeria
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-white tracking-tight leading-tight">
              Primefield
              <span className="text-[#95D5B2]"> Farms</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl leading-relaxed">
              Premium livestock and farm produce, raised with care in Ibadan,
              Nigeria. From our farm to your table — freshness you can trust.
            </p>
            <a
              href="#contact"
              className="mt-8 inline-flex items-center gap-2 px-8 h-14 rounded-full text-base font-semibold bg-[#2D6A4F] text-white hover:bg-[#40916C] transition-all duration-300 shadow-xl hover:scale-105"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* About */}
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
              alike.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 bg-gray-50">
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
              care.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PRODUCTS.map((product) => (
              <Card
                key={product.name}
                className="border-0 shadow-md overflow-hidden group hover:shadow-xl transition-shadow duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <product.icon className="h-5 w-5 text-[#2D6A4F]" />
                    <h3 className="font-heading font-bold">{product.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              Why Primefield?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-[#2D6A4F]" />
                </div>
                <h3 className="font-heading font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
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
              <div className="h-1 bg-gradient-to-r from-[#2D6A4F] to-[#40916C]" />
              <CardContent className="p-6 md:p-8">
                <PrimefieldContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B4332] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-heading font-bold mb-2">
              Primefield <span className="text-[#95D5B2]">Farms</span>
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Ibadan, Oyo State, Nigeria
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
