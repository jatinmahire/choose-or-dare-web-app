// src/pages/cards.js — Custom card creator + QR export/import
// api: saveCustomCard, getCustomCards, deleteCustomCard
// packages: qrcode (QR generation), jsqr (camera scan decode)

import QRCode           from 'qrcode';
import jsQR             from 'jsqr';
import { store }        from '../store.js';
import { api }          from '../utils/api.js';
import { sanitizeCard, escapeHtml } from '../utils/security.js';
import { haptic, showToast }        from '../utils/feedback.js';
import { mountBottomNav }           from './home.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_CHARS  = 150;
const MIN_CHARS  = 10;

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
/* ── Root ── */
.cc-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
/* ── Top bar ── */
.cc-topbar {
  padding: 14px 20px 6px;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; letter-spacing:-.03em; color:#e6e0ee;
}
/* ── Section label ── */
.cc-section-label {
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing:.12em;
  color: #948ea1; text-transform: uppercase; margin-bottom: 12px;
}
/* ── Card preview ── */
.cc-preview-area {
  display: flex; justify-content: center;
  padding: 16px 24px 8px; perspective: 900px;
}
.cc-preview-scene {
  width: 160px; height: 246px;
  perspective: 900px;
}
.cc-preview-inner {
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 480ms cubic-bezier(.4,0,.2,1);
  will-change: transform; position: relative;
}
.cc-preview-inner.flipped { transform: rotateY(180deg); }
.cc-preview-face {
  position: absolute; inset: 0;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  border-radius: 14px; overflow: hidden;
}
.cc-preview-back { transform: rotateY(180deg); }
.cc-preview-front {
  display: flex; flex-direction: column; align-items: center;
  justify-content: space-between; padding: 14px 12px;
  background: linear-gradient(135deg,#1a2e24,#243b2c);
  border: 1.5px solid #4CAF84; box-sizing: border-box;
}
.cc-preview-back-inner {
  background: #1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  padding: 14px 12px; box-sizing: border-box;
}
.cc-prev-type-badge {
  padding: 3px 10px; border-radius: 999px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing:.1em;
}
.cc-prev-truth { background:rgba(66,165,245,.2); color:#42A5F5; border:1px solid rgba(66,165,245,.4); }
.cc-prev-dare  { background:rgba(255,96,97,.2);  color:#FF6061; border:1px solid rgba(255,96,97,.4); }
.cc-prev-text {
  font-size: 12px; font-weight: 600; color: #fff; text-align: center;
  line-height: 1.45; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical;
}
.cc-prev-placeholder { font-style: italic; color: #494455; font-size: 12px; }
/* ── Form ── */
.cc-form { padding: 0 20px; }
/* Segmented toggle */
.cc-seg {
  display: flex; background: #141420; border-radius: 12px; padding: 3px; gap: 3px;
  margin-bottom: 16px;
}
.cc-seg-btn {
  flex: 1; height: 40px; border: none; border-radius: 9px;
  background: transparent; cursor: pointer; touch-action: manipulation;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing:.06em;
  color: #948ea1; transition: background .15s, color .15s;
}
.cc-seg-btn.active-truth { background: rgba(66,165,245,.25); color: #42A5F5; }
.cc-seg-btn.active-dare  { background: rgba(255,96,97,.25);  color: #FF6061; }
/* Textarea */
.cc-textarea-wrap { position: relative; margin-bottom: 8px; }
.cc-textarea {
  width: 100%; min-height: 88px; resize: none;
  background: #1C1C2E; border: 1.5px solid rgba(255,255,255,.1);
  border-radius: 14px; padding: 14px 14px 28px; box-sizing: border-box;
  color: #e6e0ee; font-size: 15px; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  outline: none; transition: border-color .2s; line-height: 1.5;
}
.cc-textarea:focus { border-color: rgba(124,77,255,.6); }
.cc-textarea::placeholder { color: #494455; }
.cc-char-counter {
  position: absolute; bottom: 8px; right: 12px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; color: #494455; letter-spacing:.04em;
  pointer-events: none;
}
.cc-char-counter.near { color: #FFD740; }
.cc-char-counter.over { color: #FF5252; }
/* Difficulty stars */
.cc-diff-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
}
.cc-diff-label { font-size: 13px; font-weight: 600; color: #948ea1; flex: 1; }
.cc-star-btn {
  background: none; border: none; cursor: pointer; font-size: 24px;
  padding: 4px; line-height: 1; touch-action: manipulation;
  transition: transform .12s;
}
.cc-star-btn:active { transform: scale(.85); }
/* Adult toggle */
.cc-adult-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #1C1C2E; border-radius: 14px; padding: 12px 16px;
  margin-bottom: 16px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.cc-adult-label { font-size: 14px; font-weight: 600; color: #e6e0ee; }
.cc-adult-sub   { font-size: 11px; color: #948ea1; }
.cc-toggle {
  width: 44px; height: 24px; border-radius: 12px;
  background: #2a2840; border: none; cursor: pointer; position: relative;
  transition: background .2s; flex-shrink: 0;
}
.cc-toggle.on { background: #7C4DFF; }
.cc-toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: #fff;
  transition: transform .2s;
}
.cc-toggle.on .cc-toggle-knob { transform: translateX(20px); }
/* Save button */
.cc-save-btn {
  width: 100%; height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg,#7C4DFF,#9C27B0);
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; cursor: pointer;
  box-shadow: 0 4px 20px rgba(124,77,255,.4); touch-action: manipulation;
  transition: opacity .15s; display: flex; align-items: center;
  justify-content: center; gap: 8px; margin-bottom: 28px;
}
.cc-save-btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
.cc-save-btn:not(:disabled):active { opacity: .85; }
/* ── My Cards list ── */
.cc-list-section { padding: 0 20px; }
.cc-card-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: #1C1C2E; border-radius: 14px; padding: 12px 14px;
  margin-bottom: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  transition: background .15s;
  animation: cc-slide-in .3s cubic-bezier(.22,1,.36,1) both;
}
@keyframes cc-slide-in {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.cc-item-badge {
  flex-shrink: 0; padding: 3px 8px; border-radius: 999px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: .1em; margin-top: 2px;
}
.cc-item-truth { background:rgba(66,165,245,.15); color:#42A5F5; border:1px solid rgba(66,165,245,.3); }
.cc-item-dare  { background:rgba(255,96,97,.15);  color:#FF6061; border:1px solid rgba(255,96,97,.3);  }
.cc-item-text {
  flex: 1; font-size: 13px; color: #cac3d8; line-height: 1.45;
  overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.cc-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.cc-item-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: rgba(255,255,255,.06); cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s; touch-action: manipulation;
}
.cc-item-btn.del:active { background: rgba(244,67,54,.2); }
.cc-item-btn.edit:active { background: rgba(124,77,255,.2); }
/* ── QR section ── */
.cc-qr-section { padding: 0 20px 20px; }
.cc-qr-row { display: flex; gap: 10px; }
.cc-qr-btn {
  flex: 1; height: 48px; border-radius: 14px; border: none; cursor: pointer;
  font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 14px; font-weight: 700; touch-action: manipulation;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: opacity .15s;
}
.cc-qr-btn:active { opacity: .8; }
.cc-qr-export {
  background: rgba(124,77,255,.15); border: 1.5px solid rgba(124,77,255,.4);
  color: #cdbdff;
}
.cc-qr-scan {
  background: rgba(0,188,212,.12); border: 1.5px solid rgba(0,188,212,.4);
  color: #00BCD4;
}
/* ── Bottom sheets ── */
.cc-sheet-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px); z-index: 50;
  display: flex; align-items: flex-end;
  opacity: 0; pointer-events: none; transition: opacity .25s;
}
.cc-sheet-overlay.visible { opacity: 1; pointer-events: all; }
.cc-sheet {
  width: 100%; background: #141420;
  border-radius: 24px 24px 0 0; padding: 24px 20px calc(28px + env(safe-area-inset-bottom));
  transform: translateY(40px); transition: transform .3s cubic-bezier(.34,1.2,.64,1);
  max-height: 90dvh; overflow-y: auto;
}
.cc-sheet-overlay.visible .cc-sheet { transform: translateY(0); }
.cc-sheet-title {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 20px; font-weight: 800; color: #e6e0ee;
  text-align: center; margin-bottom: 16px;
}
.cc-sheet-close {
  position: absolute; top: 16px; right: 20px;
  background: none; border: none; font-size: 22px; cursor: pointer; color: #948ea1;
}
/* QR canvas */
.cc-qr-canvas-wrap {
  display: flex; justify-content: center; margin-bottom: 16px;
}
.cc-qr-canvas {
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 0 24px rgba(124,77,255,.4);
}
.cc-share-btn {
  width: 100%; height: 48px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(124,77,255,.15); border: 1.5px solid rgba(124,77,255,.4);
  color: #cdbdff; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 14px; font-weight: 700;
}
/* Scanner */
.cc-scanner-video {
  width: 100%; border-radius: 12px; background: #000;
  max-height: 280px; object-fit: cover; display: block;
  margin-bottom: 12px;
}
.cc-scan-frame {
  position: relative; display: inline-block; width: 100%;
  margin-bottom: 12px;
}
.cc-scan-overlay {
  position: absolute; inset: 0; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
}
.cc-scan-box {
  width: 160px; height: 160px; border: 2px solid #7C4DFF;
  border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,.5);
}
.cc-scan-hint {
  text-align: center; font-size: 13px; color: #948ea1; margin-bottom: 12px;
}
.cc-scan-result {
  background: rgba(124,77,255,.1); border: 1px solid rgba(124,77,255,.3);
  border-radius: 12px; padding: 12px; margin-bottom: 12px; display: none;
}
.cc-scan-result.visible { display: block; }
.cc-scan-import-btn {
  width: 100%; height: 48px; border-radius: 12px; border: none; cursor: pointer;
  background: linear-gradient(135deg,#7C4DFF,#9C27B0);
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 16px; font-weight: 900;
}
/* Empty state */
.cc-empty {
  text-align: center; padding: 32px 0;
  font-size: 14px; color: #494455; line-height: 1.6;
}
/* Confirm delete overlay */
.cc-confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7);
  backdrop-filter: blur(6px); z-index: 60;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  opacity: 0; pointer-events: none; transition: opacity .2s;
}
.cc-confirm-overlay.visible { opacity: 1; pointer-events: all; }
.cc-confirm-box {
  background: #141420; border-radius: 20px; padding: 24px; width: 100%; max-width: 320px;
  box-shadow: 0 8px 48px rgba(0,0,0,.8); text-align: center;
  border: 1px solid rgba(255,255,255,.08);
}
.cc-confirm-title { font-family:'Bricolage Grotesque',system-ui,sans-serif; font-size:20px; font-weight:800; margin-bottom:8px; }
.cc-confirm-sub { font-size:14px; color:#948ea1; margin-bottom:20px; line-height:1.5; }
.cc-confirm-del { width:100%;height:46px;border:none;border-radius:12px;
  background:#F44336;color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px; }
.cc-confirm-cancel { width:100%;height:44px;border:1.5px solid rgba(255,255,255,.12);
  background:transparent;border-radius:12px;color:#948ea1;font-size:14px;cursor:pointer; }
`;

function injectStyles() {
  if (document.getElementById('cc-css')) return;
  const s = document.createElement('style'); s.id = 'cc-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderCards(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'cc-root';

  root.innerHTML = `
    <h1 class="cc-topbar">Custom Cards</h1>

    <!-- Live card preview -->
    <div class="cc-preview-area">
      <div class="cc-preview-scene">
        <div class="cc-preview-inner" id="cc-prev-inner">
          <!-- Front (blank) -->
          <div class="cc-preview-face cc-preview-front" id="cc-prev-front">
            <span style="opacity:.3;font-size:9px;font-family:'Space Grotesk',system-ui;font-weight:700;letter-spacing:.12em;color:#4CAF84">CUSTOM</span>
            <span style="font-size:36px">✨</span>
            <span class="cc-prev-placeholder">Type below</span>
            <div style="display:flex;gap:4px">${[1,2,3,4,5].map(() => `<span style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.15)"></span>`).join('')}</div>
          </div>
          <!-- Back (text preview) -->
          <div class="cc-preview-face cc-preview-back">
            <div class="cc-preview-back-inner">
              <span class="cc-prev-type-badge cc-prev-truth" id="cc-prev-badge">💬 TRUTH</span>
              <p class="cc-prev-text" id="cc-prev-text">Your card text will appear here…</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Creator form -->
    <div class="cc-form">
      <p class="cc-section-label">Create a Card</p>

      <!-- TRUTH / DARE segmented -->
      <div class="cc-seg">
        <button class="cc-seg-btn active-truth" data-type="TRUTH" id="seg-truth">💬 TRUTH</button>
        <button class="cc-seg-btn" data-type="DARE"  id="seg-dare">🔥 DARE</button>
      </div>

      <!-- Textarea + char counter -->
      <div class="cc-textarea-wrap">
        <textarea class="cc-textarea" id="cc-textarea"
          placeholder="Write a truth or dare question… (min 10, max 150 chars)"
          maxlength="${MAX_CHARS}" rows="3"></textarea>
        <span class="cc-char-counter" id="cc-counter">0/${MAX_CHARS}</span>
      </div>

      <!-- Difficulty stars -->
      <div class="cc-diff-row">
        <span class="cc-diff-label">Difficulty</span>
        <div id="cc-stars">
          ${[1,2,3,4,5].map(n => `
            <button class="cc-star-btn" data-star="${n}" aria-label="Difficulty ${n}">★</button>
          `).join('')}
        </div>
      </div>

      <!-- Adult toggle (only when unlocked) -->
      ${store.isAdultUnlocked ? `
        <div class="cc-adult-row">
          <div>
            <div class="cc-adult-label">🔞 Adult Only</div>
            <div class="cc-adult-sub">Only shown in 18+ sessions</div>
          </div>
          <button class="cc-toggle" id="cc-adult-toggle" role="switch" aria-checked="false">
            <div class="cc-toggle-knob"></div>
          </button>
        </div>` : ''}

      <!-- Save button -->
      <button class="cc-save-btn" id="cc-save-btn" disabled>
        <span id="cc-save-label">Save Card ✨</span>
      </button>
    </div>

    <!-- My Cards -->
    <div class="cc-list-section">
      <p class="cc-section-label">My Cards</p>
      <div id="cc-card-list"><div class="cc-empty">Loading your cards…</div></div>
    </div>

    <!-- QR share section -->
    <div class="cc-qr-section" style="margin-top:8px">
      <p class="cc-section-label">Share Cards</p>
      <div class="cc-qr-row">
        <button class="cc-qr-btn cc-qr-export" id="cc-qr-export">
          📤 Generate QR
        </button>
        <button class="cc-qr-btn cc-qr-scan" id="cc-qr-scan">
          📷 Scan to Import
        </button>
      </div>
    </div>

    <!-- QR Export Sheet -->
    <div class="cc-sheet-overlay" id="cc-qr-sheet" role="dialog" aria-modal="true">
      <div class="cc-sheet" style="position:relative">
        <button class="cc-sheet-close" id="cc-qr-close">✕</button>
        <h2 class="cc-sheet-title">Share Your Cards</h2>
        <div class="cc-qr-canvas-wrap">
          <canvas class="cc-qr-canvas" id="cc-qr-canvas" width="260" height="260"></canvas>
        </div>
        <p style="text-align:center;font-size:12px;color:#948ea1;margin-bottom:16px">
          Scan this QR with another device to import your custom cards
        </p>
        <button class="cc-share-btn" id="cc-share-btn">Share JSON</button>
      </div>
    </div>

    <!-- Scanner Sheet -->
    <div class="cc-sheet-overlay" id="cc-scan-sheet" role="dialog" aria-modal="true">
      <div class="cc-sheet" style="position:relative">
        <button class="cc-sheet-close" id="cc-scan-close">✕</button>
        <h2 class="cc-sheet-title">Scan Card Pack</h2>
        <div class="cc-scan-frame">
          <video class="cc-scanner-video" id="cc-scan-video" autoplay playsinline muted></video>
          <div class="cc-scan-overlay">
            <div class="cc-scan-box"></div>
          </div>
        </div>
        <p class="cc-scan-hint">Point at a Choose or Dare QR code</p>
        <div class="cc-scan-result" id="cc-scan-result">
          <p id="cc-scan-summary" style="font-size:14px;color:#cdbdff;font-weight:700;margin:0 0 8px"></p>
          <div id="cc-scan-preview" style="font-size:12px;color:#948ea1;line-height:1.6"></div>
        </div>
        <button class="cc-scan-import-btn" id="cc-scan-import-btn" style="display:none">
          Import Cards →
        </button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div class="cc-confirm-overlay" id="cc-confirm-overlay">
      <div class="cc-confirm-box">
        <h3 class="cc-confirm-title">Delete Card?</h3>
        <p class="cc-confirm-sub">This card will be permanently removed from your collection.</p>
        <button class="cc-confirm-del" id="cc-confirm-del">Delete</button>
        <button class="cc-confirm-cancel" id="cc-confirm-cancel">Keep it</button>
      </div>
    </div>
  `;

  app.appendChild(root);
  mountBottomNav(router, 'stats');

  // ── State ─────────────────────────────────────────────────────────────────
  let cardType   = 'TRUTH';
  let difficulty = 3;
  let isAdult    = false;
  let editingId  = null;       // card id being edited (null = create mode)
  let customCards = [];
  let pendingDeleteId = null;
  let scanStream  = null;
  let scanRaf     = null;
  let scannedData = null;      // parsed QR data

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const prevInner  = root.querySelector('#cc-prev-inner');
  const prevBadge  = root.querySelector('#cc-prev-badge');
  const prevText   = root.querySelector('#cc-prev-text');
  const textarea   = root.querySelector('#cc-textarea');
  const counter    = root.querySelector('#cc-counter');
  const saveBtn    = root.querySelector('#cc-save-btn');
  const saveLabel  = root.querySelector('#cc-save-label');
  const cardList   = root.querySelector('#cc-card-list');
  const starsWrap  = root.querySelector('#cc-stars');
  const adultToggle= root.querySelector('#cc-adult-toggle');

  // ── Preview update ────────────────────────────────────────────────────────
  function updatePreview() {
    const text = textarea.value;
    const len  = text.length;

    // Char counter colour
    counter.textContent = `${len}/${MAX_CHARS}`;
    counter.className   = `cc-char-counter${len >= MAX_CHARS ? ' over' : len >= 120 ? ' near' : ''}`;

    // Badge
    prevBadge.textContent = cardType === 'TRUTH' ? '💬 TRUTH' : '🔥 DARE';
    prevBadge.className   = `cc-prev-type-badge ${cardType === 'TRUTH' ? 'cc-prev-truth' : 'cc-prev-dare'}`;

    // Text
    if (text.trim()) {
      prevText.textContent = text;
      prevText.classList.remove('cc-prev-placeholder');
    } else {
      prevText.textContent = 'Your card text will appear here…';
      prevText.classList.add('cc-prev-placeholder');
    }

    // Auto-flip
    if (len >= MIN_CHARS)  prevInner.classList.add('flipped');
    else                   prevInner.classList.remove('flipped');

    // Save button
    const cleaned = sanitizeCard(text);
    saveBtn.disabled = cleaned.length < MIN_CHARS;
  }

  // ── Difficulty stars ──────────────────────────────────────────────────────
  function renderStars() {
    starsWrap.querySelectorAll('.cc-star-btn').forEach(btn => {
      const n = +btn.dataset.star;
      btn.style.color   = n <= difficulty ? '#FFD740' : 'rgba(255,255,255,.2)';
      btn.style.filter  = n <= difficulty ? 'drop-shadow(0 0 4px rgba(255,215,64,.5))' : 'none';
    });
  }

  starsWrap.querySelectorAll('.cc-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      difficulty = +btn.dataset.star;
      haptic.light();
      renderStars();
    });
  });
  renderStars();

  // ── Type segmented ────────────────────────────────────────────────────────
  root.querySelectorAll('.cc-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cardType = btn.dataset.type;
      root.querySelectorAll('.cc-seg-btn').forEach(b => {
        b.className = `cc-seg-btn${b.dataset.type === 'TRUTH' && cardType === 'TRUTH' ? ' active-truth' :
                                    b.dataset.type === 'DARE'  && cardType === 'DARE'  ? ' active-dare' : ''}`;
      });
      updatePreview();
    });
  });

  // ── Adult toggle ──────────────────────────────────────────────────────────
  adultToggle?.addEventListener('click', () => {
    isAdult = !isAdult;
    adultToggle.classList.toggle('on', isAdult);
    adultToggle.setAttribute('aria-checked', String(isAdult));
  });

  // ── Textarea ──────────────────────────────────────────────────────────────
  textarea.addEventListener('input', updatePreview);

  // ── Reset form ────────────────────────────────────────────────────────────
  function resetForm() {
    textarea.value = '';
    cardType   = 'TRUTH';
    difficulty = 3;
    isAdult    = false;
    editingId  = null;
    saveLabel.textContent = 'Save Card ✨';
    root.querySelectorAll('.cc-seg-btn').forEach(b => {
      b.className = `cc-seg-btn${b.dataset.type === 'TRUTH' ? ' active-truth' : ''}`;
    });
    if (adultToggle) { adultToggle.classList.remove('on'); adultToggle.setAttribute('aria-checked','false'); }
    renderStars();
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Load card into form for editing ───────────────────────────────────────
  function loadForEdit(card) {
    editingId        = card.id;
    textarea.value   = card.text;
    cardType         = card.type ?? 'TRUTH';
    difficulty       = card.difficulty ?? 3;
    isAdult          = card.is_adult_only ?? false;
    saveLabel.textContent = 'Update Card ✏️';

    // Sync segmented buttons
    root.querySelectorAll('.cc-seg-btn').forEach(b => {
      b.className = `cc-seg-btn${b.dataset.type === cardType
        ? ` active-${cardType.toLowerCase()}` : ''}`;
    });
    if (adultToggle) {
      adultToggle.classList.toggle('on', isAdult);
      adultToggle.setAttribute('aria-checked', String(isAdult));
    }
    renderStars();
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    textarea.focus();
  }

  // ── Render card list ──────────────────────────────────────────────────────
  function renderList() {
    if (!customCards.length) {
      cardList.innerHTML = `
        <div class="cc-empty">No custom cards yet.<br>Create your first one above! ✨</div>`;
      return;
    }
    cardList.innerHTML = customCards.map((c, i) => `
      <div class="cc-card-item" style="animation-delay:${i * 40}ms">
        <span class="cc-item-badge ${c.type === 'TRUTH' ? 'cc-item-truth' : 'cc-item-dare'}">
          ${c.type}
        </span>
        <span class="cc-item-text">${escapeHtml(c.text)}</span>
        <div class="cc-item-actions">
          <button class="cc-item-btn edit" data-id="${c.id}" aria-label="Edit card">✏️</button>
          <button class="cc-item-btn del"  data-id="${c.id}" aria-label="Delete card">🗑️</button>
        </div>
      </div>`).join('');

    cardList.querySelectorAll('.cc-item-btn.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = customCards.find(c => String(c.id) === btn.dataset.id);
        if (card) loadForEdit(card);
      });
    });

    cardList.querySelectorAll('.cc-item-btn.del').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingDeleteId = btn.dataset.id;
        root.querySelector('#cc-confirm-overlay').classList.add('visible');
      });
    });
  }

  // ── Delete confirm ────────────────────────────────────────────────────────
  root.querySelector('#cc-confirm-del').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      await api.deleteCustomCard(pendingDeleteId);
      customCards = customCards.filter(c => String(c.id) !== String(pendingDeleteId));
      renderList();
      showToast('Card deleted', 'success');
    } catch (err) {
      showToast(err.message ?? 'Delete failed', 'error');
    }
    pendingDeleteId = null;
    root.querySelector('#cc-confirm-overlay').classList.remove('visible');
  });

  root.querySelector('#cc-confirm-cancel').addEventListener('click', () => {
    pendingDeleteId = null;
    root.querySelector('#cc-confirm-overlay').classList.remove('visible');
  });

  // ── Save / update card ────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    const text = sanitizeCard(textarea.value);
    if (text.length < MIN_CHARS) return;

    saveBtn.disabled = true;
    const payload = { text, type: cardType, category: 'CUSTOM', difficulty, is_adult_only: isAdult };

    try {
      if (editingId) {
        // PUT update (worker endpoint accepts id in path or body)
        await api.saveCustomCard({ ...payload, id: editingId });
        const idx = customCards.findIndex(c => String(c.id) === String(editingId));
        if (idx >= 0) customCards[idx] = { ...customCards[idx], ...payload };
        showToast('Card updated! ✏️', 'success');
      } else {
        const saved = await api.saveCustomCard(payload);
        customCards.unshift({ id: saved?.id ?? Date.now(), ...payload });
        showToast('Card saved! ✨', 'success');
      }
      haptic.medium();
      renderList();
      resetForm();
    } catch (err) {
      showToast(err.message ?? 'Save failed', 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ── Load cards on mount ───────────────────────────────────────────────────
  api.getCustomCards()
    .then(data => {
      customCards = data?.cards ?? data ?? [];
      renderList();
    })
    .catch(() => {
      cardList.innerHTML = `<div class="cc-empty">Could not load cards.</div>`;
    });

  // ── QR Export ─────────────────────────────────────────────────────────────
  const qrSheet     = root.querySelector('#cc-qr-sheet');
  const qrCanvas    = root.querySelector('#cc-qr-canvas');
  const shareBtn    = root.querySelector('#cc-share-btn');

  root.querySelector('#cc-qr-export').addEventListener('click', async () => {
    if (!customCards.length) {
      showToast('No cards to export', 'error'); return;
    }
    const json = JSON.stringify({
      v: 1,
      cards: customCards.map(c => ({
        text:  c.text,
        type:  c.type,
        diff:  c.difficulty ?? 3,
        adult: c.is_adult_only ?? false,
      })),
    });

    qrSheet.classList.add('visible');

    try {
      await QRCode.toCanvas(qrCanvas, json, {
        width: 260,
        margin: 2,
        color: { dark: '#7C4DFF', light: '#0A0A0F' },
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('[cards] QR gen error:', err);
      showToast('QR generation failed', 'error');
    }

    // Share button
    shareBtn.onclick = async () => {
      if (navigator.share) {
        await navigator.share({ title: 'Choose or Dare — Custom Cards', text: json })
          .catch(() => {});
      } else {
        await navigator.clipboard.writeText(json).catch(() => {});
        showToast('Copied to clipboard!', 'success');
      }
    };
  });

  root.querySelector('#cc-qr-close').addEventListener('click', () => {
    qrSheet.classList.remove('visible');
  });

  // ── QR Scanner ────────────────────────────────────────────────────────────
  const scanSheet     = root.querySelector('#cc-scan-sheet');
  const scanVideo     = root.querySelector('#cc-scan-video');
  const scanResult    = root.querySelector('#cc-scan-result');
  const scanSummary   = root.querySelector('#cc-scan-summary');
  const scanPreview   = root.querySelector('#cc-scan-preview');
  const scanImportBtn = root.querySelector('#cc-scan-import-btn');

  async function startScanner() {
    scannedData = null;
    scanResult.classList.remove('visible');
    scanImportBtn.style.display = 'none';
    scanSummary.textContent = '';
    scanPreview.textContent = '';

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      scanVideo.srcObject = scanStream;
      scanVideo.play();

      const offCanvas = document.createElement('canvas');
      const offCtx    = offCanvas.getContext('2d');

      function scanFrame() {
        if (!scanStream || !scanStream.active) return;
        if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
          offCanvas.width  = scanVideo.videoWidth;
          offCanvas.height = scanVideo.videoHeight;
          offCtx.drawImage(scanVideo, 0, 0);
          const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          const code      = jsQR(imageData.data, imageData.width, imageData.height);

          if (code?.data) {
            try {
              const parsed = JSON.parse(code.data);
              if (parsed?.v === 1 && Array.isArray(parsed.cards)) {
                scannedData = parsed;
                stopScanner();
                showScanResult(parsed);
                return;
              }
            } catch { /* not valid JSON */ }
          }
        }
        scanRaf = requestAnimationFrame(scanFrame);
      }
      scanRaf = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('[cards] camera error:', err);
      showToast('Camera access denied', 'error');
      scanSheet.classList.remove('visible');
    }
  }

  function stopScanner() {
    if (scanRaf) { cancelAnimationFrame(scanRaf); scanRaf = null; }
    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
      scanStream = null;
    }
    scanVideo.srcObject = null;
  }

  function showScanResult(parsed) {
    haptic.medium();
    const count = parsed.cards.length;
    scanSummary.textContent = `Found ${count} card${count !== 1 ? 's' : ''} to import`;
    scanPreview.innerHTML = parsed.cards.slice(0, 5).map(c =>
      `<div>• <strong style="color:${c.type==='TRUTH'?'#42A5F5':'#FF6061'}">${c.type}</strong> — ${escapeHtml(c.text?.slice(0,60))}${c.text?.length > 60 ? '…' : ''}</div>`
    ).join('');
    scanResult.classList.add('visible');
    scanImportBtn.style.display = 'block';
  }

  scanImportBtn.addEventListener('click', async () => {
    if (!scannedData?.cards?.length) return;
    scanImportBtn.disabled = true;
    let imported = 0;

    for (const c of scannedData.cards) {
      const text = sanitizeCard(c.text ?? '');
      if (text.length < MIN_CHARS) continue;
      try {
        const saved = await api.saveCustomCard({
          text, type: c.type ?? 'TRUTH', category: 'CUSTOM',
          difficulty: c.diff ?? 3, is_adult_only: c.adult ?? false,
        });
        customCards.unshift({ id: saved?.id ?? Date.now(), text, type: c.type ?? 'TRUTH',
          category: 'CUSTOM', difficulty: c.diff ?? 3, is_adult_only: c.adult ?? false });
        imported++;
      } catch { /* skip invalid */ }
    }

    renderList();
    scanSheet.classList.remove('visible');
    showToast(`${imported} card${imported !== 1 ? 's' : ''} imported! 🎉`, 'success');
    scanImportBtn.disabled = false;
  });

  root.querySelector('#cc-scan-close').addEventListener('click', () => {
    stopScanner();
    scanSheet.classList.remove('visible');
  });

  root.querySelector('#cc-qr-scan').addEventListener('click', () => {
    scanSheet.classList.add('visible');
    startScanner();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  updatePreview();

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    stopScanner();
    document.getElementById('bottom-nav')?.remove();
  };
}
