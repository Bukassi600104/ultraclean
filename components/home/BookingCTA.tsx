import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight } from "lucide-react";

export function BookingCTA() {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/10 p-10 md:p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight">
            Want to Discuss Your Cleaning Needs?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Book a free consultation call — pick a time that works for you, and
            we&apos;ll discuss exactly what you need.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 rounded-full text-base px-8 h-14 font-semibold shadow-lg hover:scale-105 transition-all duration-300"
          >
            <Link href="/book" className="flex items-center gap-2">
              Book a Consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
