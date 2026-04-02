"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  TrendingUp,
  Receipt,
  Package,
  BarChart3,
  Clock,
  Wallet,
  LogOut,
  X,
} from "lucide-react";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "",
    items: [{ href: "/", label: "Overview", icon: Home }],
  },
  {
    label: "Record",
    items: [
      { href: "/sales", label: "Record Sales", icon: TrendingUp },
      { href: "/expenses", label: "Record Expenses", icon: Receipt },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/supplies", label: "Farm Supplies", icon: Package },
      { href: "/inventory", label: "Inventory", icon: BarChart3 },
    ],
  },
  {
    label: "View",
    items: [
      { href: "/records", label: "Past Records", icon: Clock },
      { href: "/cash", label: "Cash Summary", icon: Wallet },
    ],
  },
];

// ─── Sidebar content (shared between desktop + mobile drawer) ─────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  function isActive(href: string) {
    const normalised = pathname.replace(/^\/manager/, "") || "/";
    if (href === "/") return normalised === "/" || normalised === "";
    return normalised === href || normalised.startsWith(href + "/");
  }

  const initial = (profile?.name || "M")[0].toUpperCase();

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#1b4332" }}>

      {/* Brand row */}
      <div
        className="flex items-center justify-between px-5 pt-8 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ backgroundColor: "rgba(17,212,105,0.18)" }}
          >
            🌿
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide leading-tight">Primefield</p>
            <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>
              Farm Portal
            </p>
          </div>
        </div>
        {/* Close — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden rounded-xl p-1.5 transition-colors active:scale-90"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Manager info */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: "#11d469", color: "#012d1d" }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white leading-tight truncate">
              {profile?.name ?? "Farm Manager"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
              Farm Manager
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-2" : ""}>
            {section.label && (
              <p
                className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {section.label}
              </p>
            )}
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5 transition-all active:scale-[0.97]"
                  style={
                    active
                      ? {
                          backgroundColor: "rgba(17,212,105,0.14)",
                          color: "#11d469",
                        }
                      : { color: "rgba(255,255,255,0.52)" }
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span
                    className="text-sm flex-1"
                    style={{ fontWeight: active ? 700 : 500 }}
                  >
                    {label}
                  </span>
                  {active && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "#11d469" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.97]"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function ManagerSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop: permanent sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 h-screen sticky top-0 flex-col overflow-y-auto">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: "rgba(1,45,29,0.55)" }}
            onClick={onClose}
          />
          <aside className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto lg:hidden">
            <SidebarContent onClose={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
