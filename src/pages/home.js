// src/pages/home.js — Home dashboard (Midnight Dare design system)
// Stitch design: Home Dashboard screen from project 17585024170255199436

import { store }         from '../store.js';
import { api }           from '../utils/api.js';
import { showToast }     from '../utils/feedback.js';

// ── Avatar colors (8 palette options for player avatars) ─────────────────────
export const AV_COLORS = [
  '#7C4DFF','#FF4081','#00BCD4','#4CAF84',
  '#FFC107','#FF5722','#9C27B0','#00E5FF',
];

// ── Bottom Nav (injected once, reused across all auth pages) ─────────────────
const NAV_ROUTES = [
  { id:'home',        icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,        label:'Home',     path:'/home'        },
  { id:'history',     icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.7 18.3A8.94 8.94 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`, label:'History',  path:'/history'     },
  { id:'stats',       icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>`,  label:'Stats',    path:'/stats'       },
  { id:'settings',    icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`, label:'Settings', path:'/settings'    },
];

const NAV_CSS = `
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #0F0D16;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: flex-start; justify-content: space-around;
  padding-top: 8px;
  z-index: 100;
}
.nav-tab {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  padding: 4px 0; touch-action: manipulation;
  color: #948ea1; transition: color .15s;
}
.nav-tab.active { color: #7C4DFF; }
.nav-tab svg { width: 24px; height: 24px; display: block; }
.nav-tab-label {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  opacity: 0; transition: opacity .15s;
}
.nav-tab.active .nav-tab-label { opacity: 1; }
.nav-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: #7C4DFF; margin-top: 2px;
  opacity: 0; transition: opacity .15s;
}
.nav-tab.active .nav-dot { opacity: 1; }
`;

export function mountBottomNav(router, activeId) {
  // Inject styles once
  if (!document.getElementById('bottom-nav-css')) {
    const s = document.createElement('style');
    s.id = 'bottom-nav-css'; s.textContent = NAV_CSS;
    document.head.appendChild(s);
  }
  // Remove existing nav
  document.getElementById('bottom-nav')?.remove();

  const nav = document.createElement('nav');
  nav.id = 'bottom-nav';
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Main navigation');

  NAV_ROUTES.forEach(({ id, icon, label, path }) => {
    const btn = document.createElement('button');
    btn.className = `nav-tab${id === activeId ? ' active' : ''}`;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-current', id === activeId ? 'page' : 'false');
    btn.innerHTML = `
      ${icon}
      <span class="nav-tab-label">${label}</span>
      <span class="nav-dot"></span>
    `;
    btn.addEventListener('click', () => router.navigate(path));
    nav.appendChild(btn);
  });

  document.body.appendChild(nav);
  return nav;
}

// ── Skeleton / Loading ────────────────────────────────────────────────────────
const HOME_CSS = `
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton {
  background: linear-gradient(90deg,#1C1C2E 25%,#2a2840 50%,#1C1C2E 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 8px;
}
.home-root {
  min-height: 100dvh;
  background: #0A0A0F;
  color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding: 0 20px calc(80px + env(safe-area-inset-bottom));
  padding-top: env(safe-area-inset-top, 0px);
}
/* Top bar */
.home-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0 8px;
}
.home-avatar-row { display: flex; align-items: center; gap: 10px; }
.home-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(124,77,255,.5);
}
.home-avatar-fallback {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg,#7C4DFF,#FF4081);
  display: flex; align-items: center; justify-content: center;
  font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 16px; font-weight: 800; color:#fff;
  flex-shrink: 0;
}
.home-username {
  font-size: 16px; font-weight: 700; color: #e6e0ee;
}
.home-bell-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: #1C1C2E; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #948ea1; transition: color .15s, background .15s;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.home-bell-btn:active { background: #2a2840; color: #cdbdff; }
/* Hero card */
.hero-card {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 40px rgba(124,77,255,.2);
  border-radius: 20px; padding: 24px; margin: 16px 0;
}
.hero-title {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 28px; font-weight: 800; letter-spacing:-.03em;
  color: #fff; margin-bottom: 4px;
}
.hero-subtitle { font-size: 14px; color: #948ea1; margin-bottom: 20px; }
.start-btn {
  width: 100%; height: 56px; border: none; border-radius: 16px;
  background: linear-gradient(135deg,#7C4DFF 0%,#9C27B0 100%);
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; letter-spacing:.02em;
  cursor: pointer; touch-action: manipulation;
  box-shadow: 0 4px 24px rgba(124,77,255,.45);
  transition: transform .15s, box-shadow .15s;
}
.start-btn:active { transform: scale(.97); }
/* Stats row */
.stats-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
  margin-bottom: 24px;
}
.stat-card {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius: 14px; padding: 14px 10px; text-align: center;
}
.stat-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 26px; font-weight: 800; color: #cdbdff;
  letter-spacing:-.04em; line-height:1;
  min-height: 32px; display:flex; align-items:center; justify-content:center;
}
.stat-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing:.08em;
  color: #948ea1; margin-top: 6px; text-transform: uppercase;
}
/* Recent games */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 16px; font-weight: 700; color: #e6e0ee;
}
.see-all-btn {
  background: none; border: none; cursor: pointer; padding: 4px;
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing:.06em;
  color: #7C4DFF;
}
.games-card {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius: 16px; overflow: hidden;
}
.session-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; cursor: pointer;
  transition: background .15s;
}
.session-row:not(:last-child) {
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.session-row:active { background: rgba(124,77,255,.08); }
.session-date {
  font-size: 13px; font-weight: 700; color: #cdbdff; min-width: 52px;
}
.session-meta { flex: 1; font-size: 13px; color: #948ea1; }
.session-chevron { color: #494455; }
.empty-state {
  text-align: center; padding: 40px 24px;
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius: 16px;
}
.empty-emoji { font-size: 40px; margin-bottom: 12px; }
.empty-text { font-size: 14px; color: #948ea1; line-height: 1.5; }
/* Pull-to-refresh */
.ptr-indicator {
  text-align: center; padding: 12px 0;
  font-size: 12px; color: #7C4DFF; font-family:'Space Grotesk',system-ui,sans-serif;
  font-weight: 700; letter-spacing:.08em;
  transition: opacity .3s; opacity: 0; height: 0; overflow: hidden;
}
.ptr-indicator.visible { opacity: 1; height: 40px; }
`;

function injectHomeStyles() {
  if (document.getElementById('home-css')) return;
  const s = document.createElement('style');
  s.id = 'home-css'; s.textContent = HOME_CSS;
  document.head.appendChild(s);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Render ────────────────────────────────────────────────────────────────────
export default function renderHome(router) {
  injectHomeStyles();

  const app = document.getElementById('app');
  if (!app) return;

  // Redirect if not signed in
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = '';

  const user = store.user;
  const firstName = (user.displayName || 'Player').split(' ')[0];

  // Avatar
  const avatarHTML = user.photoURL
    ? `<img class="home-avatar" src="${user.photoURL}" alt="${firstName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    + `<div class="home-avatar-fallback" style="display:none">${firstName[0].toUpperCase()}</div>`
    : `<div class="home-avatar-fallback">${firstName[0].toUpperCase()}</div>`;

  const root = document.createElement('div');
  root.className = 'home-root';
  root.innerHTML = `
    <div class="ptr-indicator" id="ptr-indicator">↓ Release to refresh</div>

    <!-- Top bar -->
    <header class="home-topbar">
      <div class="home-avatar-row">
        ${avatarHTML}
        <span class="home-username">${firstName}</span>
      </div>
      <button class="home-bell-btn" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
      </button>
    </header>

    <!-- Hero card -->
    <section class="hero-card">
      <h1 class="hero-title">Ready to Play? 🎉</h1>
      <p class="hero-subtitle">Gather your crew and start.</p>
      <button class="start-btn" id="start-game-btn">Start New Game</button>
    </section>

    <!-- Stats row -->
    <section class="stats-row" id="stats-row" aria-label="Your stats">
      <div class="stat-card">
        <div class="stat-num" id="stat-sessions"><div class="skeleton" style="width:40px;height:28px;margin:0 auto"></div></div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="stat-dares"><div class="skeleton" style="width:40px;height:28px;margin:0 auto"></div></div>
        <div class="stat-label">Dares Done</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="stat-bravery"><div class="skeleton" style="width:48px;height:28px;margin:0 auto"></div></div>
        <div class="stat-label">Bravery %</div>
      </div>
    </section>

    <!-- Recent games -->
    <section aria-label="Recent games">
      <div class="section-header">
        <span class="section-title">Recent Games 🎲</span>
        <button class="see-all-btn" id="see-all-btn">SEE ALL</button>
      </div>
      <div id="recent-games-container">
        <!-- skeleton rows -->
        <div class="games-card">
          ${[1,2,3].map(() => `
            <div class="session-row">
              <div class="skeleton" style="width:52px;height:16px"></div>
              <div class="skeleton" style="flex:1;height:14px"></div>
              <div class="skeleton" style="width:16px;height:16px"></div>
            </div>`).join('')}
        </div>
      </div>
    </section>
  `;

  app.appendChild(root);

  // Mount bottom nav
  mountBottomNav(router, 'home');

  // ── Event listeners ─────────────────────────────────────────────────────
  root.querySelector('#start-game-btn').addEventListener('click', () => {
    router.navigate('/setup');
  });
  root.querySelector('#see-all-btn').addEventListener('click', () => {
    router.navigate('/history');
  });

  // ── Load data ────────────────────────────────────────────────────────────
  let aborted = false;

  async function loadData() {
    try {
      const [statsRes, historyRes] = await Promise.allSettled([
        api.getStats(),
        api.getHistory(1),
      ]);

      if (aborted) return;

      // Stats
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      root.querySelector('#stat-sessions').textContent = stats?.total_sessions ?? '—';
      root.querySelector('#stat-dares').textContent    = stats?.total_dares    ?? '—';
      const bravery = stats?.bravery_score != null
        ? `${Math.round(stats.bravery_score)}%` : '—';
      root.querySelector('#stat-bravery').textContent  = bravery;

      // Recent games
      const history = historyRes.status === 'fulfilled' ? historyRes.value : null;
      const sessions = history?.sessions?.slice(0, 3) ?? [];
      const container = root.querySelector('#recent-games-container');

      if (!sessions.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-emoji">🎲</div>
            <p class="empty-text">No games yet.<br>Start your first one!</p>
          </div>`;
      } else {
        container.innerHTML = `<div class="games-card">${
          sessions.map(s => `
            <div class="session-row">
              <span class="session-date">${formatDate(s.started_at)}</span>
              <span class="session-meta">${s.player_count} players · ${s.total_rounds} rounds</span>
              <svg class="session-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </div>`).join('')
        }</div>`;
      }
    } catch (err) {
      if (!aborted) {
        console.warn('[home] data load error:', err);
        showToast('Could not load stats', 'error');
      }
    }
  }

  loadData();

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  let touchStartY = 0;
  let pulling = false;
  const ptrEl = root.querySelector('#ptr-indicator');

  function onTouchStart(e) {
    if (window.scrollY === 0) touchStartY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (!touchStartY) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 60) { pulling = true; ptrEl.textContent = '↑ Release to refresh'; ptrEl.classList.add('visible'); }
    else if (dy > 20) { ptrEl.textContent = '↓ Pull to refresh'; ptrEl.classList.add('visible'); }
    else { ptrEl.classList.remove('visible'); }
  }
  function onTouchEnd() {
    if (pulling) { loadData(); }
    pulling = false; touchStartY = 0;
    setTimeout(() => ptrEl.classList.remove('visible'), 400);
  }

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchmove',  onTouchMove,  { passive: true });
  root.addEventListener('touchend',   onTouchEnd,   { passive: true });

  // Cleanup
  return () => {
    aborted = true;
    document.getElementById('bottom-nav')?.remove();
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove',  onTouchMove);
    root.removeEventListener('touchend',   onTouchEnd);
  };
}
