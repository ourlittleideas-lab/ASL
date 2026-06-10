/* ASL Please? — Service Worker (network-first, no offline support) */

const CACHE_NAME = 'asl-please-v1';

/* App shell assets to pre-cache for faster first load */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/assets/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Network-first strategy — app requires internet connection */
self.addEventListener('fetch', (event) => {
  /* Skip non-GET and cross-origin requests (Supabase, CDN) */
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        /* Cache successful responses for app shell assets */
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        /* Offline fallback — serve cached version if available */
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          /* Return a simple offline notice for navigation requests */
          if (event.request.mode === 'navigate') {
            return new Response(
              `<!DOCTYPE html><html><head><title>ASL Please?</title>
              <style>body{background:#1e1e1e;color:#d4d4d4;font-family:'Courier New',monospace;
              display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
              </head><body><p>ASL Please? requires an internet connection.</p></body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
          return new Response('', { status: 503 });
        });
      })
  );
});
