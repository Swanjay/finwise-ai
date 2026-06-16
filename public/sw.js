// Basic Service Worker for FinWise
// Provides offline caching for static assets

const CACHE_NAME = 'finwise-v1'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/expenses',
  '/recurring',
  '/reports',
  '/score',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip API calls (let them fail gracefully)
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503 })
        })
    })
  )
})
