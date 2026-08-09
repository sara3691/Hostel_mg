// SmartHostel AI - Service Worker
// Cache version - increment to force cache refresh
const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `smarthostel-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg"
];

// Install: cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls or cross-origin requests
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return;
  }

  // For navigation requests (HTML pages), try network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful GET responses for static assets
        if (response.ok && request.method === "GET") {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// Listen for skip-waiting message from client
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
