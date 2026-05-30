// src/pages/result.js — Session result: confetti + podium + leaderboard
// Data: store.roundResults (in memory from card.js rounds)

import { store }          from '../store.js';
import { mountBottomNav } from './home.js';
import { sound, haptic, showToast } from '../utils/feedback.js';

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes rs-slide-right {
  from { transform: translateX(40px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes rs-podium-grow {
  from { transform: scaleY(0); opacity: 0; }
  to   { transform: scaleY(1); opacity: 1; }
}
@keyframes rs-avatar-drop {
  from { transform: translateY(-20px) scale(.6); opacity: 0; }
  to   { transform: translateY(0)     scale(1);  opacity: 1; }
}
.rs-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  overflow-x: hidden; position: relative;
}
/* Confetti canvas */
.rs-confetti {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; z-index: 0;
}
/* Header */
.rs-header {
  position: relative; z-index: 1; text-align: center;
  padding: 48px 20px 24px;
}
.rs-heading {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 34px; font-weight: 900; letter-spacing: -.04em;
  color: #cdbdff;
  text-shadow: 0 0 32px rgba(124,77,255,.5);
  margin: 0 0 6px;
}
.rs-sub { font-size: 15px; color: #948ea1; margin: 0; }
/* Stats row */
.rs-stats-row {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
  padding: 0 20px 24px; position: relative; z-index: 1;
}
.rs-stat-card {
  background: #1C1C2E; border-radius: 14px; padding: 14px 8px;
  text-align: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.rs-stat-num {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 26px; font-weight: 900; color: #cdbdff; letter-spacing: -.04em;
}
.rs-stat-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  color: #948ea1; text-transform: uppercase; margin-top: 4px;
}
/* Podium */
.rs-podium-wrap {
  position: relative; z-index: 1;
  display: flex; align-items: flex-end; justify-content: center;
  gap: 8px; padding: 0 24px 24px; height: 200px;
}
.rs-podium-col {
  display: flex; flex-direction: column; align-items: center;
  flex: 1; max-width: 100px;
}
.rs-podium-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; color: #fff;
  border: 3px solid transparent;
  animation: rs-avatar-drop .5s cubic-bezier(.34,1.56,.64,1) both;
  flex-shrink: 0;
}
.rs-podium-name {
  font-size: 11px; font-weight: 700; color: #e6e0ee; margin: 6px 0 2px;
  text-align: center; max-width: 80px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rs-podium-pct {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  color: #948ea1; margin-bottom: 6px;
}
.rs-podium-block {
  width: 100%; border-radius: 10px 10px 0 0;
  transform-origin: bottom;
  animation: rs-podium-grow .6s cubic-bezier(.34,1.2,.64,1) both;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 20px; font-weight: 900; color: rgba(0,0,0,.5);
}
/* Leaderboard */
.rs-leaderboard {
  position: relative; z-index: 1;
  padding: 0 20px;
}
.rs-lb-title {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; text-transform: uppercase; margin-bottom: 12px;
}
.rs-lb-row {
  display: flex; align-items: center; gap: 12px;
  background: #1C1C2E; border-radius: 14px; padding: 12px 14px;
  margin-bottom: 8px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  animation: rs-slide-right .4s cubic-bezier(.22,1,.36,1) both;
}
.rs-rank-circle {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.rs-lb-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.rs-lb-info { flex: 1; }
.rs-lb-name { font-size: 14px; font-weight: 700; color: #e6e0ee; }
.rs-bravery-bar-wrap {
  height: 4px; background: rgba(255,255,255,.08);
  border-radius: 999px; margin-top: 5px; overflow: hidden;
}
.rs-bravery-bar {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg,#7C4DFF,#FF4081);
  transition: width 1s cubic-bezier(.22,1,.36,1);
}
.rs-lb-pct {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; color: #cdbdff; flex-shrink: 0;
}
/* Bottom buttons */
.rs-actions {
  position: relative; z-index: 1;
  padding: 24px 20px 8px;
  display: flex; flex-direction: column; gap: 10px;
}
.rs-play-again {
  width: 100%; height: 54px; border-radius: 16px; border: none;
  background: linear-gradient(135deg,#7C4DFF,#9C27B0);
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 900; letter-spacing:.02em;
  cursor: pointer; box-shadow: 0 4px 20px rgba(124,77,255,.4);
  transition: transform .12s;
}
.rs-play-again:active { transform: scale(.97); }
.rs-new-game {
  width: 100%; height: 50px; border-radius: 16px;
  background: transparent; border: 1.5px solid rgba(124,77,255,.4);
  color: #cdbdff; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 16px; font-weight: 700; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.rs-new-game:active { border-color: #7C4DFF; background: rgba(124,77,255,.1); }
.rs-view-history {
  width: 100%; height: 44px; border-radius: 16px;
  background: none; border: none;
  color: #948ea1; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
`;

function injectStyles() {
  if (document.getElementById('rs-css')) return;
  const s = document.createElement('style');
  s.id = 'rs-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Player colours ────────────────────────────────────────────────────────────
const PLAYER_COLORS = [
  '#7C4DFF','#FF4081','#00BCD4','#4CAF84',
  '#FFC107','#FF5722','#9C27B0','#00E5FF',
];

// ── Confetti ──────────────────────────────────────────────────────────────────
const CONF_COLORS = [
  '#7C4DFF','#FF4081','#FFC107','#4CAF84',
  '#00BCD4','#FF5722','#cdbdff','#ff6584',
];

function launchConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 80 }, () => ({
    x:      Math.random() * canvas.width,
    y:      -20 - Math.random() * 60,
    w:      6 + Math.random() * 8,
    h:      10 + Math.random() * 12,
    rot:    Math.random() * 360,
    rotV:   (Math.random() - .5) * 6,
    vy:     2 + Math.random() * 3,
    vx:     (Math.random() - .5) * 2,
    color:  CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
    alpha:  1,
    life:   0,
    maxLife: 180 + Math.floor(Math.random() * 80),
  }));

  let raf;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      p.life++;
      p.vy += .04; // gravity
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.rotV;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life < p.maxLife) alive++;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// ── Per-player stat computation ───────────────────────────────────────────────
function computeStats(players, roundResults = []) {
  const map = new Map();
  players.forEach((n, i) => map.set(n, { name: n, color: PLAYER_COLORS[i % PLAYER_COLORS.length], done: 0, total: 0 }));

  for (const r of roundResults) {
    const s = map.get(r.playerName);
    if (!s) continue;
    s.total++;
    if (r.result === 'done') s.done++;
  }

  return [...map.values()]
    .map(s => ({ ...s, bravery: s.total ? Math.round((s.done / s.total) * 100) : 0 }))
    .sort((a, b) => b.bravery - a.bravery || b.done - a.done);
}

// ── Render ────────────────────────────────────────────────────────────────────
export default function renderResult(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  const session      = store.gameSession;
  const roundResults = store.roundResults ?? [];
  const players      = session?.players ?? [];
  const roomId       = session?.roomId;

  const stats = computeStats(players, roundResults);
  const totalRounds  = roundResults.length;
  const totalDone    = roundResults.filter(r => r.result === 'done').length;
  const braveryPct   = totalRounds ? Math.round((totalDone / totalRounds) * 100) : 0;

  // Podium slots: [1st, 2nd, 3rd] but display order is [2nd(L), 1st(C), 3rd(R)]
  const first  = stats[0];
  const second = stats[1];
  const third  = stats[2];
  const podiumOrder = [second, first, third]; // left, center, right
  const podiumH     = ['60%', '100%', '45%'];
  const podiumGolds = [
    { bg:'linear-gradient(180deg,#A0A0B0,#808090)', border:'#B0B0C0', label:'2' },
    { bg:'linear-gradient(180deg,#FFD740,#FF9800)', border:'#FFE082', label:'1' },
    { bg:'linear-gradient(180deg,#CD7F32,#A0522D)', border:'#D4943A', label:'3' },
  ];

  app.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'rs-root';

  root.innerHTML = `
    <canvas class="rs-confetti" id="rs-confetti"></canvas>

    <!-- Header -->
    <div class="rs-header">
      <h1 class="rs-heading">Session Complete! 🎉</h1>
      <p class="rs-sub">${totalRounds} rounds played</p>
    </div>

    <!-- Stats row -->
    <div class="rs-stats-row">
      <div class="rs-stat-card">
        <div class="rs-stat-num">${totalRounds}</div>
        <div class="rs-stat-label">Rounds</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-num">${totalDone}</div>
        <div class="rs-stat-label">Dares Done</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-num">${braveryPct}%</div>
        <div class="rs-stat-label">Bravery</div>
      </div>
    </div>

    <!-- Podium -->
    ${stats.length >= 2 ? `
    <div class="rs-podium-wrap">
      ${podiumOrder.map((player, i) => player ? `
        <div class="rs-podium-col">
          <div class="rs-podium-avatar"
               style="background:${player.color};border-color:${podiumGolds[i].border};
                      animation-delay:${0.3 + i * 0.1}s">
            ${player.name[0].toUpperCase()}
          </div>
          <div class="rs-podium-name">${player.name.split(' ')[0]}</div>
          <div class="rs-podium-pct">${player.bravery}%</div>
          <div class="rs-podium-block"
               style="height:${podiumH[i]};background:${podiumGolds[i].bg};
                      animation-delay:${0.1 + i * 0.12}s">
            ${podiumGolds[i].label}
          </div>
        </div>` : `<div class="rs-podium-col"></div>`
      ).join('')}
    </div>` : ''}

    <!-- Leaderboard -->
    <div class="rs-leaderboard">
      <p class="rs-lb-title">Leaderboard</p>
      ${stats.map((p, i) => {
        const rankColors = ['#FFD740','#B0BEC5','#CD7F32'];
        const rankBg     = i < 3 ? `${rankColors[i]}22` : 'rgba(255,255,255,.08)';
        const rankColor  = i < 3 ? rankColors[i] : '#948ea1';
        return `
        <div class="rs-lb-row" style="--i:${i};animation-delay:calc(${i} * 60ms)">
          <div class="rs-rank-circle" style="background:${rankBg};color:${rankColor}">
            ${i === 0 ? '👑' : i + 1}
          </div>
          <div class="rs-lb-avatar" style="background:${p.color}">
            ${p.name[0].toUpperCase()}
          </div>
          <div class="rs-lb-info">
            <div class="rs-lb-name">${p.name}</div>
            <div class="rs-bravery-bar-wrap">
              <div class="rs-bravery-bar" id="bar-${i}" style="width:0%"></div>
            </div>
          </div>
          <div class="rs-lb-pct">${p.bravery}%</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Actions -->
    <div class="rs-actions">
      <button class="rs-play-again" id="rs-play-again">Play Again 🎮</button>
      <button class="rs-new-game"   id="rs-new-game">New Game</button>
      <button class="rs-view-history" id="rs-view-hist">View History</button>
    </div>
  `;

  app.appendChild(root);
  mountBottomNav(router, 'home');

  // ── Animate bravery bars after mount ──────────────────────────────────────
  requestAnimationFrame(() => {
    stats.forEach((p, i) => {
      const bar = root.querySelector(`#bar-${i}`);
      if (bar) {
        setTimeout(() => { bar.style.width = `${p.bravery}%`; }, 200 + i * 80);
      }
    });
  });

  // ── Launch confetti ───────────────────────────────────────────────────────
  const canvas   = root.querySelector('#rs-confetti');
  const stopConf = launchConfetti(canvas);
  sound.winner();
  haptic.winner();

  // Announce session saved once after confetti starts
  setTimeout(() => showToast('Session saved to history ✓', 'success', 3500), 800);

  // ── Button handlers ───────────────────────────────────────────────────────
  root.querySelector('#rs-play-again').addEventListener('click', () => {
    haptic.medium();
    // Preserve same players + settings, reset game state except players
    if (session) {
      const prev = { ...session, sessionId: crypto.randomUUID() };
      store.resetGame?.();
      store.gameSession = prev;
    }
    router.navigate('/setup');
  });

  root.querySelector('#rs-new-game').addEventListener('click', () => {
    haptic.medium();
    store.resetGame?.();
    router.navigate('/setup');
  });

  root.querySelector('#rs-view-hist').addEventListener('click', () => {
    haptic.light();
    router.navigate('/history');
  });

  // Cleanup
  return () => {
    stopConf();
    document.getElementById('bottom-nav')?.remove();
  };
}
