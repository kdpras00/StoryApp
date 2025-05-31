// Using Workbox for better caching strategies and offline support
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;

// Cache name
const CACHE_NAME = "story-app-v1";

// Precache essential static assets
workbox.precaching.precacheAndRoute([
  { url: "/", revision: "1" },
  { url: "/index.html", revision: "1" },
  { url: "/offline.html", revision: "1" },
  { url: "/manifest.json", revision: "1" },
  { url: "/src/style.css", revision: "1" },
  { url: "/src/app.js", revision: "1" },
  { url: "/src/model.js", revision: "1" },
  { url: "/src/view.js", revision: "1" },
  { url: "/src/presenter.js", revision: "1" },
  { url: "/src/utils.js", revision: "1" },
  // Icons
  { url: "/icons/icon-72x72.png", revision: "1" },
  { url: "/icons/icon-96x96.png", revision: "1" },
  { url: "/icons/icon-128x128.png", revision: "1" },
  { url: "/icons/icon-144x144.png", revision: "1" },
  { url: "/icons/icon-152x152.png", revision: "1" },
  { url: "/icons/icon-192x192.png", revision: "1" },
  { url: "/icons/icon-384x384.png", revision: "1" },
  { url: "/icons/icon-512x512.png", revision: "1" },
]);

// Cache Google Fonts stylesheets with a stale-while-revalidate strategy
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
  })
);

// Cache Google Fonts webfont files with a cache-first strategy for 1 year
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  })
);

// Cache images with a cache-first strategy
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache the Leaflet library files (map tiles)
registerRoute(
  ({ url }) =>
    url.origin === "https://tile.openstreetmap.org" ||
    url.origin === "https://a.tile.openstreetmap.org" ||
    url.origin === "https://b.tile.openstreetmap.org" ||
    url.origin === "https://c.tile.openstreetmap.org" ||
    url.origin === "https://server.arcgisonline.com" ||
    url.href.includes("basemaps.cartocdn.com") ||
    url.href.includes("tile.opentopomap.org"),
  new CacheFirst({
    cacheName: "map-tiles",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
      }),
    ],
  })
);

// Cache JavaScript and CSS files with a stale-while-revalidate strategy
registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: "static-resources",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-responses",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 10 * 60, // 10 minutes
      }),
    ],
  })
);

// Default handler for navigations - network first with offline fallback
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "navigations",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);

// Fallback to offline page when network fails for navigation requests
workbox.navigationPreload.enable();

const networkWithOfflineFallback = async (params) => {
  try {
    // Try to fetch from network
    return await workbox.strategies.networkFirst().handle(params);
  } catch (error) {
    // Fallback to cached offline page if network fails
    return caches.match("/offline.html");
  }
};

// Register the fallback strategy for navigation requests
registerRoute(
  ({ request }) => request.mode === "navigate",
  networkWithOfflineFallback
);

// Push notification handler
self.addEventListener("push", (event) => {
  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: "Notifikasi Baru",
      body: event.data ? event.data.text() : "Ada pembaruan baru!",
    };
  }

  const options = {
    body: notificationData.body || "Ada pembaruan baru!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || "/",
    },
    actions: [
      {
        action: "open",
        title: "Lihat Detail",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || "Notifikasi Baru",
      options
    )
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        const url = event.notification.data.url || "/";

        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Skip waiting and clients claim to ensure the service worker activates quickly
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
