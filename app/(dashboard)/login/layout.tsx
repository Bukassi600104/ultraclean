import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { absolute: "UltraTidy | Sign in to your dashboard" },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
