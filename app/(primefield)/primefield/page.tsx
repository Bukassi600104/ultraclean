import type { Metadata } from "next";
import Image from "next/image";
import { PrimefieldContactForm } from "@/components/primefield/PrimefieldContactForm";
import {
  Leaf,
  DollarSign,
  ShieldCheck,
  MapPin,
  Mail,
  Package,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Primefield Farms | Fresh Produce from Ibadan, Nigeria",
  description:
    "Primefield Farms delivers premium quality livestock and sustainably grown agricultural products directly from the rich soils of Ibadan, Nigeria.",
  openGraph: {
    title: "Primefield Farms | Fresh Produce from Ibadan, Nigeria",
    description:
      "Premium catfish, goat, chicken, and farm produce from Ibadan, Nigeria.",
  },
};

const STATS = [
  { value: "500+", label: "Happy Clients" },
  { value: "10", label: "Years Farming" },
  { value: "150", label: "Acres of Land" },
  { value: "2k+", label: "Livestock" },
];

const PRODUCTS = [
  {
    name: "Premium Catfish",
    description: "Freshly harvested, sized to perfection.",
    image: "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&q=70",
    badge: "Most Popular",
  },
  {
    name: "Livestock Goats",
    description: "Well-fed, healthy breeds for events.",
    image: "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400&q=70",
    badge: null,
  },
  {
    name: "Broiler Chicken",
    description: "Tender meat, organically raised.",
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70",
    badge: null,
  },
  {
    name: "Farm Produce",
    description: "Fresh vegetables straight from soil.",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=70",
    badge: "Seasonal",
  },
];

const VALUE_PROPS = [
  {
    icon: Leaf,
    title: "Farm Fresh",
    description:
      "Products harvested daily to ensure maximum freshness when they reach you.",
  },
  {
    icon: Package,
    title: "Reliable Supply",
    description:
      "Consistent stock levels for both individual needs and bulk commercial orders.",
  },
  {
    icon: DollarSign,
    title: "Competitive Pricing",
    description:
      "Premium quality made affordable directly from the farm, cutting out middlemen.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Assured",
    description:
      "Rigorous health checks and organic feed ensure our livestock is top tier.",
  },
];

