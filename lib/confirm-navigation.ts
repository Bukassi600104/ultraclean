import type {MouseEvent} from "react";

/** Preserve entered values unless the user explicitly chooses to leave. */
export function confirmUnsavedNavigation(event: MouseEvent<HTMLElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
  const target = new URL(link.href,window.location.href);
  if (target.origin === window.location.origin && target.pathname === window.location.pathname && target.search === window.location.search) return;
  if (document.querySelector('[data-unsaved-changes="true"]') && !window.confirm("You have unsaved or unconfirmed changes. Leave this page? Saved offline submissions will remain on this device.")) {
    event.preventDefault();event.stopPropagation();
  }
}
