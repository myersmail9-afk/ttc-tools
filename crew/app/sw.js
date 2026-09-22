// TTC Crew service worker
//
// Four buckets:
//   1. content.js, crew-api.json, and services/   network-first (3 s timeout), fall back to cache.
//                          content.js is why tile edits show up on the next open without a version
//                          bump; crew-api.json + services/records.js get the same treatment so a
//                          newly-deployed backend URL (or a records.js fix) reaches a phone without
//                          waiting on a SHELL_CACHE bump.
//   2. files/ and pages/   never precached; cached on first open, then served from cache.
//                          Change a file's name (or bump FILES_CACHE) to force a re-download.
//   3. everything else     the app shell, precached on install, cache-first.
// Cross-origin requests (Google Sheets, Forms, Drive, other sites) are never touched.
//
// Bump SHELL_CACHE whenever index.html, manifest.json, the logo, or an icon changes.
// Do NOT bump it for content.js edits.

const SHELL_CACHE = 'ttc-crew-v36';
const FILES_CACHE = 'ttc-crew-files-v20';
const SHELL = [
  './',
  './index.html',
  './content.js',
  './shared/profile-button.js',
  './shared/auth-gate.js',
  './manifest.json',
  './badge.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './hero.jpg',
  './assets/photos/ttc-1658.jpg',
  './assets/photos/ttc-0137.jpg',
  './assets/photos/ttc-9165.jpg',
  './assets/photos/ttc-1589.jpg',
  './assets/photos/ttc-9156.jpg',
  './assets/photos/ttc-3099.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('ttc-crew') && k !== SHELL_CACHE && k !== FILES_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function networkFirst(req, cacheName, timeoutMs, event) {
  // The timeout may return cached content before a slow GitHub Pages response arrives. Keep the
  // service worker alive until that newer response is safely cached; otherwise the browser may
  // terminate the worker as soon as the cached response resolves and serve the stale script forever.
  const networkTask = fetch(req).then((res) => {
    if (!res || !res.ok) return res;
    return caches.open(cacheName)
      .then((c) => c.put(req, res.clone()))
      .catch(() => {})
      .then(() => res);
  });
  if (event) event.waitUntil(networkTask.then(() => {}, () => {}));

  const networkResponse = networkTask.catch(() =>
    caches.match(req).then((cached) => cached || Response.error())
  );
  const timeoutResponse = new Promise((resolve) => {
    setTimeout(() => {
      caches.match(req).then((cached) => resolve(cached || networkResponse));
    }, timeoutMs);
  });
  return Promise.race([networkResponse, timeoutResponse]);
}

function cacheFirst(req, cacheName) {
  return caches.match(req).then(
    (cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.ok) caches.open(cacheName).then((c) => c.put(req, res.clone()));
        return res;
      })
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // Google and other sites: untouched

  if (url.pathname.endsWith('/content.js') || url.pathname.endsWith('/crew-api.json') || url.pathname.includes('/services/')) {
    event.respondWith(networkFirst(req, SHELL_CACHE, 3000, event));
    return;
  }
  if (url.pathname.includes('/files/') || url.pathname.includes('/pages/')) {
    event.respondWith(cacheFirst(req, FILES_CACHE));
    return;
  }
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});
