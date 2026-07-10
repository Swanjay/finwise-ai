// Service Worker for FinWise — v5
// Network-first for EVERYTHING. No cache-first static assets.
// This prevents stale JS bundles causing hydration failures.

const CACHE_NAME = 'finwise-v4'

// Install — clear ALL old caches, then take over
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.skipWaiting())
  )
})

// Activate — claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

// Fetch — ALWAYS go to network first, only use cache as offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  // Network-first for ALL requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
