// src/pages/stats.js — Player statistics with animated gauge, category bars, achievements
// Data: api.getStats() → { total_sessions, total_dares, total_truths, dares_skipped,
//                          bravery_score, category_breakdown, dare_streak, best_streak }

import { store }          from '../store.js';
import { api }            from '../utils/api.js';
import { showToast, initPullToRefresh } from '../utils/feedback.js';
import { mountBottomNav } from './home.js';

// ── Category metadata ─────────────────────────────────────────────────────────
const CAT_META = {
  FRIENDLY: { label: 'Friendly',  color: '#4FC3F7', emoji: '🤝' },
  PARTY:    { label: 'Party',     color: '#FFB74D', emoji: '🎉' },
  COUPLES:  { label: 'Couples',   color: '#F06292', emoji: '💑' },
  DIRTY:    { label: 'Dirty',     color: '#FF5252', emoji: '🔥' },
  CUSTOM:   { label: 'Custom',    color: '#A5D6A7', emoji: '✨' },
};

// ── Achievements config ───────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  {
    id: 'fearless',
    label: 'Fearless',
    emoji: '🦁',
    desc: 'Complete 10 dares',
    check: s => (s.total_dares ?? 0) >= 10,
  },
  {
    id: 'truth_teller',
    label: 'Truth Teller',
    emoji: '💬',
    desc: 'Answer 20 truths',
    check: s => (s.total_truths ?? 0) >= 20,
  },
  {
    id: 'party_animal',
    label: 'Party Animal',
    emoji: '🥳',
    desc: 'Play 5 sessions',
    check: s => (s.total_sessions ?? 0) >= 5,
  },
  {
    id: 'brave_heart',
    label: 'Brave Heart',
    emoji: '❤️‍🔥',
    desc: 'Reach 80% bravery',
    check: s => (s.bravery_score ?? 0) >= 80,
  },
];

// ── Gauge constants (270° arc, like a speedometer) ───────────────────────────
const GAUGE_R      = 80;
const GAUGE_ARC    = 270;                        // degrees swept
const GAUGE_CIRCUM = 2 * Math.PI * GAUGE_R;     // full circle
const GAUGE_DASH   = GAUGE_CIRCUM * (GAUGE_ARC / 360); // arc length for 270°

