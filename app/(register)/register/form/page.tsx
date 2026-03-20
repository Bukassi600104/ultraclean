import type { Metadata } from "next";
import { BOLogo } from "@/components/register/BOLogo";
import { RegistrationForm } from "@/components/register/RegistrationForm";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Register — Digital Income Systems to Capital Blueprint",
  description:
    "Secure your spot for the live mentorship session with Bimbo Oyedotun. March 28, 2026 · 12PM EST · $20.",
};

const included = [
  "3+ hours of live mentorship with Bimbo Oyedotun",
  "Digital income strategies for immediate implementation",
  "The complete reinvestment framework (50/30/20 split)",
  "Your personal 90-day funding action plan",
  "1-hour AI skills training with Tony Orjiako",
  "Live Q&A — get your specific questions answered",
];

export default function RegisterFormPage() {
  return (
    <div
      className="py-8 px-4 min-h-screen"
      style={{ backgroundColor: "#f8f7ff" }}
    >
      {/* Back nav */}
      <div className="max-w-5xl mx-auto mb-6">
        <a
          href="/register"
          className="text-sm font-medium hover:underline"
          style={{ color: "#160C5A" }}
        >
          ← Back
        </a>
      </div>

      {/* 2-column layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT COLUMN — form */}
        <div className="bg-white rounded-2xl shadow p-8 space-y-6">
          {/* Small header */}
          <div className="flex items-center gap-3">
            <BOLogo size={32} color="#160C5A" />
            <div>
              <p className="font-extrabold text-sm leading-none" style={{ color: "#160C5A" }}>
                Bimbo Oyedotun
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Digital Income to Blueprint</p>
            </div>
          </div>

          {/* Event badge */}
          <div>
            <span
              className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
              style={{ backgroundColor: "#160C5A", color: "#F5C842" }}
            >
              March 28, 2026 · 12PM EST
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#160C5A" }}>
              Secure Your Spot
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Fill in your details below — you&apos;ll be redirected to payment immediately.
            </p>
          </div>

          <RegistrationForm />
        </div>

        {/* RIGHT COLUMN — pricing / info */}
        <div
          className="rounded-2xl p-8 text-white space-y-6"
          style={{ backgroundColor: "#160C5A" }}
        >
          {/* Price */}
          <div>
            <div className="flex items-end gap-2">
              <span
                className="text-7xl font-black leading-none"
                style={{ color: "#F5C842" }}
              >
                $20
              </span>
              <span className="text-white/60 text-lg mb-3">only</span>
            </div>
            <p className="text-white/60 uppercase tracking-widest text-xs mt-2">
              One Session · One System · One Price
            </p>
            <p className="text-white/50 text-sm mt-1">
              March 28th, 2026 · 12PM EST · Live Online
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* What's included */}
          <div>
            <p className="text-white font-bold uppercase tracking-wide text-sm mb-4">
              What&apos;s Included:
            </p>
            <ul className="space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/80 text-sm">
                  <CheckCircle2
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: "#F5C842" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom note */}
          <p className="text-white/60 text-sm pt-2">
            Spots are limited.
          </p>
        </div>

      </div>
    </div>
  );
}
