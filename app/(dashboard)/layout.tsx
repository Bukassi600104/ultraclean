import { AuthProvider } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div data-hq className="flex h-screen overflow-hidden bg-[#F6F5FF]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
