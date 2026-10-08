import type { Metadata, Viewport } from "next";
import { AppInstallPrompt } from "@/components/pwa/AppInstallPrompt";
export const metadata: Metadata = {
  title: { absolute: "BossBimbz Content Manager" }, description: "Secure content, audience and sales operations for BossBimbz.",
  applicationName: "Content Manager", manifest: "/content-manifest.json",
  appleWebApp: { capable: true, title: "Content", statusBarStyle: "default" },
  icons: { icon: "/content-icon-192.png", apple: "/content-icon-192.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0BBDB2" };
export default function ContentAppLayout({ children }: { children: React.ReactNode }) { return <>{children}<AppInstallPrompt app="content" /></>; }
