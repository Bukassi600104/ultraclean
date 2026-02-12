"use client";

import { useEffect, useCallback, useState } from "react";
import { Star, Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { TESTIMONIALS } from "@/lib/constants";
import { SectionHeading } from "@/components/shared/SectionHeading";

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
    <section className="py-20 md:py-28 bg-muted/40 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-10 left-10 text-primary/5">
        <Quote className="h-48 w-48" />
      </div>
      <div className="absolute bottom-10 right-10 text-primary/5 rotate-180">
        <Quote className="h-32 w-32" />
      </div>

      <div className="container mx-auto px-4 relative">
        <SectionHeading
          title="What Our Clients Say"
          subtitle="Don't just take our word for it — hear from the people we've served."
          badge="Testimonials"
        />
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-4">
            {TESTIMONIALS.map((testimonial) => (
              <CarouselItem
                key={testimonial.id}
                className="pl-4 md:basis-1/2"
              >
                <div className="h-full bg-white rounded-2xl shadow-sm border border-border/50 p-8 flex flex-col">
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-base text-foreground/80 flex-1 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="mt-6 pt-5 border-t border-border/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.serviceType}
                      </p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-8">
            <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0" />
            <CarouselNext className="relative inset-0 translate-x-0 translate-y-0" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
