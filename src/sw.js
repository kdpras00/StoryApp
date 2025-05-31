// Using Workbox for better caching strategies and offline support
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

// Define helper functions globally so they're available throughout the service worker
// Get the base path (will be '/' locally or '/subdirectory/' on Netlify if deployed to a subdirectory)
const getBasePath = () => {
  const path = self.location.pathname.replace(/\/[^\/]*$/, "/");
  console.log("Using base path:", path);
  return path;
};

const basePath = getBasePath();

// Build paths by prepending the base path
const buildPath = (path) => {
  // If path already starts with base path or is an absolute URL, return as is
  if (path.startsWith(basePath) || path.match(/^https?:\/\//)) {
    return path;
  }
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${basePath}${cleanPath}`;
};

// Check if Workbox loaded successfully
if (workbox) {
  console.log(`Workbox berhasil dimuat`);

  // Files to precache
  const filesToCache = [
    { url: "index.html", revision: "1" },
    { url: "offline.html", revision: "1" },
    { url: "manifest.json", revision: "1" },
    { url: "main.bundle.js", revision: "1" },
    { url: "sw.js", revision: "1" },
    { url: "icons/icon-144x144.png", revision: "1" },
    { url: "icons/error-icon-72x72.png", revision: "1" },
    // Remove screenshot files that might not exist
    // { url: "screenshots/desktop.png", revision: "1" },
    // { url: "screenshots/mobile.png", revision: "1" },
  ];

  // Build full paths for each file
  const precacheList = filesToCache.map((entry) => {
    return {
      url: buildPath(entry.url),
      revision: entry.revision,
    };
  });

  // Add the root URL
  precacheList.push({
    url: basePath,
    revision: "1",
  });

  // Log the precache list for debugging
  console.log("Precaching the following URLs:", precacheList);

  // Precache the files
  workbox.precaching.precacheAndRoute(precacheList);

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
      return workbox.precaching.matchPrecache(buildPath("offline.html"));
    }

    if (event.request.destination === "image") {
      return workbox.precaching.matchPrecache(
        buildPath("icons/icon-144x144.png")
      );
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
      icon: buildPath("icons/icon-144x144.png"),
      badge: buildPath("icons/error-icon-72x72.png"),
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
