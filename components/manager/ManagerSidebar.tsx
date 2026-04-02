"use client";

import { useState } from "react";
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
  ChevronRight,
  ChevronDown,
  Fish,
  Drumstick,
  Beef,
  MoreHorizontal,
  Wrench,
  Truck,
  HeartPulse,
  Zap,
  Users,
  LogOut,
  X,
} from "lucide-react";

interface NavChild {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
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
      {
        href: "/sales",
        label: "Record Sales",
        icon: TrendingUp,
        children: [
          { href: "/sales/catfish", label: "Catfish", icon: Fish },
          { href: "/sales/goat", label: "Goat", icon: Beef },
          { href: "/sales/chicken", label: "Chicken", icon: Drumstick },
          { href: "/sales/other", label: "Other Product", icon: MoreHorizontal },
        ],
      },
      {
        href: "/expenses",
        label: "Record Expenses",
        icon: Receipt,
        children: [
          { href: "/expenses/labor", label: "Labour", icon: Users },
          { href: "/expenses/feed", label: "Feed Purchase", icon: Package },
          { href: "/expenses/utilities", label: "Utilities", icon: Zap },
          { href: "/expenses/veterinary", label: "Veterinary", icon: HeartPulse },
          { href: "/expenses/transport", label: "Transport", icon: Truck },
          { href: "/expenses/equipment", label: "Equipment", icon: Wrench },
          { href: "/expenses/from-sales", label: "From Sales Cash", icon: Wallet },
        ],
      },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/supplies", label: "Farm Supplies", icon: Package },
      { href: "/inventory", label: "Inventory", icon: BarChart3 },
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["/sales", "/expenses"]));

  // Normalize: strip /manager prefix if present
  const normPath = pathname.replace(/^\/manager/, "") || "/";

  function isActive(href: string) {
    return normPath === href || (href !== "/" && normPath.startsWith(href + "/"));
  }

  function toggleExpand(href: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
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
                const active = isActive(item.href ?? "");
                const isExpanded = expanded.has(item.href ?? "");
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <div key={item.href}>
                    {hasChildren ? (
                      <button
                        onClick={() => {
                          toggleExpand(item.href ?? "");
                        }}
                        className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-left transition-colors"
                        style={{
                          backgroundColor: active ? "rgba(17,212,105,0.15)" : "transparent",
                          color: active ? "#11d469" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                          : <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                        }
                      </button>
                    ) : (
                      <Link
                        href={item.href ?? "/"}
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
                    )}

                    {hasChildren && isExpanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        {/* Parent overview link */}
                        <Link
                          href={item.href ?? "/"}
                          onClick={onClose}
                          className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs transition-colors"
                          style={{
                            backgroundColor: normPath === item.href ? "rgba(17,212,105,0.12)" : "transparent",
                            color: normPath === item.href ? "#11d469" : "rgba(255,255,255,0.55)",
                            fontWeight: normPath === item.href ? 600 : 400,
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                          Overview
                        </Link>
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs transition-colors"
                            style={{
                              backgroundColor: normPath === child.href ? "rgba(17,212,105,0.12)" : "transparent",
                              color: normPath === child.href ? "#11d469" : "rgba(255,255,255,0.55)",
                              fontWeight: normPath === child.href ? 600 : 400,
                            }}
                          >
                            <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
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
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 h-full w-72 overflow-hidden">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
