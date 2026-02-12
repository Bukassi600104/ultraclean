"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Handles browser back/forward cache (bfcache) restoration.
 * Forces a re-render on bfcache restore to fix distorted/stuck animations.
 * Also scrolls to top on client-side navigation for snappy transitions.
 */
export function BfcacheHandler() {
  const pathname = usePathname();

  // Scroll to top on route change for instant navigation feel
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Handle bfcache restore — restart CSS animations
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Force re-paint to restart CSS animations
        document.documentElement.style.display = "none";
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        document.documentElement.offsetHeight; // trigger reflow
        document.documentElement.style.display = "";
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
