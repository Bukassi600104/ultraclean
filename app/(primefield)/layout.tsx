import { Manrope, Playfair_Display } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function PrimefieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className={`${manrope.variable} ${playfair.variable} font-manrope min-h-screen bg-[#F9F7F2]`}
    >
      {children}
    </main>
  );
}
