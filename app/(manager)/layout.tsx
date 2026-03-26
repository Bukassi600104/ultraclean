import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://farm.primefieldagric.com"),
  title: {
    default: "Primefield Farm Portal",
    template: "%s | Primefield Farm Portal",
  },
  description: "Farm operations portal for Primefield Agriculture, Ibadan, Nigeria.",
  robots: { index: false, follow: false },
  manifest: "/farm-manifest.json",
  icons: {
    icon: [{ url: "/pf-emblem-icon.png", type: "image/png" }],
    apple: [{ url: "/pf-emblem-icon.png" }],
    shortcut: "/pf-emblem-icon.png",
  },
};

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className={`${manrope.variable}`} style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
        {children}
      </div>
    </AuthProvider>
  );
}
