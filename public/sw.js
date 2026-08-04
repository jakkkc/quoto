// Minimal passthrough service worker. No caching — an invoicing app must
// always show live data, so this exists purely to satisfy installability
// requirements, not to work offline.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
