// Using Workbox for better caching strategies and offline support
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

// Check if Workbox loaded successfully
if (workbox) {
  console.log(`Workbox berhasil dimuat`);
  workbox.precaching.precacheAndRoute([
    { url: "/", revision: "1" },
    { url: "/index.html", revision: "1" },
    { url: "/offline.html", revision: "1" },
    { url: "/manifest.json", revision: "1" },
    // Remove source files that don't exist in production build
    // { url: "/src/style.css", revision: "1" },
    // { url: "/src/app.js", revision: "1" },
    // { url: "/src/model.js", revision: "1" },
    // { url: "/src/view.js", revision: "1" },
    // { url: "/src/presenter.js", revision: "1" },
    // { url: "/src/sw.js", revision: "1" },
    // Instead, cache the bundled JS files
    { url: "/main.bundle.js", revision: "1" },
    { url: "/sw.js", revision: "1" },
    // Only include icons that actually exist
    { url: "/icons/icon-144x144.png", revision: "1" },
    { url: "/icons/icon-192x192.png", revision: "1" },
    { url: "/icons/error-icon-72x72.png", revision: "1" },
    // Add screenshots for the app manifest
    { url: "/screenshots/dekstop.png", revision: "1" },
    { url: "/screenshots/mobile.png", revision: "1" },
    // Removed non-existent icons
    // { url: "/icons/icon-72x72.png", revision: "1" },
    // { url: "/icons/icon-96x96.png", revision: "1" },
    // { url: "/icons/icon-128x128.png", revision: "1" },
    // { url: "/icons/icon-152x152.png", revision: "1" },
    // { url: "/icons/icon-192x192.png", revision: "1" },
    // { url: "/icons/icon-384x384.png", revision: "1" },
    // { url: "/icons/icon-512x512.png", revision: "1" },
  ]);

  // Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.googleapis\.com/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
    })
  );

  // Cache the underlying font files with a cache-first strategy for 1 year.
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.gstatic\.com/,
    new workbox.strategies.CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          maxEntries: 30,
        }),
      ],
    })
  );

  // Cache CSS and JavaScript Files
  workbox.routing.registerRoute(
    /\.(?:js|css)$/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "static-resources",
    })
  );

  // Cache Images
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
    new workbox.strategies.CacheFirst({
      cacheName: "images",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // API Caching Strategy
  workbox.routing.registerRoute(
    new RegExp("https://story-api.dicoding.dev/v1/.*"),
    new workbox.strategies.NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // API Caching Strategy
  workbox.routing.registerRoute(
    new RegExp("https://story-api.dicoding.dev/v1/.*"),
    new workbox.strategies.NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          // Include 401 responses to handle them properly in the app
          statuses: [0, 200, 401],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Special handling for API authentication errors
  workbox.routing.registerRoute(
    new RegExp("https://story-api.dicoding.dev/v1/stories"),
    async ({ url, request, event, params }) => {
      try {
        // Try network first
        const response = await fetch(request);

        // If we get a 401 Unauthorized, we should clear the token
        if (response.status === 401) {
          // We can't directly access localStorage from SW, but we can post a message
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "AUTH_ERROR",
                message: "Authentication failed. Please login again.",
              });
            });
          });

          // Return the 401 response so the app can handle it
          return response;
        }

        // For successful responses, cache and return
        const cache = await caches.open("api-cache");
        cache.put(request, response.clone());
        return response;
      } catch (error) {
        // If offline, try to get from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If no cache, return offline JSON response
        return new Response(
          JSON.stringify({
            error: true,
            message: "You are offline. Please check your connection.",
            listStory: [],
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
    "GET"
  );

  // Offline Fallback
  workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkFirst({
      cacheName: "default-cache",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Offline fallback for pages
  workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.destination === "document") {
      return workbox.precaching.matchPrecache("/offline.html");
    }

    if (event.request.destination === "image") {
      return workbox.precaching.matchPrecache("/icons/icon-144x144.png");
    }

    return Response.error();
  });
} else {
  console.log(`Workbox gagal dimuat`);
}

// Handle Push Notifications
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "Story App Notification",
    options: {
      body: "Ada konten cerita baru!",
      icon: "/icons/icon-144x144.png",
      badge: "/icons/error-icon-72x72.png",
      data: {
        url: self.location.origin,
      },
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        options: {
          ...notificationData.options,
          body: payload.message || notificationData.options.body,
        },
      };
    } catch (error) {
      console.error("Error parsing notification payload:", error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData.options
    )
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : self.location.origin;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If so, focus on it
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Skip waiting and clients claim to ensure the service worker activates quickly
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
