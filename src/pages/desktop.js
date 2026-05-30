// src/pages/desktop.js — Desktop blocker with bottle spinner party game
// Full working bottle spinner: up to 8 players, score tracking, QR after 5 spins.

import QRCode from 'qrcode';

const CSS = `
@keyframes bottle-idle {
  0%,100% { transform: rotate(-3deg); }
  50%      { transform: rotate(3deg); }
}
@keyframes result-pop {
  0%  { transform: scale(.6); opacity:0; }
  70% { transform: scale(1.08); }
  100%{ transform: scale(1); opacity:1; }
}
@keyframes qr-reveal {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
.desktop-root {
  min-height: 100dvh;
  background: #0A0A0F;
  color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  padding: 40px 24px 64px;
  overflow-y: auto;
}
.desktop-header {
  text-align: center; margin-bottom: 32px;
}
.desktop-header h1 {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(28px, 4vw, 42px); font-weight: 900;
  letter-spacing: -.04em; color: #cdbdff;
  text-shadow: 0 0 24px rgba(124,77,255,.4);
  margin-bottom: 8px;
}
.desktop-header p {
  font-size: 16px; color: #948ea1;
}
.desktop-game {
  display: flex; gap: 40px;
  max-width: 900px; width: 100%;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
}
/* ── Bottle area ── */
.bottle-col {
  display: flex; flex-direction: column;
  align-items: center; gap: 24px;
  flex: 0 0 260px;
}
.bottle-wrap {
  width: 120px; height: 260px;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 0 24px rgba(124,77,255,.3));
  transform-origin: 50% 65%;
  animation: bottle-idle 3s ease-in-out infinite;
  transition: filter .3s;
}
.bottle-wrap.spinning {
  animation: none;
}
.bottle-svg { width: 120px; height: 260px; }
.bottle-result {
  text-align: center; min-height: 64px;
  display: flex; flex-direction: column;
  align-items: center; gap: 6px;
}
.bottle-result-label {
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; font-family: 'Space Grotesk', system-ui, sans-serif;
  text-transform: uppercase;
}
.bottle-result-name {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(24px, 5vw, 34px); font-weight: 900;
  color: #7C4DFF; letter-spacing: -.03em;
  text-shadow: 0 0 20px rgba(124,77,255,.6);
  min-height: 44px; display: flex; align-items: center;
}
.bottle-result-name.pop { animation: result-pop .4s cubic-bezier(.34,1.56,.64,1) forwards; }
.spin-btn {
  width: 100%; max-width: 220px;
  height: 56px; border: none; border-radius: 16px;
  background: linear-gradient(135deg, #7C4DFF 0%, #9C27B0 100%);
  color: #fff;
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 20px; font-weight: 900; letter-spacing: .04em;
  cursor: pointer; touch-action: manipulation;
  box-shadow: 0 4px 24px rgba(124,77,255,.45);
  transition: transform .15s, box-shadow .15s, opacity .15s;
}
.spin-btn:active:not(:disabled) { transform: scale(.96); }
.spin-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
/* ── Right panel ── */
.right-col {
  flex: 1; min-width: 260px; max-width: 380px;
  display: flex; flex-direction: column; gap: 24px;
}
.panel-section {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius: 16px; padding: 20px;
}
.panel-title {
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #948ea1; font-family: 'Space Grotesk', system-ui, sans-serif;
  text-transform: uppercase; margin-bottom: 14px;
}
/* Players */
.player-list { display: flex; flex-direction: column; gap: 8px; }
.player-row {
  display: flex; align-items: center; gap: 8px;
}
.player-input {
  flex: 1; height: 40px; padding: 0 12px;
  background: #141420; border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px; color: #e6e0ee; font-size: 14px;
  outline: none; transition: border-color .2s;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
}
.player-input:focus { border-color: rgba(124,77,255,.6); }
.remove-btn {
  width: 34px; height: 34px; border-radius: 8px;
  background: rgba(244,67,54,.15); color: #F44336;
  border: none; cursor: pointer; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
  flex-shrink: 0;
}
.remove-btn:hover { background: rgba(244,67,54,.3); }
.add-player-btn {
  width: 100%; height: 40px; margin-top: 10px;
  background: transparent;
  border: 1.5px dashed rgba(124,77,255,.4);
  border-radius: 10px; color: #cdbdff;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: border-color .2s, background .2s;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
}
.add-player-btn:hover { border-color: rgba(124,77,255,.8); background: rgba(124,77,255,.08); }
.add-player-btn:disabled { opacity: .4; cursor: not-allowed; }
/* Scores */
.score-list { display: flex; flex-direction: column; gap: 6px; }
.score-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.05);
}
.score-name { font-size: 14px; color: #cac3d8; }
.score-badge {
  min-width: 28px; height: 24px; padding: 0 8px;
  background: rgba(124,77,255,.2); color: #cdbdff;
  border-radius: 999px; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.score-badge.highlight { background: #7C4DFF; color: #fff; }
/* QR section */
.qr-section {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(124,77,255,.35), 0 0 32px rgba(124,77,255,.2);
  border-radius: 16px; padding: 20px;
  text-align: center;
  display: none;
  animation: qr-reveal .5s ease forwards;
}
.qr-section.visible { display: block; }
.qr-section p { font-size: 14px; color: #cac3d8; margin-bottom: 16px; line-height: 1.5; }
.qr-canvas-wrap {
  display: inline-block;
  padding: 12px; background: #fff; border-radius: 12px;
  box-shadow: 0 0 24px rgba(124,77,255,.4);
}
.spin-counter {
  text-align: center;
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: #948ea1; font-family: 'Space Grotesk', system-ui, sans-serif;
  margin-top: -8px;
}
`;

