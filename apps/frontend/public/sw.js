// SmartHostel AI - Service Worker with Web Push & Offline Support
const CACHE_VERSION = "v1.1.0";
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
        if (response.ok && request.method === "GET") {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// ── Web Push Notification Handler (Emergency & System Alerts) ──
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { title: "🚨 SmartHostel Alert", body: event.data.text() };
    }
  }

  const title = data.title || "🚨 EMERGENCY ALERT";
  const options = {
    body: data.body || "High priority hostel alert received.",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || `alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: data.vibrate || [500, 200, 500, 200, 500, 200, 500],
    data: data.data || { url: "/" },
    actions: data.actions || [
      { action: "view", title: "View Details" }
    ]
  };

  event.waitUntil(
    (async () => {
      // 1. Show native OS notification (displays even when app is closed, minimized, or phone locked)
      await self.registration.showNotification(title, options);

      // 2. Broadcast to all open client tabs (for in-app real-time banner / siren tone)
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({
          type: "EMERGENCY_PUSH_RECEIVED",
          payload: data
        });
      }
    })()
  );
});

// ── Notification Click Handler ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Focus existing open tab if available
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({
            type: "NAVIGATE_EMERGENCY",
            data: event.notification.data
          });
          return;
        }
      }

      // Open new window if app is currently closed
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Listen for skip-waiting message from client
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
