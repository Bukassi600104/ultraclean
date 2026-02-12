import Link from "next/link";
import {
  Home,
  Building2,
  Sparkles,
  Truck,
  HardHat,
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Service } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Building2,
  Sparkles,
  Truck,
  HardHat,
};

interface ServiceCardProps {
  service: Service;
  variant?: "compact" | "full";
}

export function ServiceCard({ service, variant = "compact" }: ServiceCardProps) {
  const Icon = ICON_MAP[service.icon] || Sparkles;

  if (variant === "compact") {
    return (
      <Card className="group card-hover h-full border-0 shadow-md hover:shadow-xl bg-white overflow-hidden">
        <CardContent className="p-0">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/50 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          <div className="p-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5 group-hover:from-primary group-hover:to-primary/80 transition-all duration-500">
              <Icon className="h-7 w-7 text-primary group-hover:text-white transition-colors duration-500" />
            </div>
            <h3 className="text-xl font-heading font-bold mb-2 group-hover:text-primary transition-colors">
              {service.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {service.shortDescription}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-lg font-heading font-bold text-primary">
                From ${service.startingPrice}
              </span>
              <Link
                href={`/contact?service=${service.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/60 hover:text-primary group-hover:text-primary transition-colors"
              >
                Get a Quote
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      id={service.id}
      className="group scroll-mt-24 border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left accent */}
          <div className="hidden lg:block w-2 bg-gradient-to-b from-primary to-primary/40 group-hover:from-primary group-hover:to-primary transition-all" />

          <div className="flex-1 p-8 md:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary group-hover:to-primary/80 transition-all duration-500">
                <Icon className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-500" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold mb-3">
                  {service.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1.5 bg-primary/10 text-primary border-0 font-semibold">
                    <DollarSign className="h-3 w-3" />
                    From ${service.startingPrice}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 font-semibold"
                  >
                    <Clock className="h-3 w-3" />
                    Min {service.minDuration}
                  </Badge>
                </div>
              </div>
            </div>

            <p className="text-foreground/70 mb-8 leading-relaxed text-base">
              {service.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {service.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/70">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              asChild
              className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              <Link
                href={`/contact?service=${service.id}`}
                className="flex items-center gap-2"
              >
                Get a Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
