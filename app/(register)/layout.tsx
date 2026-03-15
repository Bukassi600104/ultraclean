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
