// src/pages/settings.js — Full settings screen (store-only, no localStorage)
// Sections: Profile · Game · Content · Data · Account · About

import { store }          from '../store.js';
import { api }            from '../utils/api.js';
import { logout }         from '../auth.js';
import { haptic, sound, showToast } from '../utils/feedback.js';
import { mountBottomNav } from './home.js';

const APP_VERSION = __APP_VERSION__ ?? '1.0.0';

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
.sx-root {
  min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
/* ── Profile card ── */
.sx-profile {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 20px 0;
}
.sx-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
  border: 2.5px solid rgba(124,77,255,.5);
}
.sx-avatar-fallback {
  width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg,#7C4DFF,#FF4081);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 900; color: #fff;
  border: 2.5px solid rgba(124,77,255,.5);
}
.sx-profile-info { flex: 1; min-width: 0; }
.sx-display-name {
  font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 18px; font-weight: 800; color: #e6e0ee;
  letter-spacing:-.02em; white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.sx-email {
  font-size: 13px; color: #948ea1; margin-top: 2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
/* ── Section header ── */
.sx-section-header {
  padding: 20px 20px 6px;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing:.12em;
  color: #948ea1; text-transform: uppercase;
}
/* ── Settings group ── */
.sx-group {
  margin: 0 20px;
  background: #1C1C2E; border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  overflow: hidden;
}
/* ── Row ── */
.sx-row {
  display: flex; align-items: center; gap: 12px;
  min-height: 52px; padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  cursor: default;
}
.sx-row:last-child { border-bottom: none; }
.sx-row.tappable { cursor: pointer; transition: background .15s; }
.sx-row.tappable:active { background: rgba(255,255,255,.04); }
.sx-row-icon {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.sx-row-label { flex: 1; }
.sx-row-title { font-size: 15px; font-weight: 600; color: #e6e0ee; }
.sx-row-sub { font-size: 12px; color: #948ea1; margin-top: 2px; line-height: 1.3; }
.sx-row-title.danger { color: #ff7675; }
.sx-row-right { flex-shrink: 0; color: #494455; font-size: 18px; }
/* ── Toggle switch ── */
.sx-toggle {
  width: 48px; height: 26px; border-radius: 13px;
  background: #2a2840; border: none; cursor: pointer; position: relative;
  flex-shrink: 0; transition: background .2s;
}
.sx-toggle.on { background: #7C4DFF; }
.sx-toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; border-radius: 50%; background: #fff;
  transition: transform .2s;
}
.sx-toggle.on .sx-toggle-knob { transform: translateX(22px); }
/* ── Segmented timer ── */
.sx-seg {
  display: flex; background: #141420; border-radius: 10px; padding: 3px; gap: 2px;
}
.sx-seg-btn {
  flex: 1; height: 32px; border: none; border-radius: 7px;
  background: transparent; color: #948ea1;
  font-family: 'Space Grotesk',system-ui,sans-serif;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background .15s, color .15s; touch-action: manipulation;
}
.sx-seg-btn.active { background: #7C4DFF; color: #fff; }
/* ── Full-width button row ── */
.sx-btn-row {
  margin: 0 20px;
}
.sx-sign-out-btn {
  width: 100%; height: 52px; border-radius: 14px;
  background: transparent; border: 1.5px solid rgba(255,107,107,.4);
  color: #ff7675; font-family: 'Hanken Grotesk',system-ui,sans-serif;
  font-size: 16px; font-weight: 700; cursor: pointer; touch-action: manipulation;
  transition: background .15s, border-color .15s;
}
.sx-sign-out-btn:active { background: rgba(255,82,82,.1); border-color: #ff7675; }
/* ── Confirm sheet overlay ── */
.sx-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.72);
  backdrop-filter: blur(8px); z-index: 50;
  display: flex; align-items: flex-end;
  opacity: 0; pointer-events: none; transition: opacity .25s;
}
.sx-overlay.visible { opacity: 1; pointer-events: all; }
.sx-sheet {
  width: 100%; background: #141420; border-radius: 24px 24px 0 0;
  padding: 28px 20px calc(28px + env(safe-area-inset-bottom));
  transform: translateY(40px);
  transition: transform .3s cubic-bezier(.34,1.2,.64,1);
  border-top: 1px solid rgba(255,255,255,.08);
}
.sx-overlay.visible .sx-sheet { transform: translateY(0); }
.sx-sheet-emoji { text-align:center; font-size:44px; margin-bottom:12px; }
.sx-sheet-title {
  font-family:'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 22px; font-weight: 800; color: #e6e0ee;
  text-align: center; margin-bottom: 6px;
}
.sx-sheet-sub {
  font-size: 14px; color: #948ea1; text-align: center;
  margin-bottom: 24px; line-height: 1.5;
}
.sx-sheet-confirm {
  width: 100%; height: 50px; border-radius: 14px; border: none;
  color: #fff; font-family: 'Bricolage Grotesque',system-ui,sans-serif;
  font-size: 17px; font-weight: 900; cursor: pointer; margin-bottom: 10px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.sx-sheet-confirm.red   { background: linear-gradient(135deg,#F44336,#c62828); }
.sx-sheet-confirm.warn  { background: linear-gradient(135deg,#FF9800,#e65100); }
.sx-sheet-cancel {
  width: 100%; height: 46px; border-radius: 14px;
  background: transparent; border: 1.5px solid rgba(255,255,255,.1);
  color: #948ea1; font-size: 15px; font-weight: 600; cursor: pointer;
  font-family: 'Hanken Grotesk',system-ui,sans-serif;
}
.sx-btn-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff;
  animation: spin .7s linear infinite; display: none;
}
.sx-sheet-confirm.loading .sx-btn-spinner { display: block; }
.sx-sheet-confirm.loading .sx-btn-label   { display: none; }
`;

function injectStyles() {
  if (document.getElementById('sx-css')) return;
  const s = document.createElement('style'); s.id = 'sx-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle(id, initialOn, onChange) {
  const btn = document.createElement('button');
  btn.className   = `sx-toggle${initialOn ? ' on' : ''}`;
  btn.id          = id;
  btn.role        = 'switch';
  btn.setAttribute('aria-checked', String(initialOn));
  btn.innerHTML   = '<div class="sx-toggle-knob"></div>';
  let state = initialOn;
  btn.addEventListener('click', () => {
    state = !state;
    btn.classList.toggle('on', state);
    btn.setAttribute('aria-checked', String(state));
    onChange(state);
  });
  return btn;
}

// ── Row builder ───────────────────────────────────────────────────────────────
function Row({ icon, iconBg, title, sub, danger, right, onClick }) {
  const row = document.createElement('div');
  row.className = `sx-row${onClick ? ' tappable' : ''}`;

  const iconEl = document.createElement('div');
  iconEl.className = 'sx-row-icon';
  iconEl.style.background = iconBg ?? 'rgba(255,255,255,.06)';
  iconEl.textContent = icon;

  const labelEl = document.createElement('div');
  labelEl.className = 'sx-row-label';
  const titleEl = document.createElement('div');
  titleEl.className = `sx-row-title${danger ? ' danger' : ''}`;
  titleEl.textContent = title;
  labelEl.appendChild(titleEl);
  if (sub) {
    const subEl = document.createElement('div');
    subEl.className = 'sx-row-sub';
    subEl.textContent = sub;
    labelEl.appendChild(subEl);
  }

  row.appendChild(iconEl);
  row.appendChild(labelEl);

  if (right) row.appendChild(right);
  else if (onClick) {
    const chev = document.createElement('span');
    chev.className = 'sx-row-right';
    chev.textContent = '›';
    row.appendChild(chev);
  }

  if (onClick) row.addEventListener('click', onClick);
  return row;
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section(label, rows, root) {
  const header = document.createElement('div');
  header.className = 'sx-section-header';
  header.textContent = label;
  root.appendChild(header);

  const group = document.createElement('div');
  group.className = 'sx-group';
  rows.forEach(r => group.appendChild(r));
  root.appendChild(group);
}

// ── CSV export ────────────────────────────────────────────────────────────────
function toCSV(sessions = []) {
  const lines = ['Date,Players,Rounds,Done,Category,Result'];
  for (const s of sessions) {
    const rows = s.rounds ?? [];
    for (const r of rows) {
      lines.push([
        `"${s.started_at ?? ''}"`,
        `"${s.player_count ?? ''}"`,
        `"${s.total_rounds ?? ''}"`,
        `"${r.player_name ?? ''}"`,
        `"${r.category ?? ''}"`,
        `"${r.result ?? ''}"`,
      ].join(','));
    }
  }
  return lines.join('\n');
}

// ── Main render ───────────────────────────────────────────────────────────────
export default function renderSettings(router, params) {
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  const user = store.user;
  const firstName = (user.displayName || 'Player').split(' ')[0];

  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'sx-root';
  app.appendChild(root);

  // ── Profile ───────────────────────────────────────────────────────────────
  const profileEl = document.createElement('div');
  profileEl.className = 'sx-profile';

  if (user.photoURL) {
    const img = document.createElement('img');
    img.className = 'sx-avatar';
    img.src = user.photoURL;
    img.alt = firstName;
    img.onerror = () => {
      const fb = document.createElement('div');
      fb.className = 'sx-avatar-fallback';
      fb.textContent = firstName[0].toUpperCase();
      img.replaceWith(fb);
    };
    profileEl.appendChild(img);
  } else {
    const fb = document.createElement('div');
    fb.className = 'sx-avatar-fallback';
    fb.textContent = firstName[0].toUpperCase();
    profileEl.appendChild(fb);
  }

  const infoEl = document.createElement('div');
  infoEl.className = 'sx-profile-info';
  infoEl.innerHTML = `
    <div class="sx-display-name">${user.displayName ?? 'Player'}</div>
    <div class="sx-email">${user.email ?? ''}</div>
  `;
  profileEl.appendChild(infoEl);
  root.appendChild(profileEl);

  // ── GAME section ─────────────────────────────────────────────────────────
  const soundToggle   = Toggle('sx-sound', store.soundEnabled, v => {
    store.soundEnabled = v;
    if (v) sound.tick?.();
  });
  const hapticToggle  = Toggle('sx-haptic', store.hapticsEnabled, v => {
    store.hapticsEnabled = v;
    if (v) haptic.light?.();
  });

  // Timer segmented control
  const timerSeg = document.createElement('div');
  timerSeg.className = 'sx-seg';
  [30, 60, 90].forEach(secs => {
    const btn = document.createElement('button');
    btn.className = `sx-seg-btn${store.defaultTimer === secs ? ' active' : ''}`;
    btn.dataset.secs = secs;
    btn.textContent  = `${secs}s`;
    btn.addEventListener('click', () => {
      store.defaultTimer = secs;
      // Sync session timer if active
      if (store.gameSession) store.gameSession.timerSeconds = secs;
      timerSeg.querySelectorAll('.sx-seg-btn').forEach(b => {
        b.classList.toggle('active', +b.dataset.secs === secs);
      });
      haptic.light();
    });
    timerSeg.appendChild(btn);
  });

  Section('GAME', [
    Row({ icon: '🔊', iconBg: 'rgba(0,188,212,.15)', title: 'Sound Effects',
          sub: 'Card flips, winner sound, timer ding', right: soundToggle }),
    Row({ icon: '📳', iconBg: 'rgba(124,77,255,.15)', title: 'Haptic Feedback',
          sub: 'Vibrations for actions and events', right: hapticToggle }),
    Row({ icon: '⏱', iconBg: 'rgba(255,152,0,.15)', title: 'Dare Timer',
          sub: 'Default countdown for dare cards', right: timerSeg }),
  ], root);

  // ── CONTENT section ───────────────────────────────────────────────────────
  const adultToggle = Toggle('sx-adult', store.isAdultUnlocked, v => {
    store.isAdultUnlocked = v;
    haptic.light();
  });

  Section('CONTENT', [
    Row({ icon: '🔞', iconBg: 'rgba(244,67,54,.15)', title: '18+ Content',
          sub: 'Unlocks Couples & Dirty card categories',
          right: adultToggle }),
  ], root);

  // ── DATA section ──────────────────────────────────────────────────────────
  Section('DATA', [
    Row({ icon: '📤', iconBg: 'rgba(76,175,132,.15)', title: 'Export History',
          sub: 'Download your game history as CSV',
          onClick: handleExport }),
    Row({ icon: '🗑️', iconBg: 'rgba(244,67,54,.12)', title: 'Clear History',
          danger: true, sub: 'Remove all session records',
          onClick: () => openSheet('clear') }),
    Row({ icon: '⛔', iconBg: 'rgba(244,67,54,.12)', title: 'Delete Account',
          danger: true, sub: 'Permanently delete all your data',
          onClick: () => openSheet('delete') }),
  ], root);

  // ── ACCOUNT section ───────────────────────────────────────────────────────
  const acctHeader = document.createElement('div');
  acctHeader.className = 'sx-section-header';
  acctHeader.textContent = 'ACCOUNT';
  root.appendChild(acctHeader);

  const btnRow = document.createElement('div');
  btnRow.className = 'sx-btn-row';
  const signOutBtn = document.createElement('button');
  signOutBtn.className = 'sx-sign-out-btn';
  signOutBtn.textContent = 'Sign Out';
  signOutBtn.addEventListener('click', handleSignOut);
  btnRow.appendChild(signOutBtn);
  root.appendChild(btnRow);

  // ── ABOUT section ─────────────────────────────────────────────────────────
  const versionRight = document.createElement('span');
  versionRight.className = 'sx-row-right';
  versionRight.style.cssText = 'font-size:13px;color:#494455;font-family:"Space Grotesk",system-ui';
  versionRight.textContent = APP_VERSION;

  const madeRight = document.createElement('span');
  madeRight.className = 'sx-row-right';
  madeRight.style.cssText = 'font-size:13px;color:#494455';
  madeRight.textContent = 'Jatin';

  Section('ABOUT', [
    Row({ icon: 'ℹ️', iconBg: 'rgba(255,255,255,.06)', title: 'App Version', right: versionRight }),
    Row({ icon: '❤️', iconBg: 'rgba(255,64,129,.1)',   title: 'Made with love', right: madeRight }),
  ], root);

  // ── Confirm bottom sheet ──────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'sx-overlay';
  overlay.id = 'sx-overlay';
  overlay.innerHTML = `
    <div class="sx-sheet">
      <div class="sx-sheet-emoji" id="sx-sheet-emoji">🗑️</div>
      <h2 class="sx-sheet-title" id="sx-sheet-title">Confirm</h2>
      <p class="sx-sheet-sub" id="sx-sheet-sub"></p>
      <button class="sx-sheet-confirm red" id="sx-confirm-btn">
        <span class="sx-btn-spinner"></span>
        <span class="sx-btn-label" id="sx-confirm-label">Confirm</span>
      </button>
      <button class="sx-sheet-cancel" id="sx-cancel-btn">Cancel</button>
    </div>
  `;
  root.appendChild(overlay);

  let pendingAction = null;

  function openSheet(action) {
    pendingAction = action;
    const emoji   = overlay.querySelector('#sx-sheet-emoji');
    const title   = overlay.querySelector('#sx-sheet-title');
    const sub     = overlay.querySelector('#sx-sheet-sub');
    const label   = overlay.querySelector('#sx-confirm-label');
    const confBtn = overlay.querySelector('#sx-confirm-btn');

    if (action === 'clear') {
      emoji.textContent = '🗑️';
      title.textContent = 'Clear History?';
      sub.textContent   = 'All your game session records will be deleted. Your account stays active.';
      label.textContent = 'Clear All History';
      confBtn.className = 'sx-sheet-confirm warn';
    } else if (action === 'delete') {
      emoji.textContent = '⛔';
      title.textContent = 'Delete Account?';
      sub.textContent   = 'This permanently deletes your account, all history, and custom cards. This cannot be undone.';
      label.textContent = 'Delete My Account';
      confBtn.className = 'sx-sheet-confirm red';
    }
    overlay.classList.add('visible');
  }

  overlay.querySelector('#sx-cancel-btn').addEventListener('click', () => {
    overlay.classList.remove('visible');
    pendingAction = null;
  });

  overlay.querySelector('#sx-confirm-btn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#sx-confirm-btn');
    btn.classList.add('loading'); btn.disabled = true;

    try {
      if (pendingAction === 'delete') {
        await api.deleteAccount();
        await logout();
        router.navigate('/', true);
      } else if (pendingAction === 'clear') {
        // clear history via saveSession with empty data isn't supported —
        // for now wipe local state and show success (server-side clear endpoint TBD)
        store.roundResults  = [];
        store.gameSession   = null;
        showToast('History cleared locally', 'success');
        overlay.classList.remove('visible');
      }
    } catch (err) {
      console.error('[settings] action error:', err);
      showToast(err.message ?? 'Action failed. Try again.', 'error');
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  // ── Export CSV ────────────────────────────────────────────────────────────
  async function handleExport() {
    showToast('Preparing export…', 'info');
    try {
      const data = await api.getHistory(1);
      const csv  = toCSV(data?.sessions ?? []);
      const filename = `choose-or-dare-history-${new Date().toISOString().slice(0,10)}.csv`;

      if (navigator.share) {
        await navigator.share({ title: 'Game History', text: csv })
          .catch(() => {});
      } else {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        showToast('CSV downloaded!', 'success');
      }
    } catch (err) {
      showToast('Export failed', 'error');
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    signOutBtn.disabled = true;
    signOutBtn.textContent = 'Signing out…';
    try {
      await logout();
      router.navigate('/', true);
    } catch (err) {
      showToast('Sign out failed', 'error');
      signOutBtn.disabled = false;
      signOutBtn.textContent = 'Sign Out';
    }
  }

  mountBottomNav(router, 'settings');

  return () => { document.getElementById('bottom-nav')?.remove(); };
}
