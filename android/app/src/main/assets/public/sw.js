// Emergency Care service worker (no dependencies).
// Caches ONLY safe, non-personal content: the app shell, installable pages,
// and reviewed first-aid guidance bundles. NEVER caches incident records,
// triage answers, auth/session endpoints, coordination endpoints, POSTs,
// or any other private API response.

const VERSION = "ec-pwa-v1";
const SHELL = [
  "/",
  "/report",
  "/guidance",
  "/design",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/api/guidance?slug=sample-bleeding",
  "/api/guidance?slug=sample-choking",
];

const NEVER_CACHE_PREFIXES = [
  "/api/incidents",
  "/api/auth",
  "/api/dispatch",
  "/api/medpro",
  "/api/assignments",
  "/api/responders",
  "/api/health",
];

// Only public, non-personal pages may be cached. Incident pages, ops,
// and auth pages are NEVER cached (network only).
const CACHEABLE_PAGES = ["/", "/report", "/guidance", "/design", "/offline"];

function isCacheableGuidance(url) {
  return url.pathname === "/api/guidance";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // Reviewed guidance API: stale-while-revalidate, safe offline fallback.
  if (isCacheableGuidance(url)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return fresh.then((res) => res || cached);
      }),
    );
    return;
  }

  // Navigations to public pages: network first, then cache, then offline.
  // Anything else (incidents, ops, auth): network only, never stored.
  if (request.mode === "navigate") {
    if (!CACHEABLE_PAGES.includes(url.pathname)) return;
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match("/offline")) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // Static assets: cache first with network refill.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
