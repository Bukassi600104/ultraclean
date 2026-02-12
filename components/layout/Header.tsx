"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/Logo";
import { NAV_LINKS, CONTACT_INFO } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = pathname === "/";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-black/[0.03] py-2"
          : isHome
            ? "bg-transparent py-4"
            : "bg-white/90 backdrop-blur-xl py-2"
      }`}
    >
      {/* Top bar - visible only when not scrolled on home */}
      {isHome && !scrolled && (
        <div className="hidden lg:block border-b border-white/10 pb-2 mb-2">
          <div className="container mx-auto px-4 flex justify-end items-center gap-6 text-xs text-white/70">
            <a
              href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="h-3 w-3" />
              {CONTACT_INFO.phone}
            </a>
            <span>Mon-Sat: 8AM - 6PM</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Logo dark={scrolled || !isHome} />

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  pathname === link.href
                    ? scrolled || !isHome
                      ? "text-primary bg-primary/5"
                      : "text-white bg-white/15"
                    : scrolled || !isHome
                      ? "text-foreground/70 hover:text-primary hover:bg-primary/5"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
            >
              <Link href="/contact">Get Free Quote</Link>
            </Button>
          </div>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className={
                  scrolled || !isHome ? "" : "text-white hover:bg-white/10"
                }
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] pt-12">
              <div className="flex flex-col h-full">
                <nav className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={`px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                          pathname === link.href
                            ? "text-primary bg-primary/5"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto pb-8 space-y-4">
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="w-full rounded-full"
                      size="lg"
                    >
                      <Link href="/contact" onClick={() => setOpen(false)}>
                        Get Free Quote
                      </Link>
                    </Button>
                  </SheetClose>
                  <a
                    href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    {CONTACT_INFO.phone}
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
