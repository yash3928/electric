const CACHE_NAME = 'electric-toolbox-pwa-v10.8.2';
const APP_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './database.js',
  './tariff.json',
  './manifest.json?v=10.8.2',
  './icons/icon-lightning.svg',
  './icons/icon-lightning-192.png',
  './icons/icon-lightning-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || caches.match('./index.html'));
        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
