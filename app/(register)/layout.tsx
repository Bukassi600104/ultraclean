import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://bboconcepts.com"),
  authors: [{ name: "Bimbo Oyedotun" }],
  creator: "BBO Concepts",
  publisher: "BBO Concepts",
  keywords: [],
  alternates: { canonical: "https://bboconcepts.com" },
  openGraph: {
    locale: "en_US",
    url: "https://bboconcepts.com",
    siteName: "BBO Concepts",
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
