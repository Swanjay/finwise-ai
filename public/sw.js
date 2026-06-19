// Service Worker for FinWise
// Network-first for HTML pages, cache-first for static assets

const CACHE_NAME = 'finwise-v2'

// Install - skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate - clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch - network first for HTML, cache first for static
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  // Network-first for HTML/navigation requests
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
