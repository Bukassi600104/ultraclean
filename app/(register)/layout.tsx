import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://bboconcepts.com"),
  title: {
    default: "BBO Concepts | Digital Boss Academy",
    template: "%s | BBO Concepts",
  },
  description: "Live mentorship by Bimbo Oyedotun — Digital Income Systems to Capital Blueprint.",
  authors: [{ name: "Bimbo Oyedotun" }],
  creator: "BBO Concepts",
  publisher: "BBO Concepts",
  keywords: [],
  alternates: { canonical: "https://bboconcepts.com" },
  openGraph: {
    locale: "en_US",
    url: "https://bboconcepts.com",
    siteName: "BBO Concepts",
    title: "BBO Concepts | Digital Boss Academy",
    description: "Live mentorship by Bimbo Oyedotun — Digital Income Systems to Capital Blueprint.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Income Systems to Capital Blueprint — Bimbo Oyedotun",
    description:
      "Live mentorship by Bimbo Oyedotun — March 28, 2026 | 12PM EST | $20",
  },
  icons: {
    icon: [{ url: "/empty.png", type: "image/png" }],
    apple: [],
    shortcut: "/empty.png",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#160C5A]/5 via-white to-[#160C5A]/10">
      {children}
    </main>
  );
}
