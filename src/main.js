// src/main.js — Application entry point
// Simplified: no mobile gate, no complex auth blocking, direct boot to /setup.

import './styles/theme.css';
import './styles/global.css';
import './styles/animations.css';
import './styles/components.css';

import { store }              from './store.js';
import { router }             from './router.js';
import { initLandscapeBlock } from './utils/device.js';
import { initOfflineBanner, initAudioUnlock } from './utils/feedback.js';
import { onAuthChange, resumeRedirectSignIn } from './auth.js';

// ── Step 1: Nuke any old service workers immediately ────────────────────────
// SW was caching stale JS and blocking all fixes from loading.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()));
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

// ── Step 2: UI helpers (landscape overlay, offline banner, audio unlock) ────
initLandscapeBlock();
initOfflineBanner();
initAudioUnlock();

// ── Step 3: Register all page routes ────────────────────────────────────────
// ALL routes use auth: false — no page gate. Auth is checked inside pages.
router
  // Root: guests → /setup immediately. Signed-in → /home.
  // No landing page in the main flow — bypasses all Play Now click issues.
  .register('/', () => {
    if (store.user) {
      router.navigate('/home', true);
    } else {
      router.navigate('/setup', true);
    }
    return () => {};
  }, false)

  .register('/landing',     () => import('./pages/landing.js').then(m => m.default(router)),   false)
  .register('/home',        () => import('./pages/home.js').then(m => m.default(router)),      false)
  .register('/setup',       () => import('./pages/setup.js').then(m => m.default(router)),     false)
  .register('/game',        (p) => import('./pages/game.js').then(m => m.default(router, p)),  false)
  .register('/game/:id',    (p) => import('./pages/game.js').then(m => m.default(router, p)),  false)
  .register('/game/:id/card', (p) => import('./pages/card.js').then(m => m.default(router, p)), false)
  .register('/card',        (p) => import('./pages/card.js').then(m => m.default(router, p)),  false)
  .register('/result',      (p) => import('./pages/result.js').then(m => m.default(router, p)),  false)
  .register('/result/:id',  (p) => import('./pages/result.js').then(m => m.default(router, p)),  false)
  .register('/history',     (p) => import('./pages/history.js').then(m => m.default(router, p)), false)
  .register('/stats',       (p) => import('./pages/stats.js').then(m => m.default(router, p)),   false)
  .register('/leaderboard', (p) => import('./pages/leaderboard.js').then(m => m.default(router, p)), false)
  .register('/cards',       (p) => import('./pages/cards.js').then(m => m.default(router, p)),   false)
  .register('/settings',    (p) => import('./pages/settings.js').then(m => m.default(router, p)), false)
  .register('/desktop',     () => import('./pages/desktop.js').then(m => m.default(router)),   false)
  .register('/404',         () => import('./pages/notfound.js').then(m => m.default(router)),  false);

// ── Step 4: Boot the router ──────────────────────────────────────────────────
const appEl = document.getElementById('app');
let routerStarted = false;

function startRouter() {
  if (routerStarted) return;
  routerStarted = true;
  router.init(appEl);

  // Fade out the loading spinner
  requestAnimationFrame(() => {
    const spinner = document.getElementById('init-spinner');
    if (spinner) {
      spinner.style.transition = 'opacity 0.3s';
      spinner.style.opacity = '0';
      setTimeout(() => spinner.remove(), 300);
    }
  });
}

// Safety net: if Firebase auth never resolves (e.g. blocked network),
// start the router anyway after 4 seconds so the user isn't stuck on spinner.
const safetyTimer = setTimeout(() => {
  console.warn('[main] Firebase auth timeout — booting router without user');
  startRouter();
}, 4000);

// ── Step 5: Auth observer ────────────────────────────────────────────────────
onAuthChange((user) => {
  clearTimeout(safetyTimer);
  store.user = user ?? null;

  if (!routerStarted) {
    // First auth resolution — boot the router now
    startRouter();
  } else {
    // Subsequent auth changes (e.g. user signs in/out mid-session)
    const path = window.location.hash.slice(1) || '/';
    if (user && ['/', '/landing'].includes(path)) {
      // Signed-in user on landing page → send to home
      router.navigate('/home', true);
    }
    // Guests navigate freely — no forced redirect to /landing
  }
});

// Resume Google sign-in redirect if one was in progress (runs in parallel)
resumeRedirectSignIn().catch(err =>
  console.warn('[main] resumeRedirectSignIn:', err?.code ?? err?.message)
);
