import Link from "next/link";
import { Instagram, Facebook, Star, Sparkles, MapPin, Phone, Mail } from "lucide-react";
import { SERVICES, BUSINESS_HOURS, CONTACT_INFO, SOCIAL_LINKS, NAV_LINKS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Top wave/gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="gradient-dark text-white/80">
        {/* Decorative */}
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 py-16 md:py-20 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-heading font-extrabold tracking-tight text-white">
                  Ultra<span className="text-primary">Tidy</span>
                </span>
              </div>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                It&apos;s not clean until it&apos;s ULTRACLEAN! Professional
                cleaning services trusted by 500+ homeowners across the GTA.
              </p>
              <div className="flex gap-2">
                {[
                  {
                    href: SOCIAL_LINKS.instagram,
                    icon: Instagram,
                    label: "Instagram",
                  },
                  {
                    href: SOCIAL_LINKS.facebook,
                    icon: Facebook,
                    label: "Facebook",
                  },
                  {
                    href: SOCIAL_LINKS.googleReview,
                    icon: Star,
                    label: "Google Reviews",
                  },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 flex items-center justify-center transition-all duration-300 hover:scale-110"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4.5 w-4.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-heading font-bold text-sm uppercase tracking-wider mb-5">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-primary transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-white font-heading font-bold text-sm uppercase tracking-wider mb-5">
                Our Services
              </h3>
              <ul className="space-y-3">
                {SERVICES.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/services#${service.id}`}
                      className="text-sm text-white/50 hover:text-primary transition-colors duration-300"
                    >
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-white font-heading font-bold text-sm uppercase tracking-wider mb-5">
                Get In Touch
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <a
                    href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
                    className="text-sm text-white/50 hover:text-primary transition-colors"
                  >
                    {CONTACT_INFO.phone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <a
                    href={`mailto:${CONTACT_INFO.email}`}
                    className="text-sm text-white/50 hover:text-primary transition-colors"
                  >
                    {CONTACT_INFO.email}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-white/50">
                    {CONTACT_INFO.address}
                  </span>
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Hours
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
                  {BUSINESS_HOURS.map((hours) => (
                    <div key={hours.day} className="contents">
                      <dt className="text-xs text-white/40 whitespace-nowrap">{hours.day}</dt>
                      <dd className="text-xs text-white/50 text-right">{hours.hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} UltraTidy Cleaning Services. All
              rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-white/30">
              <Link
                href="/privacy"
                className="hover:text-white/50 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-white/50 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
