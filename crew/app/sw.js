// TTC Crew (OLD app address) — retirement worker. Replaces the old app's sw.js ONLY when Joseph approves
// retiring the old app (see README.md next to this file).
// A phone that installed the old app keeps serving its saved copy until its service worker changes. This
// worker is that change: it deletes the old app's saved files, removes itself, and reloads any open window,
// which then loads the "TTC Crew has moved" page from the network. It never touches brain.json.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('ttc-crew')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((w) => { try { w.navigate(w.url); } catch (e) { /* the next open gets the new page anyway */ } });
  })());
});
