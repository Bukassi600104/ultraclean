import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ultratidy.ca"),
  title: {
    default: "UltraTidy Cleaning Services | Brantford & GTA",
    template: "%s | UltraTidy Cleaning Services",
  },
  description:
    "Professional cleaning services in Brantford & the GTA. Residential, commercial, deep cleaning, move-in/out, and post-construction cleaning. It's not clean until it's ULTRACLEAN!",
  keywords: [
    "cleaning services Brantford",
    "cleaning services Toronto",
    "house cleaning GTA",
    "commercial cleaning Brantford",
    "commercial cleaning Toronto",
    "deep cleaning Toronto",
    "move-in cleaning",
    "move-out cleaning",
    "post-construction cleaning",
    "residential cleaning Brantford",
    "residential cleaning Toronto",
    "office cleaning GTA",
    "Airbnb cleaning Toronto",
    "cleaning company near me",
    "best cleaning service GTA",
    "UltraTidy",
  ],
  authors: [{ name: "UltraTidy Cleaning Services" }],
  creator: "UltraTidy Cleaning Services",
  publisher: "UltraTidy Cleaning Services",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  alternates: {
    canonical: "https://ultratidy.ca",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://ultratidy.ca",
    siteName: "UltraTidy Cleaning Services",
    title: "UltraTidy Cleaning Services | Brantford & GTA",
    description:
      "Professional cleaning services in Brantford & the GTA. Residential, commercial, deep cleaning, move-in/out, and post-construction. It's not clean until it's ULTRACLEAN!",
  },
  twitter: {
    card: "summary_large_image",
    title: "UltraTidy Cleaning Services | Brantford & GTA",
    description:
      "Professional cleaning services in Brantford & the GTA. It's not clean until it's ULTRACLEAN!",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
