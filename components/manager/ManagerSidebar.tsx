"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {MessageBimbo} from '@/components/MessageBimbo';
import {
  Home, TrendingUp, Receipt, Clock, Wallet,
  LogOut, Layers, Droplets, PlusSquare, Skull, Package, ClipboardList, MessageSquare,
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
      { href: "/today", label: "Today", icon: ClipboardList },
    ],
  },
  {
    title: "Record",
    items: [
      { href: "/daily-report", label: "Daily Report", icon: ClipboardList },
      { href: "/operational-requests", label: "Operational Requests", icon: MessageSquare },
      { href: "/purchases", label: "Purchases & deliveries", icon: Receipt },
      { href: "/sales", label: "Sales", icon: TrendingUp },
      { href: "/credit", label: "Customers & payments", icon: Wallet },
      { href: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/performance", label: "Batch performance", icon: TrendingUp },
      { href: "/stores", label: "Physical counts & eggs", icon: Package },
      { href: "/daily-feed", label: "Daily Feed", icon: Droplets },
      { href: "/feed-stock", label: "Feed Inventory", icon: Package },
      { href: "/inventory", label: "Farm Inventory", icon: Layers },
      { href: "/health", label: "Health tasks", icon: ClipboardList },
      { href: "/supplies", label: "Farm Supplies", icon: Package },
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
  const pathname = usePathname(), { profile, signOut } = useAuth();
  const prefix = /^\/manager(?:\/|$)/.test(pathname) ? "/manager" : "";
  const path = pathname.slice(prefix.length) || "/";
  return <div className="flex h-full flex-col bg-[#edf2eb] text-[#263d2c]">
    <div className="border-b border-[#cfdbcd] px-5 py-4">
      <p className="text-base font-bold tracking-tight">Primefield Farm</p>
    </div>
    <nav aria-label="Farm menu" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
      {NAV_SECTIONS.map(section=><div key={section.title}>
        <p className="mb-1 px-3 text-xs font-semibold text-[#536754]">{section.title}</p>
        {section.items.map(item=>{
          const active=path===item.href||(item.href!=="/"&&path.startsWith(item.href+"/"));
          const href=item.href==="/"?prefix||"/":prefix+item.href;
          return <Link key={item.href} href={href} onClick={onClose}
            aria-current={active?"page":undefined}
            className={"flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors "+(active?"bg-[#d8e9dc] font-bold text-[#224f35]":"font-medium text-[#344b39] hover:bg-[#e2ebe0]")}>
            <item.icon aria-hidden="true" className="h-4 w-4 shrink-0"/>{item.label}
          </Link>;
        })}
      </div>)}
      <div className="border-t border-[#cfdbcd] px-2.5 pt-2 text-[#24583f]"><MessageBimbo/></div>
    </nav>
    <div className="flex items-center justify-between gap-2 border-t border-[#cfdbcd] px-4 py-2">
      <div className="min-w-0"><p className="break-words text-sm font-bold">{profile?.name||"Farm manager"}</p>{profile?.name&&<p className="text-xs text-[#526754]">Farm manager</p>}</div>
      <button aria-label="Sign Out" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm hover:bg-[#dae5d8]" onClick={()=>signOut()}><LogOut aria-hidden="true" className="h-4 w-4"/>Sign out</button>
    </div>
  </div>;
}

export function ManagerSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const opener = useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(!isOpen)return;
    const desktop=window.matchMedia('(min-width: 1024px)');
    const closeDesktop=()=>{if(desktop.matches)onClose();};
    closeDesktop();
    desktop.addEventListener('change',closeDesktop);
    return ()=>desktop.removeEventListener('change',closeDesktop);
  },[isOpen,onClose]);
  return <>
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-hidden border-r border-[#cfdbcd] lg:flex">
      <SidebarContent/>
    </aside>
    <Sheet open={isOpen} onOpenChange={open=>{if(!open)onClose();}}>
      <SheetContent side="left" aria-describedby={undefined} className="w-72 max-w-[90vw] border-[#cfdbcd] bg-[#edf2eb] p-0 [&>button]:right-2 [&>button]:top-2 [&>button]:h-11 [&>button]:w-11 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center"
        onOpenAutoFocus={()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;}}
        onCloseAutoFocus={event=>{if(opener.current?.isConnected){event.preventDefault();opener.current.focus();}}}>
        <SheetTitle className="sr-only">Farm navigation</SheetTitle><SidebarContent onClose={onClose}/>
      </SheetContent>
    </Sheet>
  </>;
}
