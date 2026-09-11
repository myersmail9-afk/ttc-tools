// TTC Crew service worker
//
// Three buckets:
//   1. content.js          network-first (3 s timeout), fall back to cache.
//                          This is why tile edits show up on the next open without a version bump.
//   2. files/ and pages/   never precached; cached on first open, then served from cache.
//                          Change a file's name (or bump FILES_CACHE) to force a re-download.
//   3. everything else     the app shell, precached on install, cache-first.
// Cross-origin requests (Google Sheets, Forms, Drive, other sites) are never touched.
//
// Bump SHELL_CACHE whenever index.html, manifest.json, the logo, or an icon changes.
// Do NOT bump it for content.js edits.

const SHELL_CACHE = 'ttc-crew-v7';
const FILES_CACHE = 'ttc-crew-files-v1';
const SHELL = [
  './',
  './index.html',
  './content.js',
  './manifest.json',
  './badge.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './hero.jpg',
  './assets/photos/ttc-1658.jpg',
  './assets/photos/ttc-0137.jpg'
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

function networkFirst(req, cacheName, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      caches.match(req).then((c) => resolve(c || fetch(req)));
    }, timeoutMs);
    fetch(req)
      .then((res) => {
        if (res && res.ok) caches.open(cacheName).then((c) => c.put(req, res.clone()));
        if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
      })
      .catch(() => {
        if (!settled) { settled = true; clearTimeout(timer); caches.match(req).then((c) => resolve(c || Response.error())); }
      });
  });
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

  if (url.pathname.endsWith('/content.js')) {
    event.respondWith(networkFirst(req, SHELL_CACHE, 3000));
    return;
  }
  if (url.pathname.includes('/files/') || url.pathname.includes('/pages/')) {
    event.respondWith(cacheFirst(req, FILES_CACHE));
    return;
  }
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});
