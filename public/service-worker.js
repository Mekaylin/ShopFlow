const CACHE_NAME = 'shopflow-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon.png',
  '/manifest.json',
  '/admin-dashboard',
  '/employee-dashboard',
  '/license-scanner',
  // Add more assets as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle navigation requests for SPA routing
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request).catch(() => {
        // If fetch fails, serve the index.html for SPA routing
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }
  
  // Handle other requests normally
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
}); 