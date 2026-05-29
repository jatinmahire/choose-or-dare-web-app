// main.js — Application entry point
import './styles/theme.css';
import './styles/global.css';
import './styles/animations.css';
import './styles/components.css';

import { store }              from './store.js';
import { router }             from './router.js';
import { initLandscapeBlock } from './utils/device.js';
import { initOfflineBanner }  from './utils/feedback.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────
initLandscapeBlock();
initOfflineBanner();

// ── Register Routes ────────────────────────────────────────────────────────
// Pages are lazy-imported so each chunk only loads when navigated to.
router
  .register('/',              () => import('./pages/landing.js').then(m => m.default(router)),    false)
  .register('/landing',       () => import('./pages/landing.js').then(m => m.default(router)),    false)
  .register('/home',          () => import('./pages/home.js').then(m => m.default(router)),       true)
  .register('/setup',         () => import('./pages/setup.js').then(m => m.default(router)),      true)
  .register('/game',          () => import('./pages/game.js').then(m => m.default(router)),       true)
  .register('/game/:id',      (p) => import('./pages/game.js').then(m => m.default(router, p)),   true)
  .register('/card',          () => import('./pages/card.js').then(m => m.default(router)),       true)
  .register('/result',        () => import('./pages/result.js').then(m => m.default(router)),     true)
  .register('/history',       () => import('./pages/history.js').then(m => m.default(router)),    true)
  .register('/stats',         () => import('./pages/stats.js').then(m => m.default(router)),      true)
  .register('/leaderboard',   () => import('./pages/leaderboard.js').then(m => m.default(router)),true)
  .register('/cards',         () => import('./pages/cards.js').then(m => m.default(router)),      true)
  .register('/settings',      () => import('./pages/settings.js').then(m => m.default(router)),   true)
  .register('/desktop',       () => import('./pages/desktop.js').then(m => m.default(router)),    false)
  .register('/404',           () => import('./pages/notfound.js').then(m => m.default(router)),   false);

// ── Start Router ───────────────────────────────────────────────────────────
router.init(document.getElementById('app'));
