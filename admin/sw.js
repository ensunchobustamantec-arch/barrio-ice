/* Barrio Ice · service worker del PANEL */
const BUILD = "__BUILD_ID__";
const VERSION = BUILD.startsWith("__") ? "dev" : BUILD;
const CACHE = `bi-admin-${VERSION}`;
const SHELL = [
  "/admin/",
  "/admin/index.html",
  "/admin/admin.css",
  "/admin/daily-pricing-editor.css",
  "/admin/daily-pricing-editor.js",
  "/features.css",
  "/themes.css",
  "/christmas.css",
  "/admin/theme-init.js",
  "/intro.js",
  "/frozen-ui.js",
  "/assets/brand/logo-dark.webp",
  "/assets/brand/logo-dark-mobile.webp",
  "/intro.css",
  "/admin/admin.js",
  "/admin/pos.js",
  "/admin/stats-core.js",
  "/admin/xlsx-export.js",
  "/admin/manifest.webmanifest",
  "/pricing.js",
  "/shared/daily-pricing.js",
  "/shared/menu-schema.js",
  "/shared/features.js",
  "/shared/whatsapp.js",
  "/themes.js",
  "/admin/new-order-notice.js",
  "/assets/brand/icon-192.png",
  "/assets/brand/icon-512.png",
  "/assets/brand/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("bi-admin-") && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return (
          (await cache.match(request)) ||
          (request.mode === "navigate"
            ? cache.match("/admin/index.html")
            : Response.error())
        );
      }
    })(),
  );
});
