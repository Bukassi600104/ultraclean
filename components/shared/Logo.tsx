import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Logo({
  className = "",
  dark = true,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="flex items-baseline gap-0">
        <span
          className={`text-xl font-heading font-extrabold tracking-tight transition-colors ${
            dark ? "text-foreground" : "text-white"
          }`}
        >
          Ultra
        </span>
        <span className="text-xl font-heading font-extrabold tracking-tight text-primary">
          Tidy
        </span>
      </div>
    </Link>
  );
}
