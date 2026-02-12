import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-1/4 right-[20%] w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-[15%] w-48 h-48 bg-primary/5 rounded-full blur-[80px]" />

      <div className="text-center max-w-md relative">
        <p className="text-8xl font-heading font-extrabold text-gradient mb-2">
          404
        </p>
        <h2 className="text-2xl font-heading font-bold mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-full px-6">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href="/contact" className="flex items-center gap-2">
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
