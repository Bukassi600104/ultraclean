"use client";

import { useEffect, useCallback, useState } from "react";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { TESTIMONIALS } from "@/lib/constants";

export function TestimonialsCarousel() {
  const [api, setApi] = useState<CarouselApi>();

  const autoplay = useCallback(() => {
    if (!api) return;
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);
    api.on("pointerDown", () => clearInterval(interval));
    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    return autoplay();
  }, [autoplay]);

  return (
    <section className="py-20 md:py-28 bg-[#0a2a28] relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight text-white">
            What Our Clients Say
          </h2>
          <p className="mt-3 text-white/60 max-w-xl mx-auto">
            Don&apos;t just take our word for it — hear from the people we&apos;ve served.
          </p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-4">
            {TESTIMONIALS.map((testimonial) => (
              <CarouselItem
                key={testimonial.id}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <div className="h-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col relative overflow-hidden">
                  {/* Decorative quote mark */}
                  <div className="absolute -top-2 -left-1 text-white/8 select-none pointer-events-none">
                    <span className="text-[80px] font-serif leading-none">&ldquo;</span>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-5 relative">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-sm text-white/80 flex-1 leading-relaxed relative">
                    &ldquo;{testimonial.text}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm text-white">
                        {testimonial.name}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {testimonial.serviceType}
                      </span>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-8">
            <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
            <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
