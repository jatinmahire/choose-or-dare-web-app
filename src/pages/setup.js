// src/pages/setup.js — Game setup screen (Midnight Dare design system)
// Player management, category chips, adult toggle, timer, validation → createRoom

import { store }        from '../store.js';
import { showToast, haptic } from '../utils/feedback.js';
import { sanitizeName } from '../utils/security.js';
import { createRoom }   from '../firestore.js';
import { AV_COLORS }    from './home.js';

// ── Avatar colour palette ────────────────────────────────────────────────────
// AV_COLORS imported from home.js (8 colours)

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES = [
  { id:'FRIENDLY', label:'Friendly',  color:'#4CAF84', adult:false },
  { id:'PARTY',    label:'Party',     color:'#FFC107', adult:false },
  { id:'COUPLES',  label:'Couples',   color:'#E91E63', adult:true  },
  { id:'DIRTY',    label:'Dirty',     color:'#F44336', adult:true  },
  { id:'CUSTOM',   label:'Custom',    color:'#00BCD4', adult:false },
];

const CSS = `
.setup-root {
  min-height: 100dvh;
  background: #0A0A0F;
  color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  display: flex; flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
/* Top bar */
.setup-topbar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 20px 8px;
  position: sticky; top: 0;
  background: #0A0A0F;
  border-bottom: 1px solid rgba(255,255,255,.05);
  z-index: 10;
}
.back-btn {
  width: 40px; height: 40px; border-radius: 12px;
  background: #1C1C2E; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #cac3d8; transition: background .15s;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.back-btn:active { background: #2a2840; }
.setup-title {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 20px; font-weight: 800; letter-spacing:-.03em; color:#e6e0ee;
}
/* Scrollable body */
.setup-body { flex:1; overflow-y:auto; padding: 20px; display:flex; flex-direction:column; gap:24px; }
/* Section label */
.setup-section-label {
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size:11px;font-weight:700;letter-spacing:.12em;
  color:#948ea1;text-transform:uppercase;margin-bottom:12px;
}
/* Player list */
.player-list { display:flex;flex-direction:column;gap:8px; }
.player-row-wrap { display:flex;flex-direction:column;gap:0; }
.player-row {
  display:flex;align-items:center;gap:10px;
  background:#1C1C2E;border-radius:14px;padding:10px 12px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
  transition:box-shadow .15s;
}
.player-row:focus-within { box-shadow:inset 0 0 0 1px rgba(124,77,255,.5); }
.av-circle {
  width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size:14px;font-weight:800;color:#fff;
  cursor:pointer;flex-shrink:0;
  transition:transform .15s;
  border:2px solid rgba(255,255,255,.2);
}
.av-circle:active{transform:scale(.9);}
.player-input {
  flex:1;background:transparent;border:none;outline:none;
  color:#e6e0ee;font-size:15px;font-weight:600;
  font-family:'Hanken Grotesk',system-ui,sans-serif;
  padding:4px 0;
}
.player-input::placeholder{color:#494455;}
.delete-btn {
  width:32px;height:32px;border-radius:8px;
  background:rgba(244,67,54,.12);color:#F44336;
  border:none;cursor:pointer;font-size:18px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:background .15s;
}
.delete-btn:hover{background:rgba(244,67,54,.28);}
/* Color picker slide-in */
.color-picker {
  display:flex;gap:8px;padding:10px 12px;
  background:#141420;border-radius:0 0 14px 14px;
  max-height:0;overflow:hidden;
  transition:max-height .25s cubic-bezier(.4,0,.2,1),padding .25s;
  padding-top:0;padding-bottom:0;
}
.color-picker.open {
  max-height:60px;padding-top:10px;padding-bottom:10px;
}
.color-dot {
  width:28px;height:28px;border-radius:50%;cursor:pointer;
  border:2.5px solid transparent;transition:transform .15s,border-color .15s;
  flex-shrink:0;
}
.color-dot.selected { border-color:#fff;transform:scale(1.15); }
/* Add player */
.add-player-btn {
  width:100%;height:48px;border-radius:14px;
  background:transparent;border:1.5px dashed rgba(124,77,255,.4);
  color:#cdbdff;font-size:15px;font-weight:600;cursor:pointer;
  font-family:'Hanken Grotesk',system-ui,sans-serif;
  transition:border-color .2s,background .2s;
}
.add-player-btn:hover{border-color:rgba(124,77,255,.8);background:rgba(124,77,255,.08);}
.add-player-btn:disabled{opacity:.35;cursor:not-allowed;}
/* Categories */
.category-grid {
  display:grid;grid-template-columns:1fr 1fr;gap:10px;
}
.cat-chip {
  display:flex;align-items:center;gap:8px;
  padding:12px 14px;border-radius:14px;
  background:#1C1C2E;border:none;cursor:pointer;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
  transition:box-shadow .15s,background .15s;
  touch-action:manipulation;
  text-align:left;
}
.cat-chip.selected {
  box-shadow:inset 0 0 0 1.5px currentColor;
  background:rgba(124,77,255,.1);
}
.cat-chip:disabled { opacity:.4;cursor:not-allowed; }
.cat-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0; }
.cat-name {
  font-size:14px;font-weight:700;color:#e6e0ee;flex:1;
  font-family:'Hanken Grotesk',system-ui,sans-serif;
}
.cat-lock {
  font-size:14px;margin-left:auto;
}
/* 18+ toggle */
.toggle-row {
  display:flex;align-items:center;justify-content:space-between;
  background:#1C1C2E;border-radius:14px;padding:14px 16px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
}
.toggle-row-text { display:flex;flex-direction:column;gap:3px; }
.toggle-label { font-size:15px;font-weight:700;color:#e6e0ee; }
.toggle-sub { font-size:12px;color:#948ea1;line-height:1.4; }
.toggle-switch {
  width:48px;height:26px;border-radius:13px;
  background:#2a2840;border:none;cursor:pointer;
  position:relative;transition:background .2s;
  flex-shrink:0;
}
.toggle-switch.on { background:#7C4DFF; }
.toggle-knob {
  position:absolute;top:3px;left:3px;
  width:20px;height:20px;border-radius:50%;
  background:#fff;transition:transform .2s;
}
.toggle-switch.on .toggle-knob { transform:translateX(22px); }
/* Timer segmented */
.timer-section {
  background:#1C1C2E;border-radius:14px;padding:14px 16px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
}
.timer-label-row {
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:12px;
}
.timer-title { font-size:15px;font-weight:700;color:#e6e0ee; }
.seg-control {
  display:flex;background:#141420;border-radius:10px;padding:3px;gap:3px;
}
.seg-btn {
  flex:1;height:36px;border:none;border-radius:8px;
  background:transparent;color:#948ea1;
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size:13px;font-weight:700;cursor:pointer;
  transition:background .15s,color .15s;
}
.seg-btn.active { background:#7C4DFF;color:#fff; }
/* Validation error */
.validation-msg {
  font-size:13px;color:#ffb4ab;text-align:center;
  min-height:20px;transition:opacity .2s;
}
/* Sticky bottom */
.setup-footer {
  position:fixed;bottom:0;left:0;right:0;
  padding:12px 20px calc(12px + env(safe-area-inset-bottom));
  background:linear-gradient(to top,#0A0A0F 80%,transparent);
  display:flex;flex-direction:column;gap:6px;
  z-index:10;
}
.setup-start-btn {
  width:100%;height:56px;border:none;border-radius:16px;
  background:linear-gradient(135deg,#7C4DFF 0%,#9C27B0 100%);
  color:#fff;font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size:18px;font-weight:900;letter-spacing:.02em;
  cursor:pointer;touch-action:manipulation;
  box-shadow:0 4px 24px rgba(124,77,255,.45);
  transition:opacity .15s,transform .15s;
  display:flex;align-items:center;justify-content:center;gap:10px;
}
.setup-start-btn:disabled { opacity:.4;cursor:not-allowed;box-shadow:none; }
.setup-start-btn:not(:disabled):active { transform:scale(.97); }
.btn-spinner {
  width:20px;height:20px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;
  animation:spin .7s linear infinite;display:none;
}
.setup-start-btn.loading .btn-spinner { display:block; }
.setup-start-btn.loading .btn-label { display:none; }
`;