// easeOut cubic
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// Lerp a hex color by progress 0→1 between three stops: error→warning→success
function gaugeColor(pct) {
  // 0% = #FF5252, 50% = #FFD740, 100% = #00E676
  if (pct <= 0.5) {
    const t = pct * 2;
    const r = Math.round(0xFF + (0xFF - 0xFF) * t);
    const g = Math.round(0x52 + (0xD7 - 0x52) * t);
    const b = Math.round(0x52 + (0x40 - 0x52) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (pct - 0.5) * 2;
    const r = Math.round(0xFF + (0x00 - 0xFF) * t);
    const g = Math.round(0xD7 + (0xE6 - 0xD7) * t);
    const b = Math.round(0x40 + (0x76 - 0x40) * t);
    return `rgb(${r},${g},${b})`;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
.st-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
  overflow-x: hidden;
}
/* ── Top bar ── */
.st-topbar {
  padding: 14px 20px 6px; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: #e6e0ee;
}
/* ── Section label ── */
.st-section-label {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; text-transform: uppercase; margin-bottom: 12px;
}
/* ── Gauge section ── */
.st-gauge-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px 20px 16px;
}
.st-gauge-svg { display: block; overflow: visible; }
.st-gauge-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; text-transform: uppercase; margin-top: 8px;
}
.st-gauge-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 40px; font-weight: 900; dominant-baseline: central;
  text-anchor: middle;
}
.st-gauge-pct {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 14px; font-weight: 700; dominant-baseline: central;
  text-anchor: middle; fill: #948ea1;
}
/* ── 2×2 Metric grid ── */
.st-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  padding: 0 20px 24px;
}
.st-metric-card {
  background: #1C1C2E; border-radius: 16px; padding: 16px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.st-metric-icon { font-size: 22px; margin-bottom: 6px; }
.st-metric-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 32px; font-weight: 900; letter-spacing: -.04em; line-height: 1;
}
.st-metric-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  color: #948ea1; text-transform: uppercase; margin-top: 4px;
}
/* ── Category breakdown ── */
.st-cat-section { padding: 0 20px 24px; }
.st-cat-row { margin-bottom: 12px; }
.st-cat-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 5px;
}
.st-cat-name { font-size: 13px; font-weight: 700; color: #e6e0ee; }
.st-cat-count { font-size: 12px; color: #948ea1; }
.st-bar-track {
  height: 6px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden;
}
.st-bar-fill {
  height: 100%; border-radius: 999px;
  width: 0%; transition: width 1s cubic-bezier(.22,1,.36,1);
}
/* ── Dare streak ── */
.st-streak-card {
  margin: 0 20px 24px;
  background: #1C1C2E; border-radius: 16px; padding: 18px 20px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  display: flex; align-items: center; gap: 16px;
}
.st-streak-flame { font-size: 40px; }
.st-streak-info { flex: 1; }
.st-streak-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 42px; font-weight: 900; color: #FF6D00; line-height: 1;
  letter-spacing: -.04em;
}
.st-streak-label { font-size: 12px; color: #948ea1; margin-top: 2px; }
.st-streak-best {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .08em;
  color: #948ea1; text-align: right;
}
.st-streak-best span { display: block; font-size: 20px; font-weight: 900;
  font-family:'Bricolage Grotesque',system-ui,sans-serif; color: #cdbdff; }
/* ── Achievements ── */
.st-ach-section { padding: 0 20px 24px; }
.st-ach-scroll {
  display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none;
  padding-bottom: 4px;
}
.st-ach-scroll::-webkit-scrollbar { display: none; }
.st-ach-badge {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  flex-shrink: 0; width: 76px;
}
.st-ach-circle {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; position: relative;
  border: 2px solid;
}
.st-ach-badge.unlocked .st-ach-circle {
  background: linear-gradient(135deg,#3d2f05,#5c4510);
  border-color: #FFD740;
  box-shadow: 0 0 16px rgba(255,215,64,.3);
}
.st-ach-badge.locked .st-ach-circle {
  background: #1C1C2E; border-color: rgba(255,255,255,.12);
  filter: grayscale(.8);
}
.st-ach-lock {
  position: absolute; bottom: -2px; right: -2px;
  font-size: 13px;
}
.st-ach-name {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  text-align: center; color: #948ea1; text-transform: uppercase;
}
.st-ach-badge.unlocked .st-ach-name { color: #FFD740; }
.st-ach-desc {
  font-size: 10px; color: #494455; text-align: center; line-height: 1.3;
}
/* ── Skeleton ── */
.st-sk {
  background: linear-gradient(90deg,#1C1C2E 25%,#2a2840 50%,#1C1C2E 75%);
  background-size: 800px 100%; animation: shimmer 1.4s ease infinite;
  border-radius: 12px;
}
`;

function injectStyles() {
  if (document.getElementById('st-css')) return;
  const s = document.createElement('style'); s.id = 'st-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Gauge SVG builder ─────────────────────────────────────────────────────────
function buildGauge(pct, color) {
  // Gauge: 270° arc, starts at 135° (bottom-left), sweeps clockwise
  const startAngle = 135;
  const total      = GAUGE_DASH;
  const filled     = total * pct;
  const empty      = total - filled;

  return `
    <svg class="st-gauge-svg" width="200" height="160" viewBox="0 0 200 160">
      <defs>
        <linearGradient id="gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#FF5252"/>
          <stop offset="50%"  stop-color="#FFD740"/>
          <stop offset="100%" stop-color="#00E676"/>
        </linearGradient>
      </defs>
      <!-- Track arc -->
      <circle cx="100" cy="100" r="${GAUGE_R}" fill="none"
        stroke="rgba(255,255,255,.08)" stroke-width="10"
        stroke-dasharray="${GAUGE_DASH} ${GAUGE_CIRCUM - GAUGE_DASH}"
        stroke-dashoffset="0"
        stroke-linecap="round"
        transform="rotate(135 100 100)"/>
      <!-- Progress arc -->
      <circle cx="100" cy="100" r="${GAUGE_R}" fill="none"
        stroke="url(#gauge-grad)" stroke-width="10"
        stroke-dasharray="${filled} ${GAUGE_CIRCUM - filled}"
        stroke-dashoffset="0"
        stroke-linecap="round"
        id="st-gauge-arc"
        transform="rotate(135 100 100)"
        style="transition:stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1)"/>
      <!-- Center text -->
      <text class="st-gauge-num" x="100" y="96" fill="${color}" id="st-gauge-num">
        ${Math.round(pct * 100)}
      </text>
      <text class="st-gauge-pct" x="100" y="116">BRAVERY %</text>
    </svg>`;
}

// ── Skeleton HTML ─────────────────────────────────────────────────────────────
function skeletonHTML() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;padding:24px 20px 16px">
      <div class="st-sk" style="width:180px;height:140px;border-radius:999px"></div>
    </div>
    <div class="st-grid">
      ${[1,2,3,4].map(() => `
        <div class="st-metric-card">
          <div class="st-sk" style="width:40px;height:16px;margin-bottom:8px"></div>
          <div class="st-sk" style="width:60px;height:32px;margin-bottom:6px"></div>
          <div class="st-sk" style="width:50px;height:10px"></div>
        </div>`).join('')}
    </div>
    <div style="padding:0 20px 24px">
      <div class="st-sk" style="height:80px;border-radius:16px"></div>
    </div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderStats(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'st-root';

  root.innerHTML = `
    <h1 class="st-topbar">Your Stats</h1>
    <div class="hy-ptr" id="st-ptr" style="text-align:center;height:0;overflow:hidden;font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;color:#7C4DFF;transition:height .2s"></div>
    <div id="st-body">${skeletonHTML()}</div>
  `;

  // ── Pull-to-refresh indicator style (reuse hy-ptr pattern) ────────────────
  const styleEl = document.head.querySelector('#st-ptr-style') ?? (() => {
    const s = document.createElement('style');
    s.id = 'st-ptr-style';
    s.textContent = '.hy-ptr.visible{height:36px;line-height:36px;}';
    document.head.appendChild(s);
    return s;
  })();

  app.appendChild(root);
  mountBottomNav(router, 'stats');

  let aborted = false;

  // ── Animate gauge ─────────────────────────────────────────────────────────
  function animateGauge(targetPct) {
    const arc  = root.querySelector('#st-gauge-arc');
    const num  = root.querySelector('#st-gauge-num');
    if (!arc || !num) return;

    const start = performance.now();
    const dur   = 1200;

    function tick(now) {
      const t    = Math.min((now - start) / dur, 1);
      const ease = easeOut(t);
      const cur  = ease * targetPct;
      const fill = GAUGE_DASH * cur;

      arc.setAttribute('stroke-dasharray', `${fill} ${GAUGE_CIRCUM - fill}`);
      arc.setAttribute('stroke', gaugeColor(cur));
      num.setAttribute('fill', gaugeColor(cur));
      num.textContent = Math.round(cur * 100);

      if (t < 1 && !aborted) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Render populated stats ────────────────────────────────────────────────
  function renderPopulated(stats) {
    const bravery  = Math.min(100, Math.max(0, stats.bravery_score ?? 0));
    const bravPct  = bravery / 100;
    const breakdown = stats.category_breakdown ?? {};
    const maxCat   = Math.max(1, ...Object.values(breakdown));

    // Achievement unlocks
    const achieves = ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(stats) }));

    root.querySelector('#st-body').innerHTML = `
      <!-- Bravery gauge -->
      <div class="st-gauge-wrap">
        ${buildGauge(0, '#FF5252')}
        <span class="st-gauge-label">Overall Bravery Score</span>
      </div>

      <!-- 2×2 metric grid -->
      <div class="st-grid">
        <div class="st-metric-card">
          <div class="st-metric-icon">🔥</div>
          <div class="st-metric-num" style="color:#FF6D00">${stats.total_dares ?? 0}</div>
          <div class="st-metric-label">Dares Done</div>
        </div>
        <div class="st-metric-card">
          <div class="st-metric-icon">💬</div>
          <div class="st-metric-num" style="color:#42A5F5">${stats.total_truths ?? 0}</div>
          <div class="st-metric-label">Truths Done</div>
        </div>
        <div class="st-metric-card">
          <div class="st-metric-icon">🐔</div>
          <div class="st-metric-num" style="color:#F44336">${stats.dares_skipped ?? 0}</div>
          <div class="st-metric-label">Dares Skipped</div>
        </div>
        <div class="st-metric-card">
          <div class="st-metric-icon">🎮</div>
          <div class="st-metric-num" style="color:#7C4DFF">${stats.total_sessions ?? 0}</div>
          <div class="st-metric-label">Sessions</div>
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="st-cat-section">
        <p class="st-section-label">Category Breakdown</p>
        <div style="background:#1C1C2E;border-radius:16px;padding:16px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          ${Object.entries(breakdown).length
            ? Object.entries(breakdown).map(([cat, count]) => {
                const meta = CAT_META[cat] ?? { label: cat, color: '#cdbdff', emoji: '❓' };
                const pct  = (count / maxCat) * 100;
                return `
                  <div class="st-cat-row">
                    <div class="st-cat-header">
                      <span class="st-cat-name">${meta.emoji} ${meta.label}</span>
                      <span class="st-cat-count">${count} rounds</span>
                    </div>
                    <div class="st-bar-track">
                      <div class="st-bar-fill" data-pct="${pct}" style="background:${meta.color}"></div>
                    </div>
                  </div>`;
              }).join('')
            : `<p style="font-size:14px;color:#494455;text-align:center;margin:8px 0">Play a game to see breakdown</p>`}
        </div>
      </div>

      <!-- Dare streak -->
      <div class="st-streak-card">
        <div class="st-streak-flame">🔥</div>
        <div class="st-streak-info">
          <div class="st-streak-num">${stats.dare_streak ?? 0}</div>
          <div class="st-streak-label">Current Dare Streak</div>
        </div>
        <div class="st-streak-best">
          BEST
          <span>${stats.best_streak ?? 0}</span>
        </div>
      </div>

      <!-- Achievements -->
      <div class="st-ach-section">
        <p class="st-section-label">Achievements</p>
        <div class="st-ach-scroll">
          ${achieves.map(a => `
            <div class="st-ach-badge ${a.unlocked ? 'unlocked' : 'locked'}">
              <div class="st-ach-circle">
                ${a.emoji}
                ${!a.unlocked ? '<span class="st-ach-lock">🔒</span>' : ''}
              </div>
              <span class="st-ach-name">${a.label}</span>
              <span class="st-ach-desc">${a.desc}</span>
            </div>`).join('')}
        </div>
      </div>
    `;

    // Animate gauge after render
    requestAnimationFrame(() => animateGauge(bravPct));

    // Animate category bars
    setTimeout(() => {
      root.querySelectorAll('.st-bar-fill').forEach(bar => {
        bar.style.width = `${bar.dataset.pct}%`;
      });
    }, 100);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  function loadStats() {
    return api.getStats()
      .then(stats => { if (!aborted) renderPopulated(stats); })
      .catch(err => {
        if (aborted) return;
        console.warn('[stats] load error:', err);
        showToast('Could not load stats', 'error');
        renderPopulated({});
      });
  }

  loadStats();

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const ptrEl  = root.querySelector('#st-ptr');
  const ptr    = initPullToRefresh(ptrEl, loadStats);

  return () => {
    aborted = true;
    ptr.destroy();
    document.getElementById('bottom-nav')?.remove();
  };
}
