import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
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
