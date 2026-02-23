import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Heart, Shield, Users, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BUSINESS_HOURS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about UltraTidy Cleaning Services, founded by Bimbo Oyedotun. Professional cleaning in Brantford & the GTA with a passion for perfection.",
  alternates: {
    canonical: "https://ultratidy.ca/about",
  },
  openGraph: {
    title: "About Us | UltraTidy Cleaning Services",
    description:
      "Learn about UltraTidy Cleaning Services, founded by Bimbo Oyedotun.",
    url: "https://ultratidy.ca/about",
  },
};

const VALUES = [
  {
    icon: Heart,
    title: "Passion for Clean",
    description:
      "We don't just clean — we transform spaces. Every job gets our full attention and care.",
    color: "from-rose-500/10 to-rose-500/5",
  },
  {
    icon: Shield,
    title: "Trust & Reliability",
    description:
      "Bonded and insured professionals who show up on time, every time. Your home is in safe hands.",
    color: "from-blue-500/10 to-blue-500/5",
  },
  {
    icon: Users,
    title: "Client-Focused",
    description:
      "Your satisfaction is our priority. We listen, customize, and deliver beyond expectations.",
    color: "from-amber-500/10 to-amber-500/5",
  },
  {
    icon: Award,
    title: "Quality Guaranteed",
    description:
      "It's not clean until it's ULTRACLEAN. We stand behind every job with our satisfaction guarantee.",
    color: "from-primary/10 to-primary/5",
  },
];

const TEAM = [
  {
    name: "Bimbo Oyedotun",
    role: "Founder & CEO",
    bio: "Bimbo built UltraTidy from the ground up with a passion for spotless spaces and exceptional service.",
    photo: "/images/team/founder.jpg",
  },
  {
    name: "Amara Osei",
    role: "Head of Operations",
    bio: "Keeps every job on schedule and ensures every client receives our five-star standard.",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
  },
  {
    name: "Sarah Mitchell",
    role: "Senior Cleaning Specialist",
    bio: "A deep-clean expert with an eye for detail that no dust bunny can escape.",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
  },
  {
    name: "Daniel Park",
    role: "Commercial Lead",
    bio: "Specialises in commercial and post-construction cleans across the GTA.",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=1200&q=70"
            alt="Professional cleaning team at work"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="About UltraTidy"
            subtitle="Founded with a simple mission: to bring the highest standard of cleanliness to homes and businesses across Brantford & the Greater Toronto Area."
            badge="Our Story"
            light
          />
        </div>
      </section>

      {/* Story section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            {/* Image side */}
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/team/bimbo.jpg"
                  alt="Bimbo Oyedotun, founder of UltraTidy Cleaning Services"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Floating accent card */}
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 max-w-[200px]">
                <p className="text-4xl font-heading font-extrabold text-primary">
                  500+
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Happy clients served across the GTA
                </p>
              </div>
            </div>

            {/* Text side */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Meet the Founder
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight mb-6">
                A Vision for{" "}
                <span className="text-primary">Spotless Spaces</span>
              </h2>
              <div className="space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  UltraTidy Cleaning Services was founded by Bimbo Oyedotun with
                  a vision to redefine what &ldquo;clean&rdquo; means.
                </p>
                <p>
                  What started as a passion for creating spotless, welcoming spaces
                  has grown into a trusted cleaning service serving the entire GTA
                  and Brantford area. We believe your space should be a place of
                  comfort, health, and pride.
                </p>
                <p>
                  Our philosophy is simple:{" "}
                  <strong className="text-foreground">
                    it&apos;s not clean until it&apos;s ULTRACLEAN.
                  </strong>{" "}
                  We don&apos;t cut corners, we clean them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Our Values"
            subtitle="What drives us to deliver exceptional cleaning every single time."
            badge="Core Values"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="group bg-white rounded-2xl p-7 shadow-sm border border-border/50 card-hover"
              >
                <div className="flex gap-5">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shrink-0`}
                  >
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Meet the Team"
            subtitle="The dedicated professionals behind every sparkling clean space."
            badge="Our People"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {TEAM.map((member) => (
              <div key={member.name} className="text-center group">
                <div className="relative w-36 h-36 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300 shadow-lg">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
                <h3 className="font-heading font-bold text-base">{member.name}</h3>
                <p className="text-sm text-primary font-semibold mt-0.5">{member.role}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed px-2">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Area & Hours */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Service Area */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold">
                  Service Area
                </h3>
              </div>
              <p className="text-foreground/70 mb-4">
                We proudly serve clients across:
              </p>
              <ul className="space-y-2.5">
                {[
                  "Greater Toronto Area (GTA)",
                  "Brantford & surrounding areas (40km radius)",
                  "Toronto, Mississauga, Brampton, Markham, Vaughan",
                  "Oakville, Burlington, Hamilton, and more",
                ].map((area) => (
                  <li key={area} className="flex items-center gap-2.5 text-sm text-foreground/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold">
                  Business Hours
                </h3>
              </div>
              <div className="space-y-3">
                {BUSINESS_HOURS.map((item) => (
                  <div
                    key={item.day}
                    className="flex justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium text-sm">{item.day}</span>
                    <span className="text-sm text-primary font-semibold">
                      {item.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 gradient-primary relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10" />
        <div className="container mx-auto px-4 relative text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-tight">
            Let&apos;s Make Your Space Shine
          </h2>
          <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">
            Ready to experience the UltraTidy difference? Get in touch for a
            free quote today.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 rounded-full text-base px-8 h-14 font-semibold bg-white text-[#0a2a28] hover:bg-white/90 shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Link href="/contact" className="flex items-center gap-2">
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
