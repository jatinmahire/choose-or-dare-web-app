// src/main.js — Application entry point
// Imports all CSS, detects mobile, wires auth observer, and boots the router.

import './styles/theme.css';
import './styles/global.css';
import './styles/animations.css';
import './styles/components.css';

import { store }              from './store.js';
import { router }             from './router.js';
import { isMobile, initLandscapeBlock } from './utils/device.js';
import { initOfflineBanner, initAudioUnlock } from './utils/feedback.js';
import { onAuthChange, resumeRedirectSignIn } from './auth.js';

// ── Desktop redirect ────────────────────────────────────────────────────────
if (!isMobile()) {
  // Show a static desktop notice — all routes are mobile-only
  const app = document.getElementById('app');
  if (app) {
    import('./pages/desktop.js')
      .then(m => m.default(router))
      .catch(() => {
        app.innerHTML = `<div style="display:grid;place-items:center;min-height:100dvh;
          color:#EEEEF4;background:#0A0A0F;font-family:system-ui;text-align:center;padding:24px">
          <div>
            <div style="font-size:48px;margin-bottom:16px">📱</div>
            <h1 style="font-size:22px;margin:0 0 8px">Mobile Only</h1>
            <p style="color:rgba(238,238,244,0.55);margin:0">
              Choose or Dare is designed for phones.<br>Open it on your mobile device.
            </p>
          </div>
        </div>`;
      });
  }
} else {
  // ── Mobile boot sequence ──────────────────────────────────────────────────

  // 1. Landscape block overlay (portrait-only app)
  initLandscapeBlock();

  // 2. Offline banner (shows when navigator.onLine === false)
  initOfflineBanner();

  // 2a. iOS AudioContext unlock — must run once before any sound
  initAudioUnlock();

  // 3. Register all page routes (lazy-loaded chunks)
  router
    .register('/', () => {
      // Auto-route: signed-in users → home dashboard, guests → setup directly
      // No button click required — eliminates all Play Now navigation issues.
      if (store.user) {
        router.navigate('/home', true);
      } else {
        router.navigate('/setup', true);
      }
      return () => {}; // no cleanup needed
    }, false)
    .register('/landing',     () => import('./pages/landing.js').then(m => m.default(router)),   false)
    .register('/home',        (p) => import('./pages/home.js').then(m => m.default(router)),      false)
    .register('/setup',       (p) => import('./pages/setup.js').then(m => m.default(router)),     false)
    .register('/game',           (p) => import('./pages/game.js').then(m => m.default(router, p)),  false)
    .register('/game/:id',       (p) => import('./pages/game.js').then(m => m.default(router, p)),  false)
    .register('/game/:id/card',  (p) => import('./pages/card.js').then(m => m.default(router, p)),  false)
    .register('/card',           (p) => import('./pages/card.js').then(m => m.default(router, p)),  false)
    .register('/result',         (p) => import('./pages/result.js').then(m => m.default(router, p)),    false)
    .register('/result/:id',     (p) => import('./pages/result.js').then(m => m.default(router, p)),    false)
    .register('/history',     (p) => import('./pages/history.js').then(m => m.default(router, p)),     false)
    .register('/stats',       (p) => import('./pages/stats.js').then(m => m.default(router, p)),       false)
    .register('/leaderboard', (p) => import('./pages/leaderboard.js').then(m => m.default(router, p)), false)
    .register('/cards',       (p) => import('./pages/cards.js').then(m => m.default(router, p)),     false)
    .register('/settings',    (p) => import('./pages/settings.js').then(m => m.default(router, p)),  false)
    .register('/desktop',     () => import('./pages/desktop.js').then(m => m.default(router)),   false)
    .register('/404',         () => import('./pages/notfound.js').then(m => m.default(router)),  false);

  // 4. Boot the router immediately via onAuthChange.
  //    Firebase's onAuthStateChanged handles redirect results internally —
  //    we do NOT need to await getRedirectResult() before starting.
  //    resumeRedirectSignIn() runs in parallel only to store our token/expiry.
  let routerStarted = false;

  function startRouter(app) {
    if (routerStarted) return;
    routerStarted = true;
    router.init(app);
    requestAnimationFrame(() => {
      const spinner = document.getElementById('init-spinner');
      if (spinner) {
        spinner.style.transition = 'opacity 0.3s';
        spinner.style.opacity = '0';
        setTimeout(() => spinner.remove(), 300);
      }
    });
  }

  const appEl = document.getElementById('app');

  // Safety net: if onAuthChange never fires within 6s, start the router anyway
  // so the user never sees an infinite spinner.
  const safetyTimer = setTimeout(() => {
    console.warn('[main] auth timeout — starting router without user');
    startRouter(appEl);
  }, 6000);

  onAuthChange((user) => {
    clearTimeout(safetyTimer);
    store.user = user ?? null;

    if (!routerStarted) {
      startRouter(appEl);
    } else {
      // Subsequent auth changes
      const path = window.location.hash.slice(1) || '/';
      if (user && ['/', '/landing'].includes(path)) {
        // Signed-in user landed on landing → send to home
        router.navigate('/home', true);
      }
      // NOTE: We do NOT redirect guests to /landing here.
      // Guests can navigate freely — no account required to play.
      // Individual pages handle their own guest/auth state.
    }
  });


  // Run in parallel — stores idToken/expiry after redirect; never blocks routing.
  resumeRedirectSignIn().catch(err =>
    console.warn('[main] resumeRedirectSignIn:', err?.code ?? err?.message)
  );


  // 5. Unregister any old service workers and clear all caches.
  //    The SW caused stale-cache issues where old JS kept being served
  //    after deploys. Cloudflare Pages CDN handles caching correctly
  //    via ETags — no SW needed.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
    // Also wipe all SW caches (cod-v1, cod-v2, cod-v3, cod-v4, etc.)
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }
}
