import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BfcacheHandler } from "@/components/shared/BfcacheHandler";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BfcacheHandler />
      <Header />
      <main className="min-h-screen pt-16 md:pt-20">{children}</main>
      <Footer />
    </>
  );
}