function loadFonts() {
  if (document.getElementById('cod-fonts')) return;
  const l = document.createElement('link');
  l.id  = 'cod-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@700&family=Hanken+Grotesk:wght@400;600;700&display=swap';
  document.head.appendChild(l);
}

function injectStyles() {
  if (document.getElementById('desktop-styles')) return;
  const s = document.createElement('style');
  s.id = 'desktop-styles'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── SVG Bottle ───────────────────────────────────────────────────────────────
const BOTTLE_SVG = `
<svg class="bottle-svg" viewBox="0 0 120 260" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3E2000"/>
      <stop offset="40%" stop-color="#7B3F00"/>
      <stop offset="70%" stop-color="#5C2E00"/>
      <stop offset="100%" stop-color="#2A1500"/>
    </linearGradient>
    <linearGradient id="neckGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3E2000"/>
      <stop offset="50%" stop-color="#9B5500"/>
      <stop offset="100%" stop-color="#2A1500"/>
    </linearGradient>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="30%" stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <!-- Body -->
  <rect x="20" y="120" width="80" height="120" rx="34" fill="url(#bottleGrad)"/>
  <!-- Shoulder taper -->
  <path d="M20 152 Q20 120 40 120 H80 Q100 120 100 152" fill="url(#bottleGrad)"/>
  <!-- Neck -->
  <rect x="44" y="52" width="32" height="72" rx="8" fill="url(#neckGrad)"/>
  <!-- Lip / cap -->
  <rect x="40" y="42" width="40" height="18" rx="6" fill="#5C3300"/>
  <rect x="44" y="40" width="32" height="8" rx="4" fill="#7B4500"/>
  <!-- Label area -->
  <rect x="28" y="158" width="64" height="60" rx="6" fill="rgba(255,255,255,0.06)"/>
  <rect x="34" y="168" width="52" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
  <rect x="38" y="180" width="44" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
  <rect x="42" y="190" width="36" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
  <!-- Glass sheen -->
  <rect x="20" y="120" width="80" height="120" rx="34" fill="url(#glassSheen)"/>
  <rect x="44" y="52" width="32" height="72" rx="8" fill="url(#glassSheen)"/>
</svg>`;

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderDesktop(router) {
  loadFonts();
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  // State
  let players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
  let scores  = {};
  let spins   = 0;
  let spinning = false;
  let bottleAngle = 0; // cumulative degrees

  players.forEach(p => { scores[p] = 0; });

  const root = document.createElement('div');
  root.className = 'desktop-root';

  root.innerHTML = `
    <header class="desktop-header">
      <h1>This game is for mobile only 📱</h1>
      <p>But here's something to keep you busy while you wait…</p>
    </header>

    <div class="desktop-game">
      <!-- Left: Bottle -->
      <div class="bottle-col">
        <div class="bottle-wrap" id="desktop-bottle">${BOTTLE_SVG}</div>
        <div class="bottle-result">
          <span class="bottle-result-label" id="result-label" style="opacity:0">Picked!</span>
          <span class="bottle-result-name" id="result-name"></span>
        </div>
        <button class="spin-btn" id="spin-btn">SPIN</button>
        <p class="spin-counter" id="spin-counter">Spins: 0</p>
      </div>

      <!-- Right: Controls -->
      <div class="right-col">
        <!-- Players -->
        <div class="panel-section">
          <p class="panel-title">Players</p>
          <div class="player-list" id="player-list"></div>
          <button class="add-player-btn" id="add-player-btn">＋ Add Player</button>
        </div>

        <!-- Scores -->
        <div class="panel-section">
          <p class="panel-title">Score</p>
          <div class="score-list" id="score-list"></div>
        </div>

        <!-- QR code (shown after 5 spins) -->
        <div class="qr-section" id="qr-section">
          <p>Want the real game?<br>Scan to play on mobile! 🎉</p>
          <div class="qr-canvas-wrap"><canvas id="qr-canvas"></canvas></div>
        </div>
      </div>
    </div>
  `;

  app.appendChild(root);

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const bottleEl    = root.querySelector('#desktop-bottle');
  const resultLabel = root.querySelector('#result-label');
  const resultName  = root.querySelector('#result-name');
  const spinBtn     = root.querySelector('#spin-btn');
  const spinCounter = root.querySelector('#spin-counter');
  const playerList  = root.querySelector('#player-list');
  const addBtn      = root.querySelector('#add-player-btn');
  const scoreList   = root.querySelector('#score-list');
  const qrSection   = root.querySelector('#qr-section');
  const qrCanvas    = root.querySelector('#qr-canvas');

  // ── Render helpers ─────────────────────────────────────────────────────────
  function renderPlayers() {
    playerList.innerHTML = '';
    players.forEach((name, i) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `
        <input class="player-input" type="text" value="${name}"
               aria-label="Player ${i+1} name" maxlength="20" data-i="${i}"/>
        <button class="remove-btn" data-i="${i}" aria-label="Remove ${name}">×</button>
      `;
      playerList.appendChild(row);
    });

    // Bind inputs
    playerList.querySelectorAll('.player-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = +e.target.dataset.i;
        const oldName = players[idx];
        const newName = e.target.value || `Player ${idx + 1}`;
        // Update scores key
        if (scores[oldName] !== undefined) {
          scores[newName] = scores[oldName];
          delete scores[oldName];
        } else {
          scores[newName] = 0;
        }
        players[idx] = newName;
        renderScores();
      });
    });

    // Bind remove buttons
    playerList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = +e.currentTarget.dataset.i;
        const name = players[idx];
        delete scores[name];
        players.splice(idx, 1);
        renderPlayers();
        renderScores();
        addBtn.disabled = players.length >= 8;
      });
    });

    addBtn.disabled = players.length >= 8;
  }

  function renderScores(lastPicked = null) {
    scoreList.innerHTML = '';
    // Sort by score desc
    const sorted = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    sorted.forEach(name => {
      const row = document.createElement('div');
      row.className = 'score-row';
      const isHighlight = name === lastPicked;
      row.innerHTML = `
        <span class="score-name">${name}</span>
        <span class="score-badge ${isHighlight ? 'highlight' : ''}">${scores[name] || 0}</span>
      `;
      scoreList.appendChild(row);
    });
  }

  // ── Spin logic ─────────────────────────────────────────────────────────────
  function spinBottle() {
    if (spinning || players.length < 2) return;

    const available = players.filter(p => p.trim());
    if (available.length < 2) {
      resultName.textContent = 'Need 2+ players';
      return;
    }

    spinning = true;
    spinBtn.disabled = true;
    bottleEl.classList.add('spinning');
    resultLabel.style.opacity = '0';
    resultName.textContent = '';

    // Pick random player
    const picked = available[Math.floor(Math.random() * available.length)];

    // Spin physics: 3-8 full rotations + aim offset
    // Since we spin visually we don't actually need to "point" at a player —
    // we just spin and reveal. Extra ≥ 3 full rotations.
    const extraRotations = (3 + Math.floor(Math.random() * 5)) * 360;
    const finalAngle = bottleAngle + extraRotations + Math.random() * 360;
    bottleAngle = finalAngle;

    bottleEl.style.transition = 'transform 3s cubic-bezier(0.17,0.67,0.12,1)';
    bottleEl.style.transform  = `rotate(${finalAngle}deg)`;

    setTimeout(() => {
      // Reveal result
      scores[picked] = (scores[picked] || 0) + 1;
      spins++;

      resultLabel.style.opacity = '1';
      resultName.textContent = picked;
      resultName.classList.remove('pop');
      // Force reflow
      void resultName.offsetWidth;
      resultName.classList.add('pop');

      spinCounter.textContent = `Spins: ${spins}`;
      renderScores(picked);

      spinning = false;
      spinBtn.disabled = false;
      bottleEl.classList.remove('spinning');
      // Keep idle animation but preserve final angle
      bottleEl.style.transition = '';
      bottleEl.style.animation = 'none';

      // After 5 spins show QR
      if (spins === 5) showQR();
    }, 3100);
  }

  // ── QR code ────────────────────────────────────────────────────────────────
  async function showQR() {
    try {
      await QRCode.toCanvas(qrCanvas, window.location.origin, {
        width: 180,
        margin: 1,
        color: { dark: '#0A0A0F', light: '#FFFFFF' },
      });
      qrSection.classList.add('visible');
    } catch (err) {
      console.warn('[desktop] QR generation failed:', err);
    }
  }

  // ── Add player ─────────────────────────────────────────────────────────────
  addBtn.addEventListener('click', () => {
    if (players.length >= 8) return;
    const name = `Player ${players.length + 1}`;
    players.push(name);
    scores[name] = 0;
    renderPlayers();
    renderScores();
  });

  spinBtn.addEventListener('click', spinBottle);

  // Initial render
  renderPlayers();
  renderScores();
}
