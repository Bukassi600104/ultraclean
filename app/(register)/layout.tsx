import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/bbo-icon.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/bbo-icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/bbo-icon.png",
    other: [{ rel: "shortcut icon", url: "/bbo-icon.png" }],
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
