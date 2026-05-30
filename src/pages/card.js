// src/pages/card.js — Card reveal: 3D flip + dare timer + voting panel + end game
// Uses .card-scene/.card-inner/.card-face/.card-back from animations.css

import { store }       from '../store.js';
import { api }         from '../utils/api.js';
import { haptic, sound, showToast } from '../utils/feedback.js';
import { deleteRoom }  from '../firestore.js';
import { sanitizeName } from '../utils/security.js';

// ── Category metadata ────────────────────────────────────────────────────────
const CAT_META = {
  FRIENDLY: { emoji:'🤝', gradient:'linear-gradient(135deg,#1a2e24,#243b2c)', border:'#4CAF84', color:'#4CAF84' },
  PARTY:    { emoji:'🎉', gradient:'linear-gradient(135deg,#2a2614,#332e16)', border:'#F0C040', color:'#FFC107' },
  COUPLES:  { emoji:'💑', gradient:'linear-gradient(135deg,#2a1520,#361c28)', border:'#E878B8', color:'#E91E63' },
  DIRTY:    { emoji:'🔥', gradient:'linear-gradient(135deg,#2a1416,#36181a)', border:'#FF5060', color:'#F44336' },
  CUSTOM:   { emoji:'✨', gradient:'linear-gradient(135deg,#142028,#182a36)', border:'#50CCFF', color:'#00BCD4' },
};

// ── SVG timer constants ───────────────────────────────────────────────────────
const TIMER_R      = 52;
const TIMER_CIRCUM = 2 * Math.PI * TIMER_R; // ≈ 326.73

