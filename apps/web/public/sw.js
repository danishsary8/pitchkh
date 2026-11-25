/* PitchKH service worker: installable PWA + offline fallback.
   Strategy: pages are network-first (live availability matters) and fall back
   to the offline page; static assets are cache-first. */
const VERSION = "pitchkh-v3-photos";
const OFFLINE_URLS = ["/en/offline", "/km/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(VERSION);
        const offline = url.pathname.startsWith("/km") ? "/km/offline" : "/en/offline";
        return (await cache.match(offline)) || Response.error();
      }),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_next/image");
  if (isStatic) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
