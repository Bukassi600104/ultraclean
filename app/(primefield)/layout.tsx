import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";

export const metadata: Metadata = {
  metadataBase: new URL("https://primefieldagric.com"),
  authors: [{ name: "Primefield Agriculture" }],
  creator: "Primefield Agriculture",
  publisher: "Primefield Agriculture",
  keywords: [],
  alternates: { canonical: "https://primefieldagric.com" },
  openGraph: {
    locale: "en_NG",
    url: "https://primefieldagric.com",
    siteName: "Primefield Agriculture",
  },
  twitter: {
    card: "summary_large_image",
    title: "Primefield Agriculture",
    description: "Sustainable farming and agri-business in Ibadan, Nigeria.",
  },
  icons: {
    icon: [{ url: "/primefield-icon.png", type: "image/png" }],
    apple: [{ url: "/primefield-icon.png" }],
    shortcut: "/primefield-icon.png",
  },
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function PrimefieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className={`${manrope.variable} ${playfair.variable} font-manrope min-h-screen bg-[#F9F7F2]`}
    >
      {children}
    </main>
  );
}
