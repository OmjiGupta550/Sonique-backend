// Beatwave Custom Service Worker for Offline / PWA capabilities
const CACHE_NAME = 'beatwave-v2'; // Incremented to purge old cache v1 and trigger clean reload
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'beatwave-audio-cache') {
            console.log('Purging old service worker cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude Supabase auth endpoints and POST requests
  if (event.request.method !== 'GET' || url.href.includes('supabase.co')) {
    return;
  }

  const isNextAsset = url.pathname.startsWith('/_next/');
  const isNavigation = event.request.mode === 'navigate';

  // Network-First for HTML navigation and Next.js JS/CSS bundles to ensure instant live updates when online
  if (isNavigation || isNextAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (isNavigation) {
              return caches.match('/');
            }
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
    return;
  }

  // Cache-First for other assets (fonts, static files, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cache static assets and fonts
        if (
          response.status === 200 &&
          (url.pathname.includes('/fonts/') ||
            url.hostname.includes('fonts.gstatic.com') ||
            url.hostname.includes('fonts.googleapis.com'))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
