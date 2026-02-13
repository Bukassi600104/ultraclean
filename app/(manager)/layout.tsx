import { AuthProvider } from "@/contexts/AuthContext";

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
