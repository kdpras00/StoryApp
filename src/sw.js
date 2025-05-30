// Basic service worker with minimal caching strategy
const CACHE_NAME = "story-app-v3";

// Simple install event handler
self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clear old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Clearing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients so the SW is in control immediately
  event.waitUntil(clients.claim());
});

// Fetch event - simple cache strategy with network fallback
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Handle navigation requests with network-first strategy
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline.html");
      })
    );
    return;
  }

  // For assets, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // For images and fonts, use cache-first strategy
      if (
        event.request.destination === "image" ||
        event.request.destination === "font"
      ) {
        return fetch(event.request).then((response) => {
          // Cache the fetched response
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      }

      // For other resources, just fetch from network
      return fetch(event.request);
    })
  );
});

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
    icon: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || "/",
    },
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

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data.url || "/";
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
