/* Emergency Care service worker (hand-rolled, no dependencies).
 *
 * Caching policy — privacy first:
 * - Precache: app shell (/, /offline), guidance pages + guidance API
 *   (static SAMPLE content, no personal data), manifest, icons.
 * - Runtime cache-first: same-origin static assets (/_next/static/, fonts).
 * - Network-first with offline fallback: navigations -> /offline when both
 *   network and cache miss.
 * - NEVER cached: /api/* (except GET /api/guidance, see above), auth
 *   endpoints, or any response carrying a Set-Cookie header.
 */

const VERSION = "ec-v1";
const SHELL = ["/", "/offline", "/guidance", "/manifest.webmanifest"];
const GUIDANCE_SLUGS = ["sample-bleeding", "sample-choking"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      const urls = [
        ...SHELL,
        ...GUIDANCE_SLUGS.map((s) => `/api/guidance?slug=${s}`),
      ];
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // Offline at install: page-level runtime caching covers it later.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isSensitive(url) {
  const path = new URL(url).pathname;
  if (path.startsWith("/api/auth")) return true;
  if (path.startsWith("/api/") && !path.startsWith("/api/guidance")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isSensitive(request.url)) return; // never touch private traffic

  // Navigations: network first, cache second, offline page last.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          return res;
        } catch {
          const cache = await caches.open(VERSION);
          return (
            (await cache.match(request.url)) ??
            (await cache.match("/offline")) ??
            new Response("Offline", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  // Static assets + precached guidance API: cache first, then network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(request.url);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res.ok && !res.headers.has("set-cookie")) {
          // Only store safe, same-origin, cookie-free responses.
          await cache.put(request.url, res.clone());
        }
        return res;
      } catch {
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});
