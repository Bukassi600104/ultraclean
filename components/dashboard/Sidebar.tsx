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
  FileText,
  ShoppingBag,
  Tractor,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Menu,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/blog", label: "Blog", icon: FileText },
  { href: "/dashboard/dba", label: "DBA Products", icon: ShoppingBag },
  { href: "/dashboard/farm", label: "Farm", icon: Tractor },
];

function NavContent({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { profile, signOut } = useAuth();

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? "A";

  const displayName = profile?.name || profile?.email || "Admin";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors outline-none",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                {profile?.name && profile?.email && (
                  <p className="truncate text-xs text-gray-500">
                    {profile.email}
                  </p>
                )}
              </div>
              <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-48 p-1 bg-gray-800 border-white/10"
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

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-white/10 bg-gray-900 transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo-icon.png"
                alt="UltraTidy"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span className="font-heading text-lg font-bold text-white">
                Ultra<span className="text-primary">Tidy</span>
              </span>
            </Link>
          ) : (
            <Link href="/dashboard" className="mx-auto">
              <Image
                src="/logo-icon.png"
                alt="UltraTidy"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="absolute left-16 top-4 -ml-3 h-6 w-6 rounded-full border border-white/10 bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 z-10"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
        <NavContent collapsed={collapsed} pathname={pathname} />
        <div className="mt-auto border-t border-white/10 p-3">
          <UserMenu collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute left-4 top-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-gray-900 p-0 border-none">
          <div className="flex h-16 items-center border-b border-white/10 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo-icon.png"
                alt="UltraTidy"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span className="font-heading text-lg font-bold text-white">
                Ultra<span className="text-primary">Tidy</span>
              </span>
            </Link>
          </div>
          <NavContent collapsed={false} pathname={pathname} />
          <div className="mt-auto border-t border-white/10 p-3 absolute bottom-0 left-0 right-0">
            <UserMenu collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
