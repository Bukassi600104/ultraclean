"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type PromptType = "android" | "ios" | null;

export function PWAInstallPrompt() {
  const [promptType, setPromptType] = useState<PromptType>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem("pwa-installed")) return;
    // Already installed as standalone
    if (
      typeof window !== "undefined" &&
      "standalone" in window.navigator &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true
    )
      return;

    // iOS Safari detection
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

    if (isIos && isSafari) {
      setPromptType("ios");
      return;
    }

    // Android Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptType("android");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setPromptType(null);
  }

  function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice: { outcome: string }) => {
      if (choice.outcome === "accepted") {
        localStorage.setItem("pwa-installed", "1");
      }
      setPromptType(null);
      setDeferredPrompt(null);
    });
  }

  if (!promptType) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl"
      style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
    >
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1"
        style={{ color: "#94a3b8" }}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="text-2xl">📱</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">
            Install Primefield on your home screen
          </p>

          {promptType === "android" && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#11d469" }}
            >
              Install App
            </button>
          )}

          {promptType === "ios" && (
            <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
              Tap the <strong style={{ color: "white" }}>Share</strong> button in Safari, then tap{" "}
              <strong style={{ color: "white" }}>Add to Home Screen</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
