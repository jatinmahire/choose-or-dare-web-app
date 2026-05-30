// src/main.js — Application entry point
// Imports all CSS, detects mobile, wires auth observer, and boots the router.

import './styles/theme.css';
import './styles/global.css';
import './styles/animations.css';
import './styles/components.css';

import { store }              from './store.js';
import { router }             from './router.js';
import { isMobile, initLandscapeBlock } from './utils/device.js';
import { initOfflineBanner }  from './utils/feedback.js';
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

  // 3. Register all page routes (lazy-loaded chunks)
  router
    .register('/',            () => import('./pages/landing.js').then(m => m.default(router)),   false)
    .register('/landing',     () => import('./pages/landing.js').then(m => m.default(router)),   false)
    .register('/home',        (p) => import('./pages/home.js').then(m => m.default(router)),      true)
    .register('/setup',       (p) => import('./pages/setup.js').then(m => m.default(router)),     true)
    .register('/game',           (p) => import('./pages/game.js').then(m => m.default(router, p)),  true)
    .register('/game/:id',       (p) => import('./pages/game.js').then(m => m.default(router, p)),  true)
    .register('/game/:id/card',  (p) => import('./pages/card.js').then(m => m.default(router, p)),  true)
    .register('/card',           (p) => import('./pages/card.js').then(m => m.default(router, p)),  true)
    .register('/result',         (p) => import('./pages/result.js').then(m => m.default(router, p)),    true)
    .register('/result/:id',     (p) => import('./pages/result.js').then(m => m.default(router, p)),    true)
    .register('/history',     (p) => import('./pages/history.js').then(m => m.default(router, p)),     true)
    .register('/stats',       (p) => import('./pages/stats.js').then(m => m.default(router, p)),       true)
    .register('/leaderboard', (p) => import('./pages/leaderboard.js').then(m => m.default(router, p)), true)
    .register('/cards',       (p) => import('./pages/cards.js').then(m => m.default(router, p)),     true)
    .register('/settings',    (p) => import('./pages/settings.js').then(m => m.default(router, p)),  true)
    .register('/desktop',     () => import('./pages/desktop.js').then(m => m.default(router)),   false)
    .register('/404',         () => import('./pages/notfound.js').then(m => m.default(router)),  false);

  // 4. Handle redirect sign-in return (mobile), then watch Firebase auth state.
  //    resumeRedirectSignIn() must run before onAuthChange starts routing,
  //    so the user is set before the first route renders.
  let routerStarted = false;

  // Try to recover a pending redirect sign-in first (runs fast if no redirect pending)
  resumeRedirectSignIn().catch(() => {}).finally(() => {
    onAuthChange((user) => {
      store.user = user ?? null;

      if (!routerStarted) {
        routerStarted = true;

        const app = document.getElementById('app');
        router.init(app);

        // Remove the boot spinner once the first page begins rendering
        requestAnimationFrame(() => {
          const spinner = document.getElementById('init-spinner');
          if (spinner) {
            spinner.style.transition = 'opacity 0.3s';
            spinner.style.opacity = '0';
            setTimeout(() => spinner.remove(), 300);
          }
        });
      } else {
        // Subsequent auth changes (logout / re-login): re-render current path
        const path = window.location.hash.slice(1) || '/';
        if (!user && !['/', '/landing'].includes(path)) {
          router.navigate('/landing', true);
        }
      }
    });
  });

  // 5. Register service worker for PWA / offline caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.debug('[sw] registered:', reg.scope))
        .catch(err => console.warn('[sw] registration failed:', err));
    });
  }
}