// ── Inject scoped styles ─────────────────────────────────────────────────────
const CSS = `
.cr-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  display: flex; flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  overflow: hidden; position: relative;
}
/* ── Top bar ── */
.cr-topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; position: relative;
}
.cr-player-chip {
  display: flex; align-items: center; gap: 8px;
}
.cr-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.2);
}
.cr-player-name { font-size: 15px; font-weight: 700; color: #e6e0ee; }
.cr-round-badge {
  position: absolute; left: 50%; transform: translateX(-50%);
  background: rgba(124,77,255,.2); border: 1px solid rgba(124,77,255,.4);
  border-radius: 999px; padding: 4px 12px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing:.1em; color: #cdbdff;
}
.cr-skip-btn {
  margin-left: auto; background: none; border: none; cursor: pointer;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing:.08em;
  color: #948ea1; padding: 8px 4px; touch-action: manipulation;
}
.cr-end-btn {
  position: absolute; right: 16px; top: 12px;
  background: rgba(244,67,54,.12); border: 1px solid rgba(244,67,54,.3);
  border-radius: 10px; padding: 6px 12px;
  font-size: 12px; font-weight: 700; color: #ff7675;
  cursor: pointer; font-family:'Hanken Grotesk',system-ui,sans-serif;
  touch-action: manipulation; z-index: 5;
  opacity: 0; pointer-events: none; transition: opacity .3s;
}
.cr-end-btn.visible { opacity: 1; pointer-events: all; }
/* ── Card area ── */
.cr-card-area {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 16px 24px; gap: 24px;
}
.cr-card-wrap {
  width: 100%; max-width: 320px;
  aspect-ratio: 0.65;
  cursor: pointer; touch-action: manipulation;
}
/* Override card-scene for our dimensions */
.cr-card-wrap .card-scene { perspective: 1000px; }
/* ── Card front ── */
.cr-front-inner {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: space-between;
  padding: 24px 20px; border-radius: 22px;
  border: 2px solid transparent;
  box-sizing: border-box;
}
.cr-front-emoji  { font-size: 72px; line-height: 1; }
.cr-front-hint   { font-style: italic; font-size: 16px; color: rgba(255,255,255,.5); }
.cr-diff-dots    { display: flex; gap: 6px; }
.cr-diff-dot     { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.2); }
.cr-diff-dot.on  { background: currentColor; }
/* Skeleton card */
.cr-skeleton-card {
  width: 100%; max-width: 320px; aspect-ratio: 0.65;
  border-radius: 22px;
  background: linear-gradient(90deg,#1C1C2E 25%,#2a2840 50%,#1C1C2E 75%);
  background-size: 800px 100%; animation: shimmer 1.4s ease infinite;
}
/* ── Card back ── */
.cr-back-inner {
  height: 100%; background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius: 22px; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 28px 22px; gap: 20px; box-sizing: border-box;
}
.cr-type-badge {
  padding: 5px 16px; border-radius: 999px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing:.1em;
}
.cr-type-truth { background: rgba(66,165,245,.2); color: #42A5F5; border: 1px solid rgba(66,165,245,.4); }
.cr-type-dare  { background: rgba(255,96,97,.2);  color: #FF6061; border: 1px solid rgba(255,96,97,.4); }
.cr-card-text {
  font-size: 22px; font-weight: 600; color: #fff; text-align: center;
  line-height: 1.45; letter-spacing: -.01em;
}
.cr-diff-stars { display: flex; gap: 4px; font-size: 14px; }
/* ── Dare timer ── */
.cr-timer-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  opacity: 0; pointer-events: none; transition: opacity .4s .2s;
}
.cr-timer-wrap.visible { opacity: 1; pointer-events: all; }
.cr-timer-svg { display: block; overflow: visible; }
.cr-timer-text {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 900; fill: #e6e0ee;
  dominant-baseline: central; text-anchor: middle;
}
.cr-timer-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing:.1em;
  color: #948ea1; text-transform: uppercase;
}
/* ── Voting panel ── */
.cr-vote-panel {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #141420; border-top: 1px solid rgba(255,255,255,.08);
  border-radius: 24px 24px 0 0; padding: 20px 20px calc(24px + env(safe-area-inset-bottom));
  z-index: 30; transform: translateY(110%);
  transition: transform .45s cubic-bezier(.34,1.2,.64,1);
  box-shadow: 0 -12px 48px rgba(0,0,0,.6);
}
.cr-vote-panel.visible { transform: translateY(0); }
.cr-vote-title {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 800; color: #e6e0ee;
  text-align: center; margin-bottom: 16px;
}
.cr-vote-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.cr-vote-btn {
  height: 64px; border-radius: 14px; border: 2px solid rgba(255,255,255,.12);
  background: #1C1C2E; cursor: pointer; touch-action: manipulation;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; transition: border-color .2s, background .2s;
}
.cr-vote-btn.done     { border-color: #4CAF84; background: rgba(76,175,132,.12); }
.cr-vote-btn.chickened{ border-color: #F44336; background: rgba(244,67,54,.12); }
.cr-vote-btn-name {
  font-size: 13px; font-weight: 700; color: #e6e0ee;
  font-family: 'Hanken Grotesk',system-ui,sans-serif;
}
.cr-vote-btn-status {
  font-size: 10px; font-weight: 700; letter-spacing:.08em;
  font-family: 'Space Grotesk',system-ui,sans-serif; color: #948ea1;
}
.cr-vote-btn.done      .cr-vote-btn-status { color: #4CAF84; }
.cr-vote-btn.chickened .cr-vote-btn-status { color: #F44336; }
.cr-truth-done-btn {
  width: 100%; height: 52px; border-radius: 14px;
  background: rgba(76,175,132,.15); border: 2px solid #4CAF84;
  color: #4CAF84; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; letter-spacing:.02em;
  cursor: pointer; touch-action: manipulation;
  transition: background .15s;
}
.cr-truth-done-btn:active { background: rgba(76,175,132,.3); }
.cr-submit-btn {
  width: 100%; height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg,#7C4DFF 0%,#9C27B0 100%);
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; letter-spacing:.02em;
  cursor: pointer; touch-action: manipulation;
  box-shadow: 0 4px 20px rgba(124,77,255,.4);
  transition: opacity .15s; display: flex; align-items: center;
  justify-content: center;
}
.cr-submit-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.cr-submit-btn:not(:disabled):active { opacity: .85; }
/* ── End Game bottom sheet ── */
.cr-end-sheet {
  position: fixed; inset: 0; background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px); z-index: 50;
  display: flex; align-items: flex-end;
  opacity: 0; pointer-events: none; transition: opacity .25s;
}
.cr-end-sheet.visible { opacity: 1; pointer-events: all; }
.cr-end-sheet-inner {
  width: 100%; background: #141420;
  border-radius: 24px 24px 0 0; padding: 28px 24px calc(28px + env(safe-area-inset-bottom));
  transform: translateY(40px); transition: transform .3s cubic-bezier(.34,1.2,.64,1);
}
.cr-end-sheet.visible .cr-end-sheet-inner { transform: translateY(0); }
.cr-end-sheet-title {
  font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; color:#e6e0ee; margin-bottom:8px; text-align:center;
}
.cr-end-sheet-sub { font-size: 14px; color: #948ea1; text-align: center; margin-bottom: 24px; }
.cr-end-confirm-btn {
  width: 100%; height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg,#F44336,#c62828);
  color: #fff; font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; cursor: pointer; margin-bottom: 10px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
}
.cr-end-cancel-btn {
  width: 100%; height: 48px; border-radius: 14px;
  background: transparent; border: 1.5px solid rgba(255,255,255,.12);
  color: #948ea1; font-family:'Hanken Grotesk',system-ui,sans-serif;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
.cr-btn-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff;
  animation: spin .7s linear infinite; display: none;
}
.cr-end-confirm-btn.loading .cr-btn-spinner { display: block; }
.cr-end-confirm-btn.loading .cr-btn-label { display: none; }
`;

