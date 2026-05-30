// src/pages/history.js — Game history: paginated, grouped, searchable, filterable
// api.getHistory(page) → sessions array. IntersectionObserver for infinite scroll.

import { store }          from '../store.js';
import { api }            from '../utils/api.js';
import { showToast, initPullToRefresh, addInfiniteScroll } from '../utils/feedback.js';
import { mountBottomNav } from './home.js';

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
.hy-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}
/* ── Top bar ── */
.hy-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 8px;
  position: sticky; top: 0;
  background: #0A0A0F; border-bottom: 1px solid rgba(255,255,255,.06);
  z-index: 20;
}
.hy-title {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: #e6e0ee;
}
.hy-icon-btns { display: flex; gap: 4px; }
.hy-icon-btn {
  width: 40px; height: 40px; border-radius: 12px;
  background: #1C1C2E; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #948ea1; transition: color .15s, background .15s;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.hy-icon-btn:active, .hy-icon-btn.active { background: rgba(124,77,255,.15); color: #cdbdff; }
/* ── Search bar (slide down) ── */
.hy-search-wrap {
  overflow: hidden; max-height: 0;
  transition: max-height .3s cubic-bezier(.4,0,.2,1);
  background: #0A0A0F; border-bottom: 1px solid rgba(255,255,255,.06);
}
.hy-search-wrap.open { max-height: 64px; }
.hy-search-inner {
  padding: 8px 20px 10px;
}
.hy-search-input {
  width: 100%; height: 40px; padding: 0 14px;
  background: #1C1C2E; border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px; color: #e6e0ee; font-size: 14px;
  outline: none; transition: border-color .2s;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  box-sizing: border-box;
}
.hy-search-input:focus { border-color: rgba(124,77,255,.6); }
.hy-search-input::placeholder { color: #494455; }
/* ── Filter chips ── */
.hy-filter-bar {
  display: flex; gap: 8px; padding: 10px 20px;
  overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.hy-filter-bar::-webkit-scrollbar { display: none; }
.hy-filter-chip {
  flex-shrink: 0; padding: 6px 14px; border-radius: 999px;
  background: #1C1C2E; border: 1.5px solid rgba(255,255,255,.12);
  color: #948ea1; font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .08em;
  cursor: pointer; white-space: nowrap; transition: all .15s;
  touch-action: manipulation;
}
.hy-filter-chip.active {
  background: rgba(124,77,255,.15); border-color: rgba(124,77,255,.5);
  color: #cdbdff;
}
/* ── Content area ── */
.hy-content { padding: 0 20px; }
/* ── Sticky date header ── */
.hy-date-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0 8px;
  position: sticky; top: 57px; background: #0A0A0F;
  z-index: 10;
}
.hy-date-label {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; text-transform: uppercase;
}
.hy-session-meta { font-size: 12px; color: #494455; }
.hy-expand-btn {
  background: none; border: none; cursor: pointer;
  color: #948ea1; padding: 4px; font-size: 16px;
  transition: transform .25s;
}
.hy-expand-btn.open { transform: rotate(180deg); }
/* ── Session card ── */
.hy-session-card {
  background: #1C1C2E; border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  margin-bottom: 12px; overflow: hidden;
}
.hy-session-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; cursor: pointer;
}
.hy-session-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(124,77,255,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.hy-session-info { flex: 1; }
.hy-session-date { font-size: 14px; font-weight: 700; color: #e6e0ee; }
.hy-session-rounds { font-size: 12px; color: #948ea1; margin-top: 2px; }
.hy-session-chevron {
  color: #494455; transition: transform .25s; font-size: 18px;
}
.hy-session-chevron.open { transform: rotate(180deg); }
/* ── Round items (expandable) ── */
.hy-rounds-wrap {
  max-height: 0; overflow: hidden;
  transition: max-height .35s cubic-bezier(.4,0,.2,1);
  border-top: 0px solid rgba(255,255,255,.06);
}
.hy-rounds-wrap.open {
  max-height: 2000px;
  border-top-width: 1px;
}
.hy-round-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.hy-round-item:last-child { border-bottom: none; }
.hy-round-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 12px; font-weight: 800; color: #fff;
}
.hy-round-text {
  flex: 1; font-size: 13px; color: #cac3d8; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.hy-result-badge {
  flex-shrink: 0; padding: 3px 10px; border-radius: 999px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .08em;
}
.hy-badge-done     { background: rgba(76,175,132,.15); color: #4CAF84; }
.hy-badge-chickened{ background: rgba(244,67,54,.15);  color: #F44336; }
/* ── Skeleton ── */
.hy-skeleton-card {
  background: #1C1C2E; border-radius: 16px; padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.hy-sk-bar {
  border-radius: 8px;
  background: linear-gradient(90deg,#1C1C2E 25%,#2a2840 50%,#1C1C2E 75%);
  background-size: 800px 100%; animation: shimmer 1.4s ease infinite;
}
/* ── Empty state ── */
.hy-empty {
  text-align: center; padding: 60px 24px;
}
.hy-empty-emoji { font-size: 52px; margin-bottom: 16px; }
.hy-empty-title {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; color: #cdbdff; margin-bottom: 8px;
}
.hy-empty-sub { font-size: 14px; color: #948ea1; margin-bottom: 24px; }
.hy-empty-btn {
  padding: 12px 28px; border-radius: 12px; border: none;
  background: linear-gradient(135deg,#7C4DFF,#9C27B0);
  color: #fff; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 15px; font-weight: 700; cursor: pointer;
}
/* ── Load more sentinel ── */
.hy-sentinel { height: 40px; }
.hy-load-more-spin {
  text-align: center; padding: 16px 0;
  font-size: 12px; color: #7C4DFF;
  font-family: 'Space Grotesk',system-ui,sans-serif; font-weight: 700;
  letter-spacing: .08em; display: none;
}
.hy-load-more-spin.visible { display: block; }
/* Pull-to-refresh indicator */
.hy-ptr {
  text-align: center; height: 0; overflow: hidden;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: #7C4DFF; transition: height .2s;
}
.hy-ptr.visible { height: 36px; line-height: 36px; }
`;

function injectStyles() {
  if (document.getElementById('hy-css')) return;
  const s = document.createElement('style');
  s.id = 'hy-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Player colours ─────────────────────────────────────────────────────────────
const PLAYER_COLORS = [
  '#7C4DFF','#FF4081','#00BCD4','#4CAF84',
  '#FFC107','#FF5722','#9C27B0','#00E5FF',
];
function playerColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// ── Debounce ──────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Skeleton HTML ─────────────────────────────────────────────────────────────
function skeletonHTML() {
  return [1,2,3].map(() => `
    <div class="hy-skeleton-card">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="hy-sk-bar" style="width:40px;height:40px;border-radius:12px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="hy-sk-bar" style="width:60%;height:14px;margin-bottom:8px"></div>
          <div class="hy-sk-bar" style="width:40%;height:12px"></div>
        </div>
        <div class="hy-sk-bar" style="width:20px;height:20px;border-radius:50%"></div>
      </div>
    </div>`).join('');
}

// ── Render sessions list ──────────────────────────────────────────────────────
function renderSessions(sessions, expandedIds) {
  if (!sessions.length) {
    return `
      <div class="hy-empty">
        <div class="hy-empty-emoji">🎲</div>
        <h2 class="hy-empty-title">No history yet</h2>
        <p class="hy-empty-sub">Play your first game to see it here</p>
        <button class="hy-empty-btn" id="hy-start-btn">Start a Game 🎮</button>
      </div>`;
  }

  return sessions.map(s => {
    const isOpen  = expandedIds.has(s.id);
    const rounds  = s.rounds ?? [];
    const doneCount = rounds.filter(r => r.result === 'done').length;
    const emoji   = s.categories?.includes('DIRTY') ? '🔥' :
                    s.categories?.includes('COUPLES') ? '💑' :
                    s.categories?.includes('PARTY') ? '🎉' : '🤝';

    return `
      <div class="hy-session-card" data-id="${s.id}">
        <div class="hy-session-header" data-toggle="${s.id}">
          <div class="hy-session-icon">${emoji}</div>
          <div class="hy-session-info">
            <div class="hy-session-date">${fmtDate(s.started_at)}</div>
            <div class="hy-session-rounds">
              ${s.player_count ?? rounds.length} players · ${s.total_rounds ?? rounds.length} rounds · ${doneCount} done
            </div>
          </div>
          <span class="hy-session-chevron${isOpen ? ' open' : ''}">⌄</span>
        </div>
        <div class="hy-rounds-wrap${isOpen ? ' open' : ''}">
          ${rounds.length ? rounds.map((r, i) => `
            <div class="hy-round-item">
              <div class="hy-round-avatar"
                   style="background:${playerColor(r.player_name ?? '?')}">
                ${(r.player_name ?? '?')[0].toUpperCase()}
              </div>
              <span class="hy-round-text">${r.card_text ?? '—'}</span>
              <span class="hy-result-badge ${r.result === 'done' ? 'hy-badge-done' : 'hy-badge-chickened'}">
                ${r.result === 'done' ? 'DONE' : 'SKIP'}
              </span>
            </div>`).join('') : `
            <div class="hy-round-item">
              <span class="hy-round-text" style="color:#494455">No round details available</span>
            </div>`}
        </div>
      </div>`;
  }).join('');
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderHistory(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'hy-root';

  root.innerHTML = `
    <!-- Top bar -->
    <header class="hy-topbar">
      <h1 class="hy-title">History</h1>
      <div class="hy-icon-btns">
        <button class="hy-icon-btn" id="hy-search-toggle" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Search bar -->
    <div class="hy-search-wrap" id="hy-search-wrap">
      <div class="hy-search-inner">
        <input class="hy-search-input" id="hy-search-input"
               type="search" placeholder="Search card text or player name…">
      </div>
    </div>

    <!-- Filter chips -->
    <div class="hy-filter-bar" id="hy-filter-bar">
      <button class="hy-filter-chip active" data-filter="all">All</button>
      <button class="hy-filter-chip" data-filter="TRUTH">Truths</button>
      <button class="hy-filter-chip" data-filter="DARE">Dares</button>
      <button class="hy-filter-chip" data-filter="done">Done</button>
      <button class="hy-filter-chip" data-filter="chickened">Chickened</button>
    </div>

    <!-- Pull-to-refresh indicator -->
    <div class="hy-ptr" id="hy-ptr">↓ Pull to refresh</div>

    <!-- Main content -->
    <div class="hy-content" id="hy-content">
      ${skeletonHTML()}
    </div>

    <!-- Infinite scroll sentinel -->
    <div class="hy-sentinel" id="hy-sentinel"></div>
    <div class="hy-load-more-spin" id="hy-spinner">Loading more…</div>
  `;

  app.appendChild(root);
  mountBottomNav(router, 'history');

  // ── State ─────────────────────────────────────────────────────────────────
  let allSessions  = [];
  let page         = 1;
  let hasMore      = true;
  let loading      = false;
  let searchQuery  = '';
  let activeFilter = 'all';
  const expandedIds = new Set();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const content      = root.querySelector('#hy-content');
  const spinner      = root.querySelector('#hy-spinner');
  const sentinel     = root.querySelector('#hy-sentinel');
  const searchInput  = root.querySelector('#hy-search-input');
  const searchWrap   = root.querySelector('#hy-search-wrap');
  const searchToggle = root.querySelector('#hy-search-toggle');
  const filterBar    = root.querySelector('#hy-filter-bar');
  const ptrEl        = root.querySelector('#hy-ptr');

  // ── Filter + search logic ──────────────────────────────────────────────────
  function getFiltered() {
    let list = [...allSessions];

    // Filter by chip
    if (activeFilter !== 'all') {
      list = list.map(s => ({
        ...s,
        rounds: (s.rounds ?? []).filter(r => {
          if (activeFilter === 'TRUTH')     return r.card_type === 'TRUTH';
          if (activeFilter === 'DARE')      return r.card_type === 'DARE';
          if (activeFilter === 'done')      return r.result === 'done';
          if (activeFilter === 'chickened') return r.result === 'chickened';
          return true;
        }),
      })).filter(s => s.rounds.length > 0);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.map(s => ({
        ...s,
        rounds: (s.rounds ?? []).filter(r =>
          (r.card_text ?? '').toLowerCase().includes(q) ||
          (r.player_name ?? '').toLowerCase().includes(q)
        ),
      })).filter(s => s.rounds.length > 0);
    }

    return list;
  }

  function renderList() {
    const filtered = getFiltered();
    content.innerHTML = renderSessions(filtered, expandedIds);

    // Bind start-game button in empty state
    content.querySelector('#hy-start-btn')?.addEventListener('click', () => {
      router.navigate('/setup');
    });

    // Bind expand/collapse
    content.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.toggle;
        if (expandedIds.has(id)) expandedIds.delete(id);
        else expandedIds.add(id);
        renderList();
      });
    });
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadPage(p = 1, append = false) {
    if (loading) return;
    loading = true;
    if (!append) content.innerHTML = skeletonHTML();
    else spinner.classList.add('visible');

    try {
      const data = await api.getHistory(p);
      const incoming = data?.sessions ?? [];
      hasMore = incoming.length >= (data?.page_size ?? 10);

      if (append) allSessions.push(...incoming);
      else        allSessions = incoming;

      renderList();
    } catch (err) {
      console.warn('[history] load error:', err);
      if (!append) showToast('Could not load history', 'error');
    } finally {
      loading = false;
      spinner.classList.remove('visible');
    }
  }

  // ── Search (debounced) ────────────────────────────────────────────────────
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    renderList();
  }, 300));

  // ── Search toggle ──────────────────────────────────────────────────────────
  searchToggle.addEventListener('click', () => {
    const open = searchWrap.classList.toggle('open');
    searchToggle.classList.toggle('active', open);
    if (open) setTimeout(() => searchInput.focus(), 310);
    else { searchInput.value = ''; searchQuery = ''; renderList(); }
  });

  // ── Filter chips ───────────────────────────────────────────────────────────
  filterBar.querySelectorAll('.hy-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterBar.querySelectorAll('.hy-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderList();
    });
  });

  // Infinite scroll via shared utility
  const scroll = addInfiniteScroll(sentinel, () => {
    if (hasMore && !loading) { page++; loadPage(page, true); }
  });

  // Pull-to-refresh via shared utility
  const ptr = initPullToRefresh(ptrEl, async () => {
    page = 1;
    await loadPage(1, false);
  });


  // ── Initial load ──────────────────────────────────────────────────────────
  loadPage(1);

  // Cleanup
  return () => {
    scroll.disconnect();
    ptr.destroy();
    document.getElementById('bottom-nav')?.remove();
  };
}
