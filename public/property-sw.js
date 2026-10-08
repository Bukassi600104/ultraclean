// Registered only with /property scope. Authenticated operations remain network-only.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => event.respondWith(fetch(event.request, { cache: "no-store" })));
