// src/pages/game.js — Finger Picker: full multi-touch canvas
// Touch events only (not pointer events) for iOS Safari compat.
// State machine: waiting → countdown → winner
// Particles: gravity + alpha fade. Firestore: throttled finger writes.

import { store }          from '../store.js';
import { haptic, sound }  from '../utils/feedback.js';
import { writeFingerPos } from '../firestore.js';
import { isValidRoomId, sanitizeName } from '../utils/security.js';

// ── Player palette (matches setup.js AV_COLORS) ──────────────────────────────
const PLAYER_COLORS = [
  '#7C4DFF','#FF4081','#00BCD4','#4CAF84',
  '#FFC107','#FF5722','#9C27B0','#00E5FF',
];

// ── Inject scoped styles ─────────────────────────────────────────────────────
const CSS = `
.gp-root {
  position: fixed; inset: 0;
  background: #000; overflow: hidden;
  touch-action: none; user-select: none;
  -webkit-user-select: none;
}
.gp-canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  touch-action: none;
}
/* Countdown overlay */
.gp-countdown {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%) scale(1);
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 140px; font-weight: 900;
  color: #7C4DFF;
  text-shadow: 0 0 40px rgba(124,77,255,.9), 0 0 80px rgba(124,77,255,.5);
  pointer-events: none; z-index: 10;
  opacity: 0;
  transition: opacity .2s;
}
.gp-countdown.visible { opacity: 1; }
.gp-countdown.bounce {
  animation: gp-bounce .35s cubic-bezier(.34,1.56,.64,1);
}
@keyframes gp-bounce {
  0%   { transform: translate(-50%,-50%) scale(1.6); }
  100% { transform: translate(-50%,-50%) scale(1); }
}
/* Hint text */
.gp-hint {
  position: absolute; bottom: 24%; left: 0; right: 0;
  text-align: center;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px; font-weight: 600;
  color: rgba(255,255,255,.3);
  pointer-events: none; z-index: 5;
  transition: opacity .4s;
}
.gp-hint.hidden { opacity: 0; }
/* Top player chips */
.gp-chips {
  position: absolute; top: env(safe-area-inset-top, 16px); left: 0; right: 0;
  display: flex; justify-content: center; gap: 8px;
  padding: 12px 20px; z-index: 5; flex-wrap: wrap;
  pointer-events: none;
}
.gp-chip {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.08); border-radius: 999px;
  padding: 4px 10px 4px 6px;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 12px; font-weight: 700; color: rgba(255,255,255,.6);
}
.gp-chip-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
/* Action buttons (TRUTH / DARE) */
.gp-actions {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; gap: 12px; padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  z-index: 20;
  transform: translateY(120%);
  transition: transform .45s cubic-bezier(.34,1.4,.64,1);
}
.gp-actions.visible { transform: translateY(0); }
.gp-action-btn {
  flex: 1; height: 56px; border-radius: 16px;
  background: rgba(0,0,0,.6); backdrop-filter: blur(12px);
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 20px; font-weight: 900; letter-spacing: .04em;
  cursor: pointer; touch-action: manipulation;
  transition: transform .12s;
  display: flex; align-items: center; justify-content: center;
}
.gp-action-btn:active { transform: scale(.95); }
.gp-truth { border: 2.5px solid #42A5F5; color: #42A5F5; box-shadow: 0 0 20px rgba(66,165,245,.3); }
.gp-dare  { border: 2.5px solid #FF6061; color: #FF6061; box-shadow: 0 0 20px rgba(255,96,97,.3); }
/* Winner name overlay */
.gp-winner-name {
  position: absolute; top: 30%; left: 0; right: 0;
  text-align: center;
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 36px; font-weight: 900; color: #fff;
  text-shadow: 0 2px 20px rgba(0,0,0,.8);
  pointer-events: none; z-index: 15;
  opacity: 0;
  transition: opacity .5s .3s;
}
.gp-winner-name.visible { opacity: 1; }
/* Back button */
.gp-back {
  position: absolute; top: calc(env(safe-area-inset-top, 0px) + 52px); left: 16px;
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(255,255,255,.1); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.6); z-index: 10;
  touch-action: manipulation;
}
`;

function injectStyles() {
  if (document.getElementById('gp-css')) return;
  const s = document.createElement('style');
  s.id = 'gp-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Particle factory ──────────────────────────────────────────────────────────
function makeParticles(x, y, color) {
  const particles = [];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const angle  = (Math.PI * 2 / count) * i + (Math.random() - .5) * .4;
    const speed  = 3 + Math.random() * 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color,
      alpha: 1,
      life:  0,
      maxLife: 60 + Math.floor(Math.random() * 40),
      radius: 3 + Math.random() * 5,
    });
  }
  return particles;
}

