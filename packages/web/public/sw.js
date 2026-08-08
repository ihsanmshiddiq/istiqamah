// Istiqamah service worker — app-shell caching for offline-first.
// Feature data lives in IndexedDB (handled by the app); this SW only makes the
// shell, assets and fonts available offline.
const CACHE = "istiqamah-shell-v2";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Handle push notifications for prayer reminders
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "istiqamah-notification",
      requireInteraction: data.requireInteraction || false,
      data: data.url || "/app",
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Istiqamah", options)
    );
  } catch {
    // Silent fail
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/app";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (url !== "/") client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache API / auth calls — the app degrades gracefully to IndexedDB.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell (offline SPA).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match("/")
            .then((r) => r || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })),
        ),
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isFont =
    url.origin.includes("fonts.googleapis.com") ||
    url.origin.includes("fonts.gstatic.com");

  // Static assets + fonts: stale-while-revalidate.
  if (sameOrigin || isFont) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
