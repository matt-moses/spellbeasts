// Service worker: makes the game work offline. Everything in sw-assets.js is cached when a new version installs;
// the cache is named by the version, so each release replaces the last one cleanly.
importScripts('sw-assets.js');
const CACHE = `spellbeasts-${self.SW_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(self.SW_ASSETS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('spellbeasts-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;           // analytics and anything off-site go straight to the network
  if (url.pathname.endsWith('/version.json')) return;                                 // the update check must always ask the network
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) ?? (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
  })());
});
