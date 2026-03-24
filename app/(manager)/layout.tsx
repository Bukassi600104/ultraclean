import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://farm.primefieldagric.com"),
  title: {
    default: "Primefield Farm Portal",
    template: "%s | Primefield Farm Portal",
  },
  description: "Farm operations portal for Primefield Agriculture, Ibadan, Nigeria.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon-primefield.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/favicon-primefield.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/favicon-primefield.png",
  },
};

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
