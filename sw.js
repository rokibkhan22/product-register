// Service Worker for Product Documentation & Image Register PWA
// This enables offline functionality and caching

const CACHE_NAME = 'product-register-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/product-register.png',
  '/sw.js'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('[Service Worker] Error caching assets:', error);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For GET requests, use cache-first strategy
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return response;
        }

        return fetch(request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch((error) => {
          console.warn('[Service Worker] Fetch failed:', request.url, error);
          // Return offline page or cached fallback if available
          return caches.match('/index.html');
        });
      })
    );
  } else if (request.method === 'POST') {
    // For POST requests (like syncing to Google Sheets), try network first
    event.respondWith(
      fetch(request).then((response) => {
        return response;
      }).catch((error) => {
        console.warn('[Service Worker] POST request failed:', request.url, error);
        // Return a 503 Service Unavailable response for offline POST
        return new Response(
          JSON.stringify({ error: 'Offline - Unable to sync. Your data is saved locally.' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'application/json' })
          }
        );
      })
    );
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for deferred Google Sheets sync
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-sheets') {
    event.waitUntil(
      // This would trigger the sync when the device comes back online
      // Implementation depends on your app's architecture
      Promise.resolve()
    );
  }
});