function injectStyles() {
  if (document.getElementById('cr-css')) return;
  const s = document.createElement('style');
  s.id = 'cr-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function difficultyDots(difficulty = 1, color = '#cdbdff', type = 'dot') {
  return [1,2,3,4,5].map(i => {
    if (type === 'star') return i <= difficulty ? `<span style="color:${color}">★</span>` : `<span style="opacity:.25">★</span>`;
    return `<span class="cr-diff-dot${i <= difficulty ? ' on' : ''}" style="${i <= difficulty ? `color:${color}` : ''}"></span>`;
  }).join('');
}

function getPlayerColor(idx) {
  const COLORS = ['#7C4DFF','#FF4081','#00BCD4','#4CAF84','#FFC107','#FF5722','#9C27B0','#00E5FF'];
  return COLORS[idx % COLORS.length];
}

// ── SVG Timer ─────────────────────────────────────────────────────────────────
function buildTimerSVG(secs, total) {
  const pct     = secs / total;
  const offset  = TIMER_CIRCUM * (1 - (1 - pct)); // offset when elapsed = total - secs
  const elapsed = total - secs;
  const elPct   = elapsed / total;
  const arcColor = elPct < 0.4 ? '#4CAF84' : elPct < 0.8 ? '#FFC107' : '#F44336';
  const arcOffset = TIMER_CIRCUM * elPct;

  return `
    <svg class="cr-timer-svg" width="120" height="120" viewBox="0 0 120 120">
      <!-- track -->
      <circle cx="60" cy="60" r="${TIMER_R}" fill="none"
        stroke="rgba(255,255,255,.1)" stroke-width="6"/>
      <!-- arc — rotate -90 so it starts from 12 o'clock -->
      <circle id="cr-arc" cx="60" cy="60" r="${TIMER_R}" fill="none"
        stroke="${arcColor}" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${TIMER_CIRCUM}" stroke-dashoffset="${arcOffset}"
        transform="rotate(-90 60 60)"
        style="transition:stroke-dashoffset .9s linear,stroke .5s"/>
      <text class="cr-timer-text" x="60" y="60" id="cr-timer-text">${secs}</text>
    </svg>
  `;
}

