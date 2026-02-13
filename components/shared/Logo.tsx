import Link from "next/link";
import Image from "next/image";

export function Logo({
  className = "",
  dark = true,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <Image
        src="/logo-icon.png"
        alt="UltraTidy"
        width={44}
        height={44}
        className="h-11 w-11"
        priority
      />
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
