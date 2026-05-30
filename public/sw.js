// public/sw.js — Choose or Dare Service Worker
// Strategy:
//   Navigation (HTML) → network-first (always get fresh app shell)
//   Hashed JS/CSS assets → cache-first (hash in URL = safe forever)
//   /api/ calls → network-only (no cache, always fresh)
//   /api/cards/random → network-first with offline fallback

// Bump this whenever you need to force all clients to drop old caches.
const CACHE_NAME = 'cod-v4';

// ── Install: skip waiting immediately so new SW takes over right away ────────
self.addEventListener('install', (event) => {
  // skipWaiting() makes this SW activate without waiting for old tabs to close
  event.waitUntil(self.skipWaiting());
});

// ── Activate: delete ALL old caches, claim all clients immediately ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategies ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // /api/cards/random → network-first with offline fallback
  if (url.pathname.startsWith('/api/cards/random')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // All other /api/ → network-only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Navigation requests (HTML) → NETWORK-FIRST
  // This ensures new deploys are always picked up — no stale app shell.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
    return;
  }

  // Hashed static assets (JS/CSS chunks) → cache-first
  // Safe because Vite embeds a content hash in every asset filename.
  // If the file changes, its URL changes too — so cached copies are always valid.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // Other static files (icons, manifest) → network-first
  event.respondWith(networkFirstNav(request));
});

// ── Strategy implementations ────────────────────────────────────────────────

/**
 * Network-first for HTML navigation.
 * Falls back to cached index.html if fully offline.
 */
async function networkFirstNav(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback: serve cached shell
    const shell = await cache.match('/index.html') || await cache.match('/');
    if (shell) return shell;
    return new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Cache-first for hashed /assets/ files.
 * These never change for a given URL, so caching indefinitely is safe.
 */
async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

/**
 * Network-first with offline cache for /api/cards/random.
 */
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put('/api/cards/random-offline', response.clone());
    }
    return response;
  } catch {
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
