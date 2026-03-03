"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export function PrimefieldNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#2D6A4F]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/primefield-logo.jpg"
              alt="Primefield Agri-Business Limited"
              width={160}
              height={56}
              className="object-contain"
              priority
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-8">
            <a
              className="text-[#1B4332] hover:text-[#11d469] transition-colors text-sm font-semibold"
              href="#"
            >
              Home
            </a>
            <a
              className="text-[#1B4332]/70 hover:text-[#11d469] transition-colors text-sm font-medium"
              href="#about"
            >
              About
            </a>
            <a
              className="text-[#1B4332]/70 hover:text-[#11d469] transition-colors text-sm font-medium"
              href="#products"
            >
              Products
            </a>
            <a
              className="text-[#1B4332]/70 hover:text-[#11d469] transition-colors text-sm font-medium"
              href="#contact"
            >
              Contact
            </a>
          </nav>

          {/* Desktop CTA + Mobile toggle */}
          <div className="flex items-center gap-4">
            <a
              href="#contact"
              className="hidden md:flex bg-[#1B4332] hover:bg-[#2D6A4F] transition-colors text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-[#1B4332]/20"
            >
              Order Now
            </a>
            <button
              className="md:hidden text-[#1B4332]"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-[#2D6A4F]/10 px-4 py-4 space-y-3">
          {["#", "#about", "#products", "#contact"].map((href, i) => (
            <a
              key={href}
              href={href}
              className="block text-[#1B4332] font-medium py-2 hover:text-[#40916C] transition-colors"
              onClick={() => setOpen(false)}
            >
              {["Home", "About", "Products", "Contact"][i]}
            </a>
          ))}
          <a
            href="#contact"
            className="block w-full text-center bg-[#1B4332] text-white py-3 rounded-full text-sm font-bold mt-2"
            onClick={() => setOpen(false)}
          >
            Order Now
          </a>
        </div>
      )}
    </header>
  );
}
