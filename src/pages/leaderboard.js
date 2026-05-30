// src/pages/leaderboard.js — Global leaderboard: tabs, podium, ranked list, sticky my-rank bar
// Data: api.getLeaderboard(period) → { entries: [{uid,display_name,bravery_score,total_dares,...}] }

import { store }          from '../store.js';
import { api }            from '../utils/api.js';
import { showToast }      from '../utils/feedback.js';
import { mountBottomNav } from './home.js';

// ── Player colours (consistent hash → colour) ─────────────────────────────────
const PLAYER_COLORS = [
  '#7C4DFF','#FF4081','#00BCD4','#4CAF84',
  '#FFC107','#FF5722','#9C27B0','#00E5FF',
];
function nameColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes lb-slide {
  from { transform: translateX(32px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.lb-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
  overflow-x: hidden; position: relative;
}
/* ── Top bar ── */
.lb-topbar {
  padding: 14px 20px 0;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: #e6e0ee;
}
/* ── Tabs ── */
.lb-tabs {
  display: flex; gap: 0; padding: 12px 20px 0;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.lb-tab {
  flex: 1; height: 44px; background: none; border: none;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: #948ea1; cursor: pointer; position: relative;
  transition: color .2s;
}
.lb-tab.active { color: #cdbdff; }
.lb-tab::after {
  content: ''; position: absolute; bottom: 0; left: 20%; right: 20%;
  height: 2px; border-radius: 2px; background: #7C4DFF;
  transform: scaleX(0); transition: transform .25s cubic-bezier(.34,1.2,.64,1);
}
.lb-tab.active::after { transform: scaleX(1); }
/* ── Podium ── */
.lb-podium-section {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 8px; padding: 24px 24px 16px; height: 200px;
}
.lb-podium-col {
  display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 100px;
}
.lb-podium-crown { font-size: 20px; margin-bottom: 2px; }
.lb-podium-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; color: #fff;
  border: 2.5px solid;
}
.lb-podium-name {
  font-size: 11px; font-weight: 700; color: #e6e0ee;
  margin: 5px 0 2px; text-align: center;
  max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lb-podium-pct {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; color: #948ea1; margin-bottom: 6px;
}
.lb-podium-block {
  width: 100%; border-radius: 10px 10px 0 0;
  transform-origin: bottom;
  animation: lb-slide .5s cubic-bezier(.34,1.2,.64,1) both;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; color: rgba(0,0,0,.4);
}
/* ── Ranked list ── */
.lb-list { padding: 0 20px; }
.lb-section-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; text-transform: uppercase; margin-bottom: 12px;
}
.lb-row {
  display: flex; align-items: center; gap: 10px;
  background: #1C1C2E; border-radius: 14px; padding: 12px 14px;
  margin-bottom: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  animation: lb-slide .38s cubic-bezier(.22,1,.36,1) both;
}
.lb-row.me {
  box-shadow: inset 0 0 0 1.5px rgba(124,77,255,.6),
              0 0 18px rgba(124,77,255,.15);
  background: rgba(124,77,255,.08);
}
.lb-rank-circle {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700;
}
.lb-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 15px; font-weight: 900; color: #fff;
}
.lb-info { flex: 1; min-width: 0; }
.lb-name {
  font-size: 14px; font-weight: 700; color: #e6e0ee;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lb-bar-wrap {
  height: 4px; background: rgba(255,255,255,.07); border-radius: 999px;
  margin-top: 5px; overflow: hidden;
}
.lb-bar { height: 100%; border-radius: 999px;
  background: linear-gradient(90deg,#7C4DFF,#FF4081);
  width: 0; transition: width 1s cubic-bezier(.22,1,.36,1); }
.lb-score {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; color: #cdbdff; flex-shrink: 0;
}
.lb-me-tag {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: .1em;
  color: #7C4DFF; display: block;
}
/* ── Skeleton ── */
.lb-sk {
  background: linear-gradient(90deg,#1C1C2E 25%,#2a2840 50%,#1C1C2E 75%);
  background-size: 800px 100%; animation: shimmer 1.4s ease infinite;
  border-radius: 12px;
}
/* ── Sticky my-rank bar ── */
.lb-my-rank {
  position: fixed; bottom: calc(64px + env(safe-area-inset-bottom)); left: 0; right: 0;
  padding: 0 20px 10px; z-index: 30;
  pointer-events: none; opacity: 0;
  transition: opacity .3s;
}
.lb-my-rank.visible { opacity: 1; }
.lb-my-rank-inner {
  background: rgba(20,20,32,.92); backdrop-filter: blur(16px);
  border: 1.5px solid rgba(124,77,255,.4); border-radius: 16px;
  padding: 12px 16px; display: flex; align-items: center; gap: 10px;
  box-shadow: 0 0 24px rgba(124,77,255,.2);
}
.lb-my-rank-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: #948ea1; text-transform: uppercase;
}
.lb-my-rank-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 900; color: #cdbdff; margin-left: auto;
}
.lb-my-rank-pct {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 13px; font-weight: 700; color: #948ea1;
}
/* ── Empty state ── */
.lb-empty {
  text-align: center; padding: 48px 24px;
  font-size: 14px; color: #948ea1; line-height: 1.6;
}
.lb-empty-emoji { font-size: 44px; margin-bottom: 12px; }
`;

function injectStyles() {
  if (document.getElementById('lb-css')) return;
  const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Rank colours ──────────────────────────────────────────────────────────────
const RANK_CFG = [
  { bg:'rgba(255,215,64,.15)', color:'#FFD740', border:'#FFD740' },
  { bg:'rgba(176,190,197,.15)', color:'#B0BEC5', border:'#B0BEC5' },
  { bg:'rgba(205,127,50,.15)',  color:'#CD7F32', border:'#CD7F32' },
];
function rankCfg(i) {
  return RANK_CFG[i] ?? { bg:'rgba(255,255,255,.07)', color:'#948ea1', border:'rgba(255,255,255,.12)' };
}

// ── Podium order: [silver(L), gold(C), bronze(R)] ─────────────────────────────
const PODIUM_H      = ['70%', '100%', '50%'];
const PODIUM_GRADES = [
  { bg:'linear-gradient(180deg,#A0A0B0,#707080)', border:'#B0BEC5', num:'2' },
  { bg:'linear-gradient(180deg,#FFD740,#FF9800)', border:'#FFE082', num:'1' },
  { bg:'linear-gradient(180deg,#CD7F32,#8B5E3C)', border:'#D4943A', num:'3' },
];

// ── Skeleton HTML ─────────────────────────────────────────────────────────────
function skelHtml() {
  return `
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;padding:24px 24px 16px;height:200px">
      ${[0,1,2].map(i => `
        <div style="flex:1;max-width:100px;display:flex;flex-direction:column;align-items:center">
          <div class="lb-sk" style="width:46px;height:46px;border-radius:50%;margin-bottom:6px"></div>
          <div class="lb-sk" style="width:60%;height:${PODIUM_H[i]};border-radius:10px 10px 0 0"></div>
        </div>`).join('')}
    </div>
    <div style="padding:0 20px">
      ${[1,2,3,4,5].map(i => `
        <div style="display:flex;align-items:center;gap:10px;background:#1C1C2E;
          border-radius:14px;padding:12px 14px;margin-bottom:8px">
          <div class="lb-sk" style="width:30px;height:30px;border-radius:50%"></div>
          <div class="lb-sk" style="width:38px;height:38px;border-radius:50%"></div>
          <div style="flex:1">
            <div class="lb-sk" style="width:55%;height:14px;margin-bottom:7px"></div>
            <div class="lb-sk" style="width:80%;height:4px"></div>
          </div>
          <div class="lb-sk" style="width:36px;height:22px"></div>
        </div>`).join('')}
    </div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderLeaderboard(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  const myUid = store.user.uid;
  let currentPeriod = 'all';
  let aborted = false;

  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'lb-root';

  root.innerHTML = `
    <h1 class="lb-topbar">Leaderboard</h1>

    <!-- Tabs -->
    <div class="lb-tabs">
      <button class="lb-tab active" data-period="all">All Time</button>
      <button class="lb-tab" data-period="month">This Month</button>
    </div>

    <!-- Dynamic body -->
    <div id="lb-body">${skelHtml()}</div>

    <!-- Sticky my-rank bar -->
    <div class="lb-my-rank" id="lb-my-rank">
      <div class="lb-my-rank-inner">
        <div>
          <div class="lb-my-rank-label">Your Rank</div>
        </div>
        <div id="lb-my-rank-num" class="lb-my-rank-num">#—</div>
        <div id="lb-my-rank-pct" class="lb-my-rank-pct">—%</div>
      </div>
    </div>
  `;

  app.appendChild(root);
  mountBottomNav(router, 'stats');

  const body        = root.querySelector('#lb-body');
  const myRankBar   = root.querySelector('#lb-my-rank');
  const myRankNum   = root.querySelector('#lb-my-rank-num');
  const myRankPct   = root.querySelector('#lb-my-rank-pct');

  // ── Render list ────────────────────────────────────────────────────────────
  function renderList(entries) {
    if (!entries?.length) {
      body.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-emoji">🏆</div>
          <p>No leaderboard data yet.<br>Play some games to appear here!</p>
        </div>`;
      return;
    }

    const maxScore = Math.max(1, ...entries.map(e => e.bravery_score ?? 0));
    const top3 = entries.slice(0, 3);
    // Podium display order: silver, gold, bronze
    const podOrder = [top3[1], top3[0], top3[2]];

    // Find my entry
    const myIdx   = entries.findIndex(e => e.uid === myUid);
    const myEntry = myIdx >= 0 ? entries[myIdx] : null;

    body.innerHTML = `
      <!-- Podium -->
      <div class="lb-podium-section">
        ${podOrder.map((e, i) => e ? `
          <div class="lb-podium-col">
            ${i === 1 ? '<div class="lb-podium-crown">👑</div>' : '<div style="height:26px"></div>'}
            <div class="lb-podium-avatar"
                 style="background:${nameColor(e.display_name)};border-color:${PODIUM_GRADES[i].border}">
              ${(e.display_name ?? '?')[0].toUpperCase()}
            </div>
            <div class="lb-podium-name">${(e.display_name ?? 'Player').split(' ')[0]}</div>
            <div class="lb-podium-pct">${Math.round(e.bravery_score ?? 0)}%</div>
            <div class="lb-podium-block"
                 style="height:${PODIUM_H[i]};background:${PODIUM_GRADES[i].bg};animation-delay:${i * 0.08}s">
              ${PODIUM_GRADES[i].num}
            </div>
          </div>` : `<div class="lb-podium-col"></div>`
        ).join('')}
      </div>

      <!-- Full ranked list -->
      <div class="lb-list">
        <p class="lb-section-label">Full Rankings</p>
        ${entries.map((e, i) => {
          const rc    = rankCfg(i);
          const isMe  = e.uid === myUid;
          const pct   = ((e.bravery_score ?? 0) / maxScore) * 100;
          const color = nameColor(e.display_name ?? '');
          return `
            <div class="lb-row${isMe ? ' me' : ''}" id="lb-row-${i}"
                 style="animation-delay:${Math.min(i * 0.04, 0.5)}s">
              <div class="lb-rank-circle"
                   style="background:${rc.bg};color:${rc.color};border:1.5px solid ${rc.border}">
                ${i === 0 ? '👑' : i + 1}
              </div>
              <div class="lb-avatar" style="background:${color}">
                ${(e.display_name ?? '?')[0].toUpperCase()}
              </div>
              <div class="lb-info">
                <div class="lb-name">
                  ${e.display_name ?? 'Anonymous'}
                  ${isMe ? '<span class="lb-me-tag">YOU</span>' : ''}
                </div>
                <div class="lb-bar-wrap">
                  <div class="lb-bar" data-pct="${pct}"></div>
                </div>
              </div>
              <div class="lb-score">${Math.round(e.bravery_score ?? 0)}%</div>
            </div>`;
        }).join('')}
      </div>
    `;

    // Animate bars after paint
    setTimeout(() => {
      body.querySelectorAll('.lb-bar').forEach(bar => {
        bar.style.width = `${bar.dataset.pct}%`;
      });
    }, 80);

    // ── Sticky my-rank bar visibility ──────────────────────────────────────
    if (myEntry) {
      myRankNum.textContent = `#${myIdx + 1}`;
      myRankPct.textContent = `${Math.round(myEntry.bravery_score ?? 0)}%`;

      const myRow = body.querySelector(`#lb-row-${myIdx}`);
      if (myRow) {
        const obs = new IntersectionObserver(([entry]) => {
          myRankBar.classList.toggle('visible', !entry.isIntersecting);
        }, { threshold: 0.5 });
        obs.observe(myRow);
        // Store ref to disconnect on cleanup
        root._myRowObs = obs;
      }
    }
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function load(period) {
    body.innerHTML = skelHtml();
    myRankBar.classList.remove('visible');
    if (root._myRowObs) { root._myRowObs.disconnect(); root._myRowObs = null; }

    try {
      const data    = await api.getLeaderboard(period);
      const entries = data?.entries ?? data ?? [];
      if (!aborted) renderList(entries);
    } catch (err) {
      if (aborted) return;
      console.warn('[leaderboard] load error:', err);
      showToast('Could not load leaderboard', 'error');
      body.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-emoji">😕</div>
          <p>Could not load leaderboard.<br>Check your connection and try again.</p>
        </div>`;
    }
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  root.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const period = tab.dataset.period;
      if (period === currentPeriod) return;
      currentPeriod = period;
      root.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      load(period);
    });
  });

  // Initial load
  load('all');

  return () => {
    aborted = true;
    root._myRowObs?.disconnect();
    document.getElementById('bottom-nav')?.remove();
  };
}
