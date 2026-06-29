// Kill-switch service worker.
// Bookshelf does NOT use a service worker. This file exists only to neutralize any
// stale service worker that a previous app on this origin/port may have registered
// (which is what causes repeated `GET /sw.js` requests). On install it takes over,
// clears all caches, unregisters itself, and reloads open tabs so they run live code.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        await self.registration.unregister()
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of clients) client.navigate(client.url)
      } catch {
        // best-effort cleanup; nothing to do on failure
      }
    })(),
  )
})
