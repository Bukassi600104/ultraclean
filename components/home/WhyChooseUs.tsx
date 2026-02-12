import { Leaf, GraduationCap, CalendarDays, ThumbsUp } from "lucide-react";

const FEATURES = [
  {
    icon: Leaf,
    title: "Eco-Friendly Products",
    description:
      "We use environmentally safe, non-toxic cleaning products that are gentle on your home and the planet.",
  },
  {
    icon: GraduationCap,
    title: "Trained Professionals",
    description:
      "Our team is thoroughly vetted, trained, and experienced in handling any cleaning challenge.",
  },
  {
    icon: CalendarDays,
    title: "Flexible Scheduling",
    description:
      "Book a one-time deep clean or schedule recurring visits that fit your lifestyle perfectly.",
  },
  {
    icon: ThumbsUp,
    title: "Satisfaction Guaranteed",
    description:
      "Not happy? We'll re-clean for free. We stand behind every job with our 100% satisfaction guarantee.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 md:py-28 gradient-dark relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-white/80 mb-4">
            Why UltraTidy
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight text-white">
            Why Choose Us
          </h2>
          <p className="mt-5 text-lg text-white/60 max-w-2xl mx-auto">
            We go beyond cleaning — we create spaces that inspire and refresh.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass rounded-2xl p-7 hover:bg-white/[0.12] transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/30 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
