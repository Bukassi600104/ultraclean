import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://leads.ultratidycleaning.com"),
  title: {
    default: "Control Center",
    template: "%s | Control Center",
  },
  description: "Admin dashboard for UltraTidy, DBA, and Primefield.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
