// public/sw.js — Choose or Dare Service Worker
// Strategy: cache-first for static assets, network-first for /api/ calls.
// Caches successful /api/cards/random responses for offline play.

const CACHE_NAME = 'cod-v3';


// Static assets pre-cached on install
// CSS/JS chunks are handled lazily (cache-first) once fetched;
// only the shell assets are pre-cached to keep install lightweight.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/sw.js',
];

// ── Install: pre-cache static shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add static assets — ignore failures for individual items
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete stale caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategies ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (Firebase Auth, Google APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // ── /api/cards/random → cache-then-network with offline fallback ──────────
  if (url.pathname.startsWith('/api/cards/random')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // ── All other /api/ calls → network-only (no cache) ──────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // ── Static assets & navigation → cache-first ─────────────────────────────
  event.respondWith(cacheFirst(request));
});

// ── Strategy implementations ────────────────────────────────────────────────

/**
 * Cache-first: serve from cache if available, otherwise fetch + store.
 * For navigation requests, fall back to /index.html (SPA shell).
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Navigation fallback to SPA shell
    if (request.mode === 'navigate') {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first: try network, fall back to cache on failure.
 * Used for /api/cards/random so offline play still gets a card.
 */
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Store a copy under a stable key for offline fallback
      cache.put('/api/cards/random-offline', response.clone());
    }
    return response;
  } catch {
    // Offline: return cached random card if available
    const cached = await cache.match('/api/cards/random-offline');
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Offline — no cached card available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Network-only: never consult cache, never store.
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
