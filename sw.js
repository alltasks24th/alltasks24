/* AllTasks24 Service Worker */
const CACHE_NAME = 'alltasks24:v2025-08-27-1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  "/",
  "/alltasks24-main/Calculation system.html",
  "/alltasks24-main/admin-calendar.css",
  "/alltasks24-main/admin-calendar.js",
  "/alltasks24-main/admin.html",
  "/alltasks24-main/admin.js",
  "/alltasks24-main/assets/styles.css",
  "/alltasks24-main/auth.js",
  "/alltasks24-main/firebase-init.js",
  "/alltasks24-main/index.html",
  "/alltasks24-main/login.html",
  "/alltasks24-main/promotions.html",
  "/alltasks24-main/public.js",
  "/alltasks24-main/reviews.html",
  "/alltasks24-main/seo-boost.js",
  "/alltasks24-main/services.html",
  "/alltasks24-main/services.js",
  "/alltasks24-main/shop.html",
  "/alltasks24-main/utils.js",
  "/index.html",
  "/offline.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

// Strategy helpers
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch(err) {
    return cached || Response.error();
  }
}

async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch(err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
      return cache.match(OFFLINE_URL);
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== location.origin) return;

  // HTML pages -> network first + offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(req));
    return;
  }

  // Static assets -> cache first
  if (['.css','.js','.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.woff','.woff2','.ttf'].some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(cacheFirst(req));
    return;
  }
});
