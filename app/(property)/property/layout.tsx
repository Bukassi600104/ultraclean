import type { Metadata, Viewport } from "next";
import { AppInstallPrompt } from "@/components/pwa/AppInstallPrompt";
export const metadata: Metadata = {
  title: { absolute: "BossBimbz Property Manager" }, description: "Secure property, tenancy and rent operations for BossBimbz.",
  applicationName: "Property Manager", manifest: "/property-manifest.json",
  appleWebApp: { capable: true, title: "Properties", statusBarStyle: "default" },
  icons: { icon: "/property-icon-192.png", apple: "/property-icon-192.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0BBDB2" };
export default function PropertyAppLayout({ children }: { children: React.ReactNode }) { return <>{children}<AppInstallPrompt app="property" /></>; }
