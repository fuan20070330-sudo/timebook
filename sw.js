const CACHE = 'timebook-v5';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=20261019-5',
  './js/data.js?v=20261019-5',
  './js/app.js?v=20261019-5',
  './manifest.webmanifest',
  './assets/icon.svg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(hit => {
    if (hit) return hit;
    return caches.match('./index.html');
  })));
});
