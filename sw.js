/* Barrio Ice · service worker de la TIENDA (el panel tiene el suyo en /admin/sw.js) */
const BUILD = "__BUILD_ID__";
const VERSION = BUILD.startsWith("__") ? "dev" : BUILD;
const CACHE_SHELL = `bi-shell-${VERSION}`;
const CACHE_IMG = `bi-img-${VERSION}`;
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/layout.css",
  "/catalog.css",
  "/site.css",
  "/motion-effects.css",
  "/features.css",
  "/drop-day.css",
  "/granizado-builder.css",
  "/client-sound.css",
  "/promo-2x1.css",
  "/themes.css",
  "/christmas.css",
  "/theme-init.js",
  "/intro.js",
  "/frozen-ui.js",
  "/assets/brand/logo-dark.webp",
  "/assets/brand/logo-dark-mobile.webp",
  "/intro.css",
  "/pricing.js",
  "/shared/menu-schema.js",
  "/shared/features.js",
  "/shared/whatsapp.js",
  "/age-gate.js",
  "/client-sound.js",
  "/themes.js",
  "/christmas.js",
  "/drop-day.js",
  "/granizado-builder.js",
  "/store-firebase.js",
  "/hero-scene.js",
  "/storefront.js",
  "/motion.js",
  "/checkout.js",
  "/cart-motion.js",
  "/assets/brand/icon-192.png",
  "/assets/brand/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) =>
        Promise.all(
          SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CACHE_SHELL, CACHE_IMG]);
      for (const key of await caches.keys()) {
        if (
          (key.startsWith("bi-shell-") || key.startsWith("bi-img-")) &&
          !keep.has(key)
        ) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, cacheName, timeout = 4000) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, {
      signal: controller.signal,
      cache: "no-cache",
    });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, CACHE_SHELL).then((response) =>
        response.type === "error" ? caches.match("/index.html") : response,
      ),
    );
    return;
  }

  if (
    ["script", "style", "manifest"].includes(request.destination) ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(networkFirst(request, CACHE_SHELL));
    return;
  }

  if (["image", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_IMG));
  }
});
