import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap, Bed, ShoppingBag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  {
    icon: Zap,
    title: "Fast Turnarounds",
    description: "Same-day turnovers to fit tight check-out/check-in windows.",
  },
  {
    icon: Bed,
    title: "Linen Change & Bed-Making",
    description: "Fresh linens, perfectly made beds — guests notice the difference.",
  },
  {
    icon: ShoppingBag,
    title: "Consumables Restocked",
    description: "Soap, toilet paper, and amenities topped up every visit.",
  },
  {
    icon: Calendar,
    title: "Flexible Scheduling",
    description: "Book around your calendar — we work weekends and holidays too.",
  },
];

export function AirbnbSection() {
  return (
    <section className="py-20 md:py-28 bg-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(11,189,178,0.08)_0%,_transparent_60%)]" />
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-5xl mx-auto">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/images/gallery/IMG_1265.jpg"
                alt="Freshly cleaned Airbnb bedroom ready for guests"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl p-5 max-w-[180px]">
              <p className="text-3xl font-heading font-extrabold text-primary">5★</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Average guest rating after every UltraTidy turnover
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wider text-primary mb-5">
              For Airbnb Hosts & Property Managers
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight mb-4">
              Maximize Your Ratings with{" "}
              <span className="text-primary">Stress-Free Turnovers</span>
            </h2>
            <p className="text-foreground/70 leading-relaxed mb-8">
              We specialise in fast, professional turnovers between guests. From sparkling bathrooms to perfectly made beds, we make sure every check-in feels like a five-star hotel experience — so you keep your Superhost status effortlessly.
            </p>

            <ul className="space-y-4 mb-10">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {benefit.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              asChild
              size="lg"
              className="rounded-full text-base px-8 h-13 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
            >
              <Link href="/contact?service=airbnb" className="flex items-center gap-2">
                Get a Turnover Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
