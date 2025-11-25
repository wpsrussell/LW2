// sw.js – On-the-Go AppSuite Service Worker (2025 Final)
// Offline-first + instant loading + perfect PWA install

const CACHE_NAME = 'otg-appsuite-v2025.11';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Core UI assets (embedded as data URLs in HTML – cached here for safety)
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.css',
  'https://cdn.tailwindcss.com',
  // Optional: Add your logo if you want guaranteed offline access
  // (The setup tool already inlines it as data URL, but this is extra safe)
];

// Install – cache everything immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('OTG AppSuite: Caching core assets');
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn('Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('OTG AppSuite: Deleting old cache', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch – serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip browser extensions and external domains
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if found
      if (cachedResponse) {
        // Quietly update in background
        event.waitUntil(
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {}) // Ignore network errors during background update
        );
        return cachedResponse;
      }

      // Otherwise try network
      return fetch(event.request).then(networkResponse => {
        // Cache successful responses (2xx only)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Truly offline – show simple fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background sync for failed form submissions (optional future use)
self.addEventListener('sync', event => {
  if (event.tag === 'submit-form') {
    console.log('Background sync: submitting pending form');
    // Future: implement retry logic here
  }
});

// Push notifications (optional – ready for future use)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Check your safety status',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'otg-alert',
      renotify: true,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'On-the-Go Alert', options)
    );
  }
});

console.log('OTG AppSuite Service Worker loaded – offline-ready');
