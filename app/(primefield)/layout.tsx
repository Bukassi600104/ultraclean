export default function PrimefieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white">
      {children}
    </main>
  );
}