export default function PrimefieldPage() {
  return (
    <div className="text-[#1B4332] overflow-x-hidden">

      {/* ── Sticky Navbar ── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#2D6A4F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1B4332]/5 rounded-full flex items-center justify-center">
                <Leaf className="h-5 w-5 text-[#1B4332]" />
              </div>
              <h2 className="text-[#1B4332] text-xl font-bold tracking-tight font-display">
                Primefield Farms
              </h2>
            </div>
            <nav className="hidden md:flex gap-8">
              <a
                className="text-[#1B4332] hover:text-[#40916C] transition-colors text-sm font-semibold"
                href="#"
              >
                Home
              </a>
              <a
                className="text-[#1B4332]/70 hover:text-[#40916C] transition-colors text-sm font-medium"
                href="#about"
              >
                About
              </a>
              <a
                className="text-[#1B4332]/70 hover:text-[#40916C] transition-colors text-sm font-medium"
                href="#products"
              >
                Products
              </a>
              <a
                className="text-[#1B4332]/70 hover:text-[#40916C] transition-colors text-sm font-medium"
                href="#contact"
              >
                Contact
              </a>
            </nav>
            <a
              href="#contact"
              className="bg-[#1B4332] hover:bg-[#2D6A4F] transition-colors text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-[#1B4332]/20"
            >
              Order Now
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <div className="relative w-full bg-[#1B4332] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=70"
            alt="Lush green farmland"
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B4332] via-[#1B4332]/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16">
          {/* Left content */}
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full">
              <MapPin className="h-3 w-3 text-[#95D5B2]" />
              <span className="text-white text-xs font-semibold tracking-wide uppercase">
                Ibadan, Oyo State, Nigeria
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] font-display">
              From Our Farm, <br />
              <em className="text-[#95D5B2] not-italic">Fresh</em> to Your Table
            </h1>

            <p className="text-gray-300 text-lg max-w-xl font-light leading-relaxed">
              Primefield Farms delivers premium quality livestock and sustainably
              grown agricultural products directly from the rich soils of Ibadan.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#products"
                className="bg-[#40916C] hover:bg-[#52B788] text-white px-8 py-4 rounded-lg text-base font-bold shadow-lg shadow-[#40916C]/30 transition-all hover:-translate-y-0.5"
              >
                View Products
              </a>
              <a
                href="#contact"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-lg text-base font-bold transition-all"
              >
                Contact Us
              </a>
            </div>
          </div>

          {/* Right: Staggered image grid (desktop only) */}
          <div className="flex-1 hidden lg:grid grid-cols-2 gap-4 w-full max-w-lg">
            <div className="space-y-4 mt-8">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl relative group">
                <Image
                  src="https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&q=70"
                  alt="Fresh catfish"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="250px"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold">Catfish</p>
                </div>
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl relative group">
                <Image
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=70"
                  alt="Farm produce"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="250px"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold">Farm Produce</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl relative group">
                <Image
                  src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70"
                  alt="Chicken"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="250px"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold">Chicken</p>
                </div>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl relative group">
                <Image
                  src="https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400&q=70"
                  alt="Goat"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="250px"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold">Goat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Card ── */}
      <div className="bg-[#2D6A4F] relative z-20 -mt-8 mx-4 lg:mx-auto max-w-7xl rounded-xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {STATS.map((stat) => (
            <div key={stat.label} className="p-6 text-center">
              <p className="text-3xl font-bold text-white font-display">{stat.value}</p>
              <p className="text-[#95D5B2] text-sm uppercase tracking-wider font-semibold mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── About Section ── */}
      <section className="py-24 bg-[#F9F7F2]" id="about">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-[#2D6A4F] font-bold tracking-widest text-sm uppercase mb-4 block">
            Our Story
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1B4332] mb-8 leading-tight font-display">
            Rooted in Ibadan,
            <br />
            Growing for You
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Primefield Farms is more than just a farm; it&apos;s a commitment to
            excellence. We leverage modern agricultural practices combined with
            traditional care to bring you livestock and produce that are healthy,
            organic, and ethically raised. Our dedication ensures that every product
            from our farm meets the highest standards of quality.
          </p>
        </div>
      </section>

      {/* ── Products Section ── */}
      <section className="py-24 bg-[#E8F3EB]" id="products">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B4332] mb-4 font-display">
              Our Premium Products
            </h2>
            <p className="text-gray-600 max-w-xl">
              Ethically raised livestock and fresh harvest, ready for order.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRODUCTS.map((product) => (
              <div
                key={product.name}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {product.badge && (
                    <div className="absolute top-4 right-4 bg-[#40916C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      {product.badge}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#1B4332] font-display mb-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">{product.description}</p>
                  <a
                    href="#contact"
                    className="block w-full py-3 text-center border border-[#2D6A4F]/20 rounded-lg text-[#2D6A4F] font-bold hover:bg-[#2D6A4F] hover:text-white transition-colors text-sm"
                  >
                    Order Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2D6A4F] font-bold tracking-widest text-sm uppercase mb-3 block">
              Why Primefield?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B4332] font-display">
              The Standard of Excellence
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {VALUE_PROPS.map((item) => (
              <div
                key={item.title}
                className="p-8 rounded-2xl bg-[#F9F7F2] border border-[#E8F3EB] hover:border-[#2D6A4F]/30 transition-colors group"
              >
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-7 w-7 text-[#2D6A4F]" />
                </div>
                <h3 className="text-xl font-bold text-[#1B4332] mb-3 font-display">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-[#1B4332] px-6 py-16 md:px-16 md:py-20 text-center">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#40916C]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#D4A373]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-display">
                Ready to Order Fresh Farm Products?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Experience the difference of locally sourced, premium agricultural
                products.
              </p>
              <a
                href="#contact"
                className="inline-block bg-white text-[#1B4332] hover:bg-gray-100 px-8 py-4 rounded-lg text-base font-bold shadow-lg transition-transform transform hover:-translate-y-1"
              >
                Start Your Order
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section className="py-24 bg-[#F9F7F2]" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Contact info */}
            <div>
              <span className="text-[#2D6A4F] font-bold tracking-widest text-sm uppercase mb-3 block">
                Get In Touch
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#1B4332] mb-6 font-display">
                Let&apos;s Talk Business
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Whether you need a bulk supply of catfish, a specific livestock
                order, or just have questions about our farm, we are here to help.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-[#2D6A4F]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1B4332]">Email Us</h4>
                    <p className="text-gray-600">hello@ultratidycleaning.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-[#2D6A4F]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1B4332]">Our Farm</h4>
                    <p className="text-gray-600">Ibadan, Oyo State, Nigeria</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact form */}
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-[#E8F3EB]">
              <PrimefieldContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1B4332] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <Leaf className="h-4 w-4 text-[#95D5B2]" />
              </div>
              <h2 className="text-xl font-bold font-display tracking-tight">
                Primefield Farms
              </h2>
            </div>
            <p className="text-gray-400 text-sm">Ibadan, Oyo State, Nigeria</p>
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Primefield Farms. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
