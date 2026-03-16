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
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "#f8f7ff" }}
    >
      {/* Minimal header */}
      <div className="max-w-lg mx-auto mb-8 flex items-center justify-center gap-3">
        <a href="/register" className="flex items-center gap-3 group">
          <BOLogo size={36} color="#160C5A" />
          <div>
            <p
              className="font-extrabold text-sm tracking-wide leading-none"
              style={{ color: "#160C5A" }}
            >
              Bimbo Oyedotun
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Digital Income to Blueprint
            </p>
          </div>
        </a>
      </div>

      {/* Event badge */}
      <div className="max-w-lg mx-auto mb-6 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase"
          style={{ backgroundColor: "#160C5A", color: "#F5C842" }}
        >
          March 28, 2026 · 12PM EST · $20
        </div>
      </div>

      {/* Main card */}
      <div
        className="max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#160C5A" }}
      >
        {/* Card header */}
        <div
          className="px-8 py-8 text-center border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-2">
            One Session · One System · One Price
          </p>
          <div className="flex items-end justify-center gap-2 mb-1">
            <span
              className="text-7xl font-black leading-none"
              style={{ color: "#F5C842" }}
            >
              $20
            </span>
            <span className="text-white/60 text-lg mb-3">only</span>
          </div>
          <p className="text-white/50 text-sm">
            March 28th, 2026 · 12PM EST · Live Online
          </p>
        </div>

        {/* What's included */}
        <div
          className="px-8 py-6 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <p className="text-white font-bold text-sm uppercase tracking-wide mb-4">
            What&apos;s Included:
          </p>
          <ul className="space-y-3">
            {included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-white/80 text-sm"
              >
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: "#F5C842" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Registration form */}
        <div className="px-8 py-8">
          <p className="text-white font-bold text-base mb-6 text-center">
            Secure your spot below
          </p>
          <RegistrationForm />
        </div>
      </div>

      <p className="text-center text-gray-500 text-sm font-semibold mt-6">
        Spots are limited. Registration closes when the session is full.
      </p>
    </div>
  );
}
