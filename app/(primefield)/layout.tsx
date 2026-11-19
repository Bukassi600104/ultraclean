import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { PrimefieldNav } from "@/components/primefield/PrimefieldNav";
import { PrimefieldFooter } from "@/components/primefield/PrimefieldElements";
import { PRIMEFIELD_ORIGIN } from "@/lib/primefield-routing";
import { primefield } from "@/lib/primefield-site";
import "./primefield.css";
import "./primefield-interior.css";
import "./primefield-experience.css";

export const metadata: Metadata = {
  metadataBase: new URL(PRIMEFIELD_ORIGIN),
  title: primefield.name,
  authors: [{ name: primefield.name }],
  creator: primefield.name,
  publisher: primefield.name,
  keywords: [],
  manifest: null,
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: { url: "/primefield/icon-48.png", type: "image/png", sizes: "48x48" },
    apple: { url: "/primefield/touch-180.png", sizes: "180x180" },
  },
};

const manrope = Manrope({ subsets: ["latin"], variable: "--font-primefield-body", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-primefield-display", display: "swap" });

export default function PrimefieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`primefield-site ${manrope.variable} ${instrument.variable}`}>
      <a className="pf-skip" href="#main-content">Skip to content</a>
      <PrimefieldNav />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <PrimefieldFooter />
    </div>
  );
}
