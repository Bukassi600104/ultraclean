"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type AppName = "property" | "content";
const names = { property: "Property Manager", content: "Content Manager" };
const storageKey = (app: AppName, state: string) => `bossbimbz-pwa-v1:${app}:${state}`;
function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Installation remains usable when storage is blocked. */ } }

/** Each app has its own identity and optional installation. Never cache private operations. */
export function AppInstallPrompt({ app }: { app: AppName }) {
  const [mode, setMode] = useState<"native" | "ios" | "menu" | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const deferred = useRef<InstallEvent | null>(null);
  useEffect(() => {
    let mounted = true;
    deferred.current = null; setMode(null); setError(""); setBusy(false);
    const installed = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register(`/${app}-sw.js`, { scope: `/${app}` }).catch(() => { /* Native browser menus remain available; never imply offline support. */ });
    }
    const recentDismissal = Number(read(storageKey(app, "dismissed")) || 0) > Date.now() - 7 * 24 * 60 * 60 * 1000;
    const hidden = () => installed() || !!read(storageKey(app, "installed")) || recentDismissal;
    const beforeInstall = (event: Event) => {
      if (hidden()) return;
      event.preventDefault(); deferred.current = event as InstallEvent;
      if (mounted) setMode("native");
    };
    const onInstalled = () => { save(storageKey(app, "installed"), "1"); deferred.current = null; if (mounted) setMode(null); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (!hidden() && ios) setMode("ios");
    else if (!hidden() && /Android/i.test(ua)) setMode("menu");
    return () => { mounted = false; deferred.current = null; window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, [app]);
  function dismiss() { save(storageKey(app, "dismissed"), String(Date.now())); deferred.current = null; setMode(null); }
  async function install() {
    const event = deferred.current; if (!event || busy) return;
    setBusy(true); setError("");
    try { await event.prompt(); const choice = await event.userChoice; if (choice.outcome === "accepted") save(storageKey(app, "installed"), "1"); else save(storageKey(app, "dismissed"), String(Date.now())); deferred.current = null; setMode(null); }
    catch { deferred.current = null; setError("The browser could not open installation. Use its menu to add this app to your home screen."); }
    finally { setBusy(false); }
  }
  if (!mode) return null;
  return <><div aria-hidden="true" className="h-64" /><aside aria-label={`Install ${names[app]}`} className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_48px_rgba(15,23,42,0.2)] text-slate-900">
    <button onClick={dismiss} disabled={busy} aria-label={`Dismiss ${names[app]} installation`} className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>
    <div className="flex gap-3 pr-8"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><Download className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Keep {names[app]} close</h2><p className="mt-1 text-xs text-slate-600 leading-relaxed">Add a dedicated app shortcut to your home screen. Sign in securely whenever you need it.</p></div></div>
    {mode === "ios" ? <p className="mt-4 text-sm text-slate-700 leading-relaxed"><Share2 aria-hidden="true" className="mr-1 inline h-4 w-4" />Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> and <strong>Add</strong>. If your browser does not offer it, open this app in Safari.</p> : mode === "native" ? <button onClick={() => void install()} disabled={busy || !!error} className="mt-4 min-h-11 w-full rounded-xl bg-[#0BBDB2] px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-[#0aa89f] disabled:opacity-60">{busy ? "Opening installation…" : `Install ${names[app]}`}</button> : <p className="mt-4 text-sm text-slate-700">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <p className="mt-3 text-[11px] text-slate-500">An internet connection is required for operational records.</p>
  </aside></>;
}