// ── Main render ───────────────────────────────────────────────────────────────
export default async function renderCard(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  const session = store.gameSession;
  if (!session) { router.navigate('/setup', true); return; }

  const { roomId, players, playerColors, categories, sessionId, timerSeconds = 30, isAdult = false } = session;
  const roundNum      = (store.roundResults?.length ?? 0) + 1;
  const activePlayer  = sanitizeName(store.currentPlayerName ?? players[0]);
  const activeIdx     = players.indexOf(store.currentPlayerName ?? players[0]);
  const activeColor   = playerColors?.[activeIdx] ?? getPlayerColor(activeIdx);
  const cardType      = store.currentCardType ?? 'TRUTH'; // TRUTH | DARE

  app.innerHTML = '';

  // ── Build DOM ─────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'cr-root';

  root.innerHTML = `
    <!-- Top bar -->
    <header class="cr-topbar">
      <div class="cr-player-chip">
        <div class="cr-avatar" id="cr-avatar" style="background:${activeColor}">
        </div>
        <span class="cr-player-name" id="cr-player-name-el"></span>
      </div>
      <span class="cr-round-badge">Round ${roundNum}</span>
      <button class="cr-skip-btn" id="cr-skip">SKIP</button>
    </header>

    <!-- End Game button (shown after 3 rounds) -->
    <button class="cr-end-btn${roundNum > 3 ? ' visible' : ''}" id="cr-end-btn">End Game</button>

    <!-- Card area -->
    <div class="cr-card-area" id="cr-card-area">
      <!-- Skeleton shown while loading -->
      <div class="cr-skeleton-card" id="cr-skeleton"></div>
    </div>

    <!-- Dare timer (hidden for TRUTH) -->
    <div class="cr-timer-wrap" id="cr-timer-wrap">
      ${buildTimerSVG(timerSeconds, timerSeconds)}
      <span class="cr-timer-label">Dare Timer</span>
    </div>

    <!-- Voting panel -->
    <div class="cr-vote-panel" id="cr-vote-panel" role="dialog" aria-label="Vote on result">
      <p class="cr-vote-title" id="cr-vote-title">Did they do it?</p>
      <div id="cr-vote-content"></div>
    </div>

    <!-- End game bottom sheet -->
    <div class="cr-end-sheet" id="cr-end-sheet" role="dialog" aria-modal="true">
      <div class="cr-end-sheet-inner">
        <h2 class="cr-end-sheet-title">End the Game?</h2>
        <p class="cr-end-sheet-sub">This will save your session and show results.<br>${roundNum - 1} round${roundNum !== 2 ? 's' : ''} played.</p>
        <button class="cr-end-confirm-btn" id="cr-end-confirm">
          <span class="cr-btn-spinner"></span>
          <span class="cr-btn-label">Yes, End Game 🏁</span>
        </button>
        <button class="cr-end-cancel-btn" id="cr-end-cancel">Not yet</button>
      </div>
    </div>
  `;

  app.appendChild(root);

  // Set player avatar initial + name via textContent (not innerHTML)
  const avatarEl = root.querySelector('#cr-avatar');
  const nameEl   = root.querySelector('#cr-player-name-el');
  if (avatarEl) avatarEl.textContent = (activePlayer?.[0] ?? '?').toUpperCase();
  if (nameEl)   nameEl.textContent   = activePlayer;

  // ── State ─────────────────────────────────────────────────────────────────
  let card       = null;
  let flipped    = false;
  let timerVal   = timerSeconds;
  let timerInt   = null;
  let startTime  = null;
  const votes    = new Map(); // playerName → 'done'|'chickened'
  let aborted    = false;

  // ── Load card ─────────────────────────────────────────────────────────────
  async function loadCard() {
    try {
      card = await api.getRandomCard(sessionId, categories, isAdult);
      store.currentCard = card;
    } catch (err) {
      console.error('[card] load error:', err);
      // Fallback card if API fails
      card = {
        id: `fallback-${Date.now()}`,
        text: cardType === 'TRUTH'
          ? 'What is the most embarrassing thing you have ever done?'
          : 'Do 20 jumping jacks right now!',
        type: cardType,
        category: categories[0] ?? 'FRIENDLY',
        difficulty: 2,
      };
    }

    if (aborted) return;

    // Remove skeleton, mount card
    const skeleton = root.querySelector('#cr-skeleton');
    skeleton?.remove();

    mountCard();
  }

  // ── Mount card DOM ────────────────────────────────────────────────────────
  function mountCard() {
    const meta  = CAT_META[card.category] ?? CAT_META.FRIENDLY;
    const isTruth = card.type === 'TRUTH';
    const area  = root.querySelector('#cr-card-area');

    const wrap  = document.createElement('div');
    wrap.className = 'cr-card-wrap animate-scale-in';

    // Card category label — textContent (not interpolated into innerHTML)
    const catLabelEl = document.createElement('div');
    catLabelEl.style.cssText = `opacity:.3;font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;color:${meta.color}`;
    catLabelEl.textContent = card.category;

    wrap.innerHTML = `
      <div class="card-scene">
        <div class="card-inner" id="cr-card-inner">
          <!-- FRONT -->
          <div class="card-face card-front">
            <div class="cr-front-inner"
                 style="background:${meta.gradient};border-color:${meta.border}">
              <div id="cr-cat-label-slot"></div>
              <div class="cr-front-emoji">${meta.emoji}</div>
              <div class="cr-front-hint">Tap to reveal</div>
              <div class="cr-diff-dots" style="color:${meta.color}">
                ${difficultyDots(card.difficulty, meta.color)}
              </div>
            </div>
          </div>
          <!-- BACK -->
          <div class="card-face card-back">
            <div class="cr-back-inner">
              <span class="cr-type-badge ${isTruth ? 'cr-type-truth' : 'cr-type-dare'}">
                ${isTruth ? '💬 TRUTH' : '🔥 DARE'}
              </span>
              <p class="cr-card-text" id="cr-card-text-el"></p>
              <div class="cr-diff-stars">
                ${difficultyDots(card.difficulty, meta.color, 'star')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inject category label and card text safely via textContent
    const catSlot = wrap.querySelector('#cr-cat-label-slot');
    if (catSlot) catSlot.appendChild(catLabelEl);
    const cardTextEl = wrap.querySelector('#cr-card-text-el');
    if (cardTextEl) cardTextEl.textContent = card.text ?? '';

    area.appendChild(wrap);

    // Tap → flip
    wrap.addEventListener('click', () => {
      if (flipped) return;
      flipped = true;
      wrap.querySelector('#cr-card-inner').classList.add('flipped');
      sound.flip();
      haptic.medium();

      // After flip: show timer (DARE) or vote panel (TRUTH)
      setTimeout(() => {
        if (isTruth) {
          showTruthPanel();
        } else {
          showDareTimer();
        }
      }, 520);
    });
  }

  // ── TRUTH panel ───────────────────────────────────────────────────────────
  function showTruthPanel() {
    const content = root.querySelector('#cr-vote-content');
    const panel   = root.querySelector('#cr-vote-panel');
    const title   = root.querySelector('#cr-vote-title');

    title.textContent = 'Did they answer?';
    content.innerHTML = `
      <button class="cr-truth-done-btn" id="cr-truth-done">
        ✅ Answered
      </button>
      <div style="height:10px"></div>
      <button class="cr-truth-done-btn" id="cr-truth-chickened"
        style="background:rgba(244,67,54,.12);border-color:#F44336;color:#F44336">
        🐔 Chickened Out
      </button>
    `;
    panel.classList.add('visible');

    root.querySelector('#cr-truth-done').addEventListener('click', () => {
      finishRound('done', 0);
    });
    root.querySelector('#cr-truth-chickened').addEventListener('click', () => {
      finishRound('chickened', 0);
    });
  }

  // ── Dare timer ────────────────────────────────────────────────────────────
  function showDareTimer() {
    const timerWrap = root.querySelector('#cr-timer-wrap');
    timerWrap.classList.add('visible');
    startTime = Date.now();

    timerInt = setInterval(() => {
      timerVal--;

      // Update SVG arc
      const arc  = timerWrap.querySelector('#cr-arc');
      const text = timerWrap.querySelector('#cr-timer-text');
      const elapsed = timerSeconds - timerVal;
      const elPct   = elapsed / timerSeconds;

      if (arc) {
        arc.style.strokeDashoffset = String(TIMER_CIRCUM * elPct);
        arc.style.stroke = elPct < 0.4 ? '#4CAF84' : elPct < 0.8 ? '#FFC107' : '#F44336';
      }
      if (text) text.textContent = String(Math.max(0, timerVal));

      // Haptic milestones
      if (timerVal === 10) haptic.medium();
      if (timerVal === 3)  haptic.heavy();

      if (timerVal <= 0) {
        clearInterval(timerInt); timerInt = null;
        haptic.error(); sound.ding();
        showDareVoting();
      }
    }, 1000);
  }

  // ── Dare voting panel ─────────────────────────────────────────────────────
  function showDareVoting() {
    const content = root.querySelector('#cr-vote-content');
    const panel   = root.querySelector('#cr-vote-panel');
    const title   = root.querySelector('#cr-vote-title');
    const elapsed = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);

    title.textContent = 'Did they complete the dare?';

    // All players except active player vote
    const voters = players.filter(n => n !== activePlayer);

    function renderVotes() {
      const doneCount     = [...votes.values()].filter(v => v === 'done').length;
      const chickenCount  = [...votes.values()].filter(v => v === 'chickened').length;
      const allVoted      = votes.size === voters.length;

      content.innerHTML = `
        <div class="cr-vote-grid">
          ${voters.map((name, i) => {
            const state = votes.get(name);
            return `<button class="cr-vote-btn${state ? ' ' + state : ''}" data-name="${name}">
              <div style="font-size:18px">${state === 'done' ? '✅' : state === 'chickened' ? '🐔' : '👆'}</div>
              <span class="cr-vote-btn-name">${name.split(' ')[0]}</span>
              <span class="cr-vote-btn-status">${state ? state.toUpperCase() : 'TAP TO VOTE'}</span>
            </button>`;
          }).join('')}
        </div>
        <button class="cr-submit-btn" id="cr-submit" ${!allVoted ? 'disabled' : ''}>
          Submit Votes (${doneCount}✅ ${chickenCount}🐔)
        </button>
      `;

      // Bind vote buttons
      content.querySelectorAll('.cr-vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.name;
          const cur  = votes.get(name);
          votes.set(name, cur === 'done' ? 'chickened' : 'done');
          haptic.light();
          renderVotes();
        });
      });

      // Submit
      content.querySelector('#cr-submit')?.addEventListener('click', () => {
        const doneCount = [...votes.values()].filter(v => v === 'done').length;
        const result    = doneCount >= Math.ceil(voters.length / 2) ? 'done' : 'chickened';
        if (result === 'done') sound.ding();
        else sound.error();
        finishRound(result, elapsed);
      });
    }

    panel.classList.add('visible');
    renderVotes();
  }

  // ── Finish round ──────────────────────────────────────────────────────────
  function finishRound(result, duration) {
    if (!card) return;
    // Record result
    if (!store.roundResults) store.roundResults = [];
    store.roundResults.push({
      playerName: activePlayer,
      cardText:   card.text,
      cardType:   card.type,
      category:   card.category,
      difficulty: card.difficulty,
      result,
      duration,
    });
    store.usedCardIds?.add?.(card.id);

    // Show End Game button after round 3
    if (store.roundResults.length >= 3) {
      root.querySelector('#cr-end-btn')?.classList.add('visible');
    }

    // Back to finger picker
    if (roomId) router.navigate(`/game/${roomId}`);
    else        router.navigate('/game');
  }

  // ── Skip card ─────────────────────────────────────────────────────────────
  root.querySelector('#cr-skip').addEventListener('click', () => {
    if (card) store.usedCardIds?.add?.(card.id);
    if (roomId) router.navigate(`/game/${roomId}`);
    else        router.navigate('/game');
  });

  // ── End Game flow ─────────────────────────────────────────────────────────
  root.querySelector('#cr-end-btn').addEventListener('click', () => {
    root.querySelector('#cr-end-sheet').classList.add('visible');
  });
  root.querySelector('#cr-end-cancel').addEventListener('click', () => {
    root.querySelector('#cr-end-sheet').classList.remove('visible');
  });

  root.querySelector('#cr-end-confirm').addEventListener('click', async () => {
    const confirmBtn = root.querySelector('#cr-end-confirm');
    confirmBtn.classList.add('loading');
    confirmBtn.disabled = true;

    try {
      const results = store.roundResults ?? [];
      await api.saveSession({
        sessionId,
        players,
        categories,
        totalRounds:  results.length,
        playerCount:  players.length,
        rounds: results.map(r => ({
          player_name: r.playerName,
          card_text:   r.cardText,
          card_type:   r.cardType,
          category:    r.category,
          result:      r.result,
          duration:    r.duration,
        })),
      });

      if (roomId) await deleteRoom(roomId).catch(() => {});

      router.navigate(`/result/${sessionId}`, true);
    } catch (err) {
      console.error('[card] save session error:', err);
      showToast(err.message ?? 'Could not save game. Try again.', 'error');
      confirmBtn.classList.remove('loading');
      confirmBtn.disabled = false;
    }
  });

  // ── Start loading card ────────────────────────────────────────────────────
  loadCard();

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    aborted = true;
    if (timerInt) clearInterval(timerInt);
  };
}
