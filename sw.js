// Simple service worker that prioritizes network to avoid stale module issues in preview
const CACHE_NAME = 'pm-coach-ai-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Always try network first for modules and scripts to ensure latest code in preview
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'script' || 
      event.request.url.endsWith('.tsx') || 
      event.request.url.endsWith('.ts')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});