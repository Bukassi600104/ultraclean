"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  ShoppingBag,
  Tractor,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  ChevronUp,
} from "lucide-react";

// ── Navigation structure ────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/dashboard/leads", label: "Leads", icon: Users },
      {
        href: "/dashboard/appointments",
        label: "Appointments",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/dashboard/blog", label: "Blog", icon: FileText }],
  },
  {
    label: "Businesses",
    items: [
      { href: "/dashboard/dba", label: "DBA Products", icon: ShoppingBag },
      { href: "/dashboard/courses", label: "Courses", icon: GraduationCap },
      { href: "/dashboard/farm", label: "Farm", icon: Tractor },
    ],
  },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center min-w-0",
        collapsed ? "justify-center" : "gap-2.5"
      )}
    >
      {collapsed ? (
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          <Image
            src="/bossbiz-logo.png"
            alt="BossBimbz"
            width={32}
            height={32}
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <Image
          src="/bossbiz-logo.png"
          alt="BossBimbz HQ"
          width={48}
          height={48}
          className="object-contain rounded-lg shrink-0"
          priority
        />
      )}
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-heading text-sm font-extrabold text-white tracking-wide leading-none">
            BossBimbz
          </p>
          <p className="text-[9px] text-white/50 font-bold tracking-[0.18em] uppercase mt-0.5">
            HQ
          </p>
        </div>
      )}
    </Link>
  );
}

function NavContent({
  collapsed,
  pathname,
  onClose,
}: {
  collapsed: boolean;
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="mb-1">
          {!collapsed ? (
            <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 select-none">
              {section.label}
            </p>
          ) : (
            <div className="my-2 mx-3 border-t border-white/8" />
          )}
          <div className="px-3 space-y-0.5">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/50 hover:bg-white/8 hover:text-white/80"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { profile, signOut } = useAuth();

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? "B";

  const displayName = profile?.name || profile?.email || "Admin";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors outline-none hover:bg-white/8",
            collapsed && "justify-center px-2"
          )}
        >
          <Avatar className="h-7 w-7 shrink-0 ring-2 ring-white/20">
            <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-sm font-medium text-white leading-tight">
                  {displayName}
                </p>
                {profile?.name && profile?.email && (
                  <p className="truncate text-xs text-white/40">
                    {profile.email}
                  </p>
                )}
              </div>
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white/30" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-48 p-1 bg-[#231D82] border-white/10"
      >
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ── Main Sidebar export ─────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-white/5 bg-[#1B1464] transition-all duration-200 relative shrink-0",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-white/8 px-4 shrink-0">
          <BrandLogo collapsed={collapsed} />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 text-white/30 hover:text-white/80 hover:bg-white/8 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <NavContent collapsed={collapsed} pathname={pathname} />

        {/* Expand button (collapsed state) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[68px] h-6 w-6 rounded-full border border-white/25 bg-[#1B1464] text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center z-20 transition-colors shadow-sm"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* User menu */}
        <div className="border-t border-white/8 p-3 shrink-0">
          <UserMenu collapsed={collapsed} />
        </div>
      </aside>

      {/* ── Mobile sidebar ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute left-3 top-3.5 z-50 text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white shadow-sm rounded-lg h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-60 bg-[#1B1464] p-0 border-r border-white/8"
        >
          <div className="flex h-16 items-center border-b border-white/8 px-4">
            <BrandLogo collapsed={false} />
          </div>
          <div className="flex flex-col h-[calc(100%-4rem)]">
            <NavContent
              collapsed={false}
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
            />
            <div className="border-t border-white/8 p-3 shrink-0">
              <UserMenu collapsed={false} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
