import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";

const GALLERY_IMAGES = [
  {
    id: "1",
    src: "/images/gallery/commercial-sink-cleaning.jpg",
    title: "Commercial Sink Cleaning",
    category: "Commercial",
  },
  {
    id: "2",
    src: "/images/gallery/kitchenette-after.jpg",
    title: "Break Room Spotless",
    category: "Commercial",
  },
  {
    id: "3",
    src: "/images/gallery/team-briefing.jpg",
    title: "Team Coordination",
    category: "Commercial",
  },
  {
    id: "4",
    src: "/images/gallery/commercial-kitchen-spotless.jpg",
    title: "Commercial Kitchen Clean",
    category: "Commercial",
  },
  {
    id: "5",
    src: "/images/gallery/bathroom-vanity-marble.jpg",
    title: "Bathroom Vanity Gleaming",
    category: "Deep Cleaning",
  },
  {
    id: "6",
    src: "/images/gallery/team-lobby-equipment.jpg",
    title: "Team Ready for Action",
    category: "Commercial",
  },
];

export function GalleryPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Our Work"
          subtitle="Real results from real clients. See the UltraTidy transformation."
          badge="Portfolio"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {GALLERY_IMAGES.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white font-heading font-bold text-sm">
                  {item.title}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {item.category}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300"
          >
            View Full Gallery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
