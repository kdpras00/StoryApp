importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE_NAME = 'story-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/index.js',
  '/model.js',
  '/view.js',
  '/presenter.js',
  '/utils.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://kit.fontawesome.com/your-fontawesome-kit.js',
];
// Precache assets
workbox.precaching.precacheAndRoute(urlsToCache);

// Cache API responses with NetworkFirst strategy
// sw.js
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
      try {
          return await workbox.strategies.NetworkFirst({
              cacheName: 'pages-cache',
          }).handle({ event });
      } catch (error) {
          return caches.match('/offline.html');
      }
  }
);
// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js') // Use root path for built output
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(error => {
        console.log('SW registration failed: ', error);
      });
  });
}

// Cache images
workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
        cacheName: 'image-cache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            }),
        ],
    })
);

// Fallback to offline page for navigation requests
workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkFirst({
        cacheName: 'pages-cache',
        plugins: [
            new workbox.cacheableResponse.CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
        try {
            return await workbox.strategies.NetworkFirst({
                cacheName: 'pages-cache',
            }).handle({ event });
        } catch (error) {
            return caches.match('/offline.html');
        }
    }
);

// Handle Push Notifications
self.addEventListener('push', (event) => {
    let notificationData = {};
    try {
        notificationData = event.data.json();
    } catch (e) {
        notificationData = {
            title: 'Notifikasi Baru',
            body: event.data ? event.data.text() : 'Ada pembaruan baru!',
        };
    }

    const options = {
        body: notificationData.body || 'Ada pembaruan baru!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: notificationData.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(notificationData.title || 'Notifikasi Baru', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            const url = event.notification.data.url || '/';
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
      caches.keys().then((cacheNames) => {
          return Promise.all(
              cacheNames.map((cacheName) => {
                  if (cacheName !== CACHE_NAME) {
                      return caches.delete(cacheName);
                  }
              })
          );
      })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
          console.log('Caching assets:', urlsToCache);
          return cache.addAll(urlsToCache).catch((error) => {
              console.error('Cache addAll failed:', error);
          });
      })
  );
});