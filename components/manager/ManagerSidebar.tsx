"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, TrendingUp, Receipt, Clock, Wallet,
  LogOut, X, Layers, Droplets, PlusSquare, Skull,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Overview", icon: Home },
    ],
  },
  {
    title: "Record",
    items: [
      { href: "/sales", label: "Sales", icon: TrendingUp },
      { href: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/inventory", label: "Inventory", icon: Layers },
      { href: "/daily-feed", label: "Daily Feed", icon: Droplets },
      { href: "/stock", label: "Add Stock", icon: PlusSquare },
      { href: "/mortality", label: "Mortality", icon: Skull },
    ],
  },
  {
    title: "View",
    items: [
      { href: "/records", label: "Past Records", icon: Clock },
      { href: "/cash", label: "Cash Summary", icon: Wallet },
    ],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  // Normalize: strip /manager prefix if present
  const normPath = pathname.replace(/^\/manager/, "") || "/";

  function isActive(href: string) {
    if (href === "/") return normPath === "/";
    return normPath === href || normPath.startsWith(href + "/");
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0d2418" }}>
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div>
          <p className="font-bold text-white text-sm tracking-wide">Primefield</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Farm Manager</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <X className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Manager info */}
      <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "#11d469", color: "#012d1d" }}>
            {(profile?.name ?? "M").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.name ?? "Manager"}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>Farm Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-1.5"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 transition-colors"
                    style={{
                      backgroundColor: active ? "rgba(17,212,105,0.15)" : "transparent",
                      color: active ? "#11d469" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function ManagerSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-hidden">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