function injectSetupStyles() {
  if (document.getElementById('setup-css')) return;
  const s = document.createElement('style');
  s.id = 'setup-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderSetup(router) {
  injectSetupStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  // Reset game state for fresh setup
  store.resetGame?.();

  // ── Local state ───────────────────────────────────────────────────────────
  let players = [
    { name: 'Player 1', color: AV_COLORS[0] },
    { name: 'Player 2', color: AV_COLORS[1] },
  ];
  let selectedCats  = new Set(['FRIENDLY']);
  let adultUnlocked = false;
  let timerSecs     = 30;
  let openPickerIdx = null; // which player row has color picker open

  app.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'setup-root';
  root.innerHTML = `
    <header class="setup-topbar">
      <button class="back-btn" id="back-btn" aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <h1 class="setup-title">Set Up Game</h1>
    </header>

    <div class="setup-body">
      <!-- Players -->
      <section>
        <p class="setup-section-label">Players (2–8)</p>
        <div class="player-list" id="player-list"></div>
        <button class="add-player-btn" id="add-player-btn" style="margin-top:8px">＋ Add Player</button>
      </section>

      <!-- Categories -->
      <section>
        <p class="setup-section-label">Card Categories</p>
        <div class="category-grid" id="cat-grid"></div>
      </section>

      <!-- 18+ toggle -->
      <div class="toggle-row">
        <div class="toggle-row-text">
          <span class="toggle-label">🔞 18+ Content</span>
          <span class="toggle-sub">Unlocks Couples & Dirty categories for adult groups</span>
        </div>
        <button class="toggle-switch" id="adult-toggle" role="switch" aria-checked="false">
          <div class="toggle-knob"></div>
        </button>
      </div>

      <!-- Timer -->
      <div class="timer-section">
        <div class="timer-label-row">
          <span class="timer-title">⏱ Dare Timer</span>
        </div>
        <div class="seg-control" id="seg-control">
          <button class="seg-btn active" data-secs="30">30s</button>
          <button class="seg-btn" data-secs="60">60s</button>
          <button class="seg-btn" data-secs="90">90s</button>
        </div>
      </div>
    </div>

    <!-- Sticky footer -->
    <div class="setup-footer">
      <p class="validation-msg" id="val-msg"></p>
      <button class="setup-start-btn" id="start-btn" disabled>
        <span class="btn-spinner"></span>
        <span class="btn-label">Start Game →</span>
      </button>
    </div>
  `;

  app.appendChild(root);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const playerListEl = root.querySelector('#player-list');
  const addBtn       = root.querySelector('#add-player-btn');
  const catGrid      = root.querySelector('#cat-grid');
  const adultToggle  = root.querySelector('#adult-toggle');
  const segControl   = root.querySelector('#seg-control');
  const startBtn     = root.querySelector('#start-btn');
  const valMsg       = root.querySelector('#val-msg');

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const names = players.map(p => p.name.trim());
    if (players.length < 2) { valMsg.textContent='Need at least 2 players'; startBtn.disabled=true; return; }
    if (names.some(n => !n)) { valMsg.textContent='All players need a name'; startBtn.disabled=true; return; }
    if (new Set(names).size !== names.length) { valMsg.textContent='Player names must be unique'; startBtn.disabled=true; return; }
    if (!selectedCats.size) { valMsg.textContent='Pick at least one category'; startBtn.disabled=true; return; }
    valMsg.textContent='';
    startBtn.disabled=false;
  }

  // ── Render player list ────────────────────────────────────────────────────
  function renderPlayers() {
    playerListEl.innerHTML = '';
    players.forEach((p, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'player-row-wrap';

      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `
        <div class="av-circle" data-i="${i}" style="background:${p.color}" title="Change color">
          ${p.name.trim() ? p.name.trim()[0].toUpperCase() : '?'}
        </div>
        <input class="player-input" type="text" value="${p.name}"
               placeholder="Player name" maxlength="20" aria-label="Player ${i+1} name" data-i="${i}">
        <button class="delete-btn" data-i="${i}" aria-label="Remove player" ${players.length<=2?'disabled':''}>×</button>
      `;

      // Color picker row
      const picker = document.createElement('div');
      picker.className = `color-picker${openPickerIdx===i?' open':''}`;
      picker.innerHTML = AV_COLORS.map((c, ci) =>
        `<div class="color-dot${p.color===c?' selected':''}" data-color="${c}" data-i="${i}" style="background:${c}" title="${c}"></div>`
      ).join('');

      // Bind avatar click → toggle picker
      row.querySelector('.av-circle').addEventListener('click', () => {
        haptic.light();
        openPickerIdx = openPickerIdx === i ? null : i;
        renderPlayers();
      });

      // Bind name input
      row.querySelector('.player-input').addEventListener('input', e => {
        players[i].name = e.target.value;
        // Update avatar initial without re-rendering all
        row.querySelector('.av-circle').textContent = e.target.value.trim() ? e.target.value.trim()[0].toUpperCase() : '?';
        validate();
      });

      // Bind delete
      const delBtn = row.querySelector('.delete-btn');
      if (players.length > 2) {
        delBtn.addEventListener('click', () => {
          haptic.light();
          players.splice(i, 1);
          if (openPickerIdx === i) openPickerIdx = null;
          else if (openPickerIdx > i) openPickerIdx--;
          renderPlayers();
          validate();
        });
      }

      // Bind color dots
      picker.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          haptic.light();
          players[i].color = dot.dataset.color;
          openPickerIdx = null;
          renderPlayers();
          validate();
        });
      });

      wrap.appendChild(row);
      wrap.appendChild(picker);
      playerListEl.appendChild(wrap);
    });

    addBtn.disabled = players.length >= 8;
    validate();
  }

  // ── Render category chips ─────────────────────────────────────────────────
  function renderCats() {
    catGrid.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const isLocked   = cat.adult && !adultUnlocked;
      const isSelected = selectedCats.has(cat.id) && !isLocked;
      const btn = document.createElement('button');
      btn.className = `cat-chip${isSelected ? ' selected' : ''}`;
      btn.disabled  = isLocked;
      btn.style.setProperty('color', cat.color);
      // A11y: full state for screen readers
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.setAttribute('aria-label',
        `${cat.label} category${isSelected ? ', selected' : ''}${isLocked ? ', locked \u2014 enable 18+ content first' : ''}`);
      btn.innerHTML = `
        <span class="cat-dot" style="background:${cat.color}" aria-hidden="true"></span>
        <span class="cat-name" style="color:#e6e0ee">${cat.label}</span>
        ${isLocked ? '<span class="cat-lock" aria-hidden="true">&#128274;</span>' : (isSelected ? '<span class="cat-lock" aria-hidden="true">&#10003;</span>' : '')}
      `;
      btn.addEventListener('click', () => {
        haptic.light();
        if (selectedCats.has(cat.id)) selectedCats.delete(cat.id);
        else selectedCats.add(cat.id);
        renderCats();
        validate();
      });
      catGrid.appendChild(btn);
    });
  }

  // ── Adult toggle ──────────────────────────────────────────────────────────
  adultToggle.addEventListener('click', () => {
    haptic.light();
    adultUnlocked = !adultUnlocked;
    store.isAdultUnlocked = adultUnlocked;
    adultToggle.classList.toggle('on', adultUnlocked);
    adultToggle.setAttribute('aria-checked', String(adultUnlocked));
    if (!adultUnlocked) {
      selectedCats.delete('COUPLES');
      selectedCats.delete('DIRTY');
    }
    renderCats();
    validate();
  });

  // ── Timer segmented control ───────────────────────────────────────────────
  segControl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic.light();
      timerSecs = +btn.dataset.secs;
      segControl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────
  root.querySelector('#back-btn').addEventListener('click', () => {
    haptic.light();
    router.back();
  });

  // ── Add player ────────────────────────────────────────────────────────────
  addBtn.addEventListener('click', () => {
    if (players.length >= 8) return;
    const colorIdx = players.length % AV_COLORS.length;
    players.push({ name: `Player ${players.length + 1}`, color: AV_COLORS[colorIdx] });
    haptic.light();
    renderPlayers();
  });

  // ── Start game ────────────────────────────────────────────────────────────
  startBtn.addEventListener('click', async () => {
    if (startBtn.disabled) return;
    haptic.medium();
    startBtn.classList.add('loading');
    startBtn.disabled = true;

    try {
      // Validate categories against known list (prevent injection)
      const VALID_CATS = new Set(['FRIENDLY','PARTY','COUPLES','DIRTY','CUSTOM']);
      const cats = [...selectedCats].filter(c => VALID_CATS.has(c));
      if (!cats.length) throw new Error('Pick at least one valid category');

      // Sanitize player names (strip HTML, enforce max 50 chars)
      const pNames = players.map(p => sanitizeName(p.name.trim()) || 'Player');

      // Final uniqueness check after sanitization
      if (new Set(pNames).size !== pNames.length) {
        throw new Error('Player names must be unique after sanitization');
      }

      const roomId = await createRoom(store.user.uid, pNames, cats);

      store.gameSession = {
        roomId,
        players:    pNames,
        playerColors: players.map(p => p.color),
        categories: cats,
        sessionId:  crypto.randomUUID(),
        timerSeconds: timerSecs,
        isAdult:    adultUnlocked,
      };

      router.navigate(`/game/${roomId}`);
    } catch (err) {
      console.error('[setup] createRoom failed:', err);
      haptic.error();
      showToast(err.message ?? 'Could not create room. Try again.', 'error');
      startBtn.classList.remove('loading');
      startBtn.disabled = false;
    }
  });

  // ── Initial render ────────────────────────────────────────────────────────
  renderPlayers();
  renderCats();
  validate();
}
