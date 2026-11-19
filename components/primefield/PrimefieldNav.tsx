"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { farmQuoteLink, primefield } from "@/lib/primefield-site";

const navigation = [
  { href: "/products", text: "Products" },
  { href: "/about", text: "Our farm" },
  { href: "/contact", text: "Contact" },
];

export function PrimefieldNav() {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState("");
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setActivePath(pathname);
    setOpen(false);
  }, [pathname]);

  const active = (href: string) => activePath === href || activePath.startsWith(href + "/");

  return (
    <header className="pf-header" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="pf-shell pf-header-inner">
        <Link className="pf-logo" href="/" prefetch={false} aria-label={primefield.name + " home"} onClick={() => setOpen(false)}>
          <Image src="/primefield/logo.webp" alt="" width={360} height={196} sizes="(max-width: 720px) 108px, 128px" />
        </Link>
        <nav className="pf-desktop-nav" aria-label="Main navigation">
          {navigation.map(({ href, text }) => (
            <Link key={href} href={href} prefetch={false} aria-current={active(href) ? "page" : undefined}>{text}</Link>
          ))}
        </nav>
        <Link className="pf-button pf-header-quote" href={farmQuoteLink()} prefetch={false}>Request a quote</Link>
        <button className="pf-menu-toggle" type="button" aria-expanded={open} aria-controls="pf-mobile-navigation"
          ref={menuButton} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="pf-mobile-navigation" className="pf-shell pf-mobile-nav" aria-label="Mobile navigation" hidden={!open}>
        {[{ href: "/", text: "Home" }, ...navigation].map(({ href, text }) => (
          <Link key={href} href={href} prefetch={false} aria-current={active(href) ? "page" : undefined} onClick={() => setOpen(false)}>{text}</Link>
        ))}
        <Link className="pf-button" href={farmQuoteLink()} prefetch={false} onClick={() => setOpen(false)}>Request a quote</Link>
      </nav>
    </header>
  );
}