// ── Hex → RGBA helper ─────────────────────────────────────────────────────────
function hexRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderGame(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;

  // Auth guard
  if (!store.user) { router.navigate('/landing', true); return; }

  // Pull session data
  const session = store.gameSession;
  if (!session) { router.navigate('/setup', true); return; }

  const { roomId, players, playerColors } = session;

  // Validate roomId before any Firestore calls
  if (roomId && !isValidRoomId(roomId)) {
    console.warn('[game] invalid roomId in session, redirecting to /home');
    router.navigate('/home', true);
    return;
  }

  // Sanitize player names from session (defense-in-depth)
  const safeNames = players.map(n => sanitizeName(n) || 'Player');
  const colors = playerColors ?? safeNames.map((_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length]);

  app.innerHTML = '';

  // ── Build DOM ─────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'gp-root';

  // Player chips row — use textContent to prevent name injection
  const chipsEl = document.createElement('div');
  chipsEl.className = 'gp-chips';
  safeNames.forEach((name, i) => {
    const chip = document.createElement('div');
    chip.className = 'gp-chip';
    const dot = document.createElement('div');
    dot.className = 'gp-chip-dot';
    dot.style.background = colors[i];
    const label = document.createElement('span');
    label.textContent = name.split(' ')[0];
    chip.appendChild(dot);
    chip.appendChild(label);
    chipsEl.appendChild(chip);
  });
  root.appendChild(chipsEl);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'gp-back';
  backBtn.setAttribute('aria-label', 'Exit game');
  backBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>`;
  root.appendChild(backBtn);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'gp-canvas';
  canvas.setAttribute('aria-label', 'Finger picker game area');
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Countdown overlay — aria-live so screen readers announce each number
  const countdownEl = document.createElement('div');
  countdownEl.className = 'gp-countdown';
  countdownEl.setAttribute('aria-live', 'assertive');
  countdownEl.setAttribute('aria-atomic', 'true');
  countdownEl.setAttribute('role', 'timer');
  countdownEl.textContent = '3';
  root.appendChild(countdownEl);

  // Hint text
  const hintEl = document.createElement('div');
  hintEl.className = 'gp-hint';
  hintEl.textContent = "Don't lift your finger!";
  root.appendChild(hintEl);

  // Winner name
  const winnerNameEl = document.createElement('div');
  winnerNameEl.className = 'gp-winner-name';
  root.appendChild(winnerNameEl);

  // Action buttons
  const actionsEl = document.createElement('div');
  actionsEl.className = 'gp-actions';
  actionsEl.innerHTML = `
    <button class="gp-action-btn gp-truth" id="gp-truth">TRUTH</button>
    <button class="gp-action-btn gp-dare"  id="gp-dare">DARE</button>
  `;
  root.appendChild(actionsEl);

  app.appendChild(root);

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ── State ─────────────────────────────────────────────────────────────────
  // touches: Map<touchId, { x, y, playerIndex, alpha, scale, color, name }>
  const touches   = new Map();
  let nextPlayerIndex = 0;

  let gameState   = 'waiting'; // 'waiting' | 'countdown' | 'winner'
  let countdownVal = 3;
  let countdownTimer = null;

  let winner      = null; // { touchId, playerIndex, x, y, color, name }
  let particles   = [];

  // Per-touch render state (lerped)
  const renderState = new Map(); // touchId → { alpha, scale }

  let animFrame   = null;

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Update particles
    const alive = [];
    for (const p of particles) {
      p.vy += 0.35; // gravity
      p.x  += p.vx;
      p.y  += p.vy;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life < p.maxLife) alive.push(p);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    particles = alive;

    // Draw each finger circle
    for (const [id, t] of touches) {
      let rs = renderState.get(id);
      if (!rs) { rs = { alpha: 1, scale: 1 }; renderState.set(id, rs); }

      // Lerp toward target
      const targetAlpha = (gameState === 'winner' && winner && winner.touchId !== id) ? 0.15 : 1;
      const targetScale = (gameState === 'winner' && winner && winner.touchId === id)  ? 1.4  : 1;
      rs.alpha += (targetAlpha - rs.alpha) * 0.12;
      rs.scale += (targetScale - rs.scale) * 0.10;

      const R_GLOW   = 90;
      const R_CIRCLE = 60;

      ctx.save();
      ctx.globalAlpha = rs.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(rs.scale, rs.scale);

      // Glow aura
      const grd = ctx.createRadialGradient(0, 0, R_CIRCLE * .4, 0, 0, R_GLOW);
      grd.addColorStop(0, hexRgba(t.color, 0.35));
      grd.addColorStop(1, hexRgba(t.color, 0));
      ctx.beginPath();
      ctx.arc(0, 0, R_GLOW, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Filled circle
      ctx.beginPath();
      ctx.arc(0, 0, R_CIRCLE, 0, Math.PI * 2);
      ctx.fillStyle = hexRgba(t.color, 0.75);
      ctx.fill();

      // White stroke
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Player name
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold 13px "Hanken Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = 'rgba(0,0,0,.8)';
      ctx.fillText(t.name, 0, 0);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    animFrame = requestAnimationFrame(draw);
  }

  // ── Countdown ────────────────────────────────────────────────────────────
  function startCountdown() {
    if (gameState !== 'waiting') return;
    gameState    = 'countdown';
    countdownVal = 3;

    countdownEl.textContent = '3';
    countdownEl.classList.add('visible');
    hintEl.classList.add('hidden');
    triggerBounce();

    countdownTimer = setInterval(() => {
      countdownVal--;
      if (countdownVal <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        selectWinner();
      } else {
        countdownEl.textContent = String(countdownVal);
        triggerBounce();
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (gameState === 'countdown') {
      gameState = 'waiting';
      countdownEl.classList.remove('visible');
      hintEl.classList.remove('hidden');
    }
  }

  function triggerBounce() {
    countdownEl.classList.remove('bounce');
    void countdownEl.offsetWidth; // reflow
    countdownEl.classList.add('bounce');
  }

  // ── Winner selection ──────────────────────────────────────────────────────
  function selectWinner() {
    if (!touches.size) return;

    const ids  = [...touches.keys()];
    const winId = ids[Math.floor(Math.random() * ids.length)];
    const t     = touches.get(winId);

    winner     = { touchId: winId, playerIndex: t.playerIndex, x: t.x, y: t.y, color: t.color, name: t.name };
    gameState  = 'winner';

    // Hide countdown overlay
    countdownEl.classList.remove('visible');

    // Haptic + sound
    haptic.winner();
    sound.winner();

    // Particles
    particles.push(...makeParticles(t.x, t.y, t.color));

    // Store winner for card page
    store.currentPlayerName = t.name;

    // Show winner name after short delay
    setTimeout(() => {
      winnerNameEl.textContent = `👑 ${t.name}`;
      winnerNameEl.classList.add('visible');
    }, 400);

    // Show TRUTH / DARE buttons
    setTimeout(() => {
      actionsEl.classList.add('visible');
    }, 1500);
  }

  // ── Touch handlers ────────────────────────────────────────────────────────
  function onTouchStart(e) {
    e.preventDefault();
    if (gameState === 'winner') return;

    for (const touch of e.changedTouches) {
      const { identifier: id, clientX: x, clientY: y } = touch;
      if (touches.has(id)) continue;
      if (nextPlayerIndex >= safeNames.length) continue; // cap at player count

      const idx = nextPlayerIndex++;
      touches.set(id, {
        x, y,
        playerIndex: idx,
        color: colors[idx] ?? PLAYER_COLORS[idx % PLAYER_COLORS.length],
        name:  safeNames[idx] ?? `P${idx + 1}`,
      });

      // Firestore write (throttled in firestore.js)
      if (roomId) writeFingerPos(roomId, id, x / canvas.width, y / canvas.height, idx);
    }

    if (touches.size >= 2 && gameState === 'waiting') {
      startCountdown();
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (gameState === 'winner') return;

    for (const touch of e.changedTouches) {
      const t = touches.get(touch.identifier);
      if (!t) continue;
      t.x = touch.clientX;
      t.y = touch.clientY;

      if (roomId) writeFingerPos(roomId, touch.identifier, t.x / canvas.width, t.y / canvas.height, t.playerIndex);
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (gameState === 'winner') return;

    for (const touch of e.changedTouches) {
      const id = touch.identifier;
      if (!touches.has(id)) continue;
      touches.delete(id);
      renderState.delete(id);
      // Reclaim player index slot so next finger maps correctly
      // (simple approach: reset counter to lowest unused index)
      nextPlayerIndex = touches.size > 0
        ? Math.max(...[...touches.values()].map(t => t.playerIndex)) + 1
        : 0;
    }

    if (touches.size < 2 && gameState === 'countdown') {
      cancelCountdown();
    }

    if (touches.size === 0) {
      hintEl.classList.remove('hidden');
    }
  }

  // Bind touch events to canvas (not window) to prevent scroll interference
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
  canvas.addEventListener('touchcancel',onTouchEnd,   { passive: false });

  // ── Action buttons ────────────────────────────────────────────────────────
  function navigate(type) {
    store.currentCardType    = type;
    store.currentPlayerName  = winner?.name ?? null;
    if (roomId) router.navigate(`/game/${roomId}/card`);
    else        router.navigate('/card');
  }

  actionsEl.querySelector('#gp-truth').addEventListener('click', () => navigate('TRUTH'));
  actionsEl.querySelector('#gp-dare').addEventListener('click',  () => navigate('DARE'));

  // Back button
  backBtn.addEventListener('click', () => {
    cleanup();
    router.navigate('/setup');
  });

  // ── Start draw loop ───────────────────────────────────────────────────────
  animFrame = requestAnimationFrame(draw);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function cleanup() {
    cancelAnimationFrame(animFrame);
    if (countdownTimer) clearInterval(countdownTimer);
    window.removeEventListener('resize', resizeCanvas);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove',  onTouchMove);
    canvas.removeEventListener('touchend',   onTouchEnd);
    canvas.removeEventListener('touchcancel',onTouchEnd);
  }

  return cleanup;
}
