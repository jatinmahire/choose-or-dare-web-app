// result.js — Post-game results screen (stub until Phase 13)
import { store }          from '../store.js';
import { mountBottomNav } from './home.js';

export default function renderResult(router, params) {
  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  const results = store.roundResults ?? [];
  const doneCount     = results.filter(r => r.result === 'done').length;
  const chickenCount  = results.filter(r => r.result === 'chickened').length;
  const bravery = results.length > 0 ? Math.round((doneCount / results.length) * 100) : 0;

  app.innerHTML = `
    <div style="min-height:100dvh;background:#0A0A0F;color:#e6e0ee;
      font-family:'Hanken Grotesk',system-ui,sans-serif;
      display:flex;flex-direction:column;align-items:center;
      padding:40px 24px calc(96px + env(safe-area-inset-bottom));text-align:center">

      <div style="font-size:64px;margin-bottom:12px">🏁</div>
      <h1 style="font-family:'Bricolage Grotesque',system-ui,sans-serif;
        font-size:32px;font-weight:900;letter-spacing:-.04em;
        color:#cdbdff;margin:0 0 4px">Game Over!</h1>
      <p style="color:#948ea1;font-size:15px;margin:0 0 32px">
        ${results.length} rounds played
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;width:100%;max-width:340px;margin-bottom:32px">
        <div style="background:#1C1C2E;border-radius:14px;padding:16px 8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          <div style="font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:28px;font-weight:900;color:#cdbdff">${results.length}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#948ea1;font-family:'Space Grotesk',system-ui,sans-serif;margin-top:4px">ROUNDS</div>
        </div>
        <div style="background:#1C1C2E;border-radius:14px;padding:16px 8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          <div style="font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:28px;font-weight:900;color:#4CAF84">${doneCount}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#948ea1;font-family:'Space Grotesk',system-ui,sans-serif;margin-top:4px">DONE</div>
        </div>
        <div style="background:#1C1C2E;border-radius:14px;padding:16px 8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          <div style="font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:28px;font-weight:900;color:#cdbdff">${bravery}%</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#948ea1;font-family:'Space Grotesk',system-ui,sans-serif;margin-top:4px">BRAVERY</div>
        </div>
      </div>

      ${results.length > 0 ? `
        <div style="width:100%;max-width:340px;background:#1C1C2E;border-radius:16px;padding:4px;margin-bottom:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          ${results.map((r, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
              ${i < results.length-1?'border-bottom:1px solid rgba(255,255,255,.06)':''}">
              <span style="font-size:18px">${r.result === 'done' ? '✅' : '🐔'}</span>
              <div style="flex:1;text-align:left">
                <div style="font-size:13px;font-weight:700;color:#e6e0ee">${r.playerName}</div>
                <div style="font-size:11px;color:#948ea1;margin-top:1px">${r.cardType} · ${r.category}</div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${r.result==='done'?'#4CAF84':'#F44336'};font-family:'Space Grotesk',system-ui,sans-serif">
                ${r.result.toUpperCase()}
              </span>
            </div>`).join('')}
        </div>
      ` : ''}

      <button onclick="location.hash='#/home'" style="width:100%;max-width:340px;
        height:52px;border-radius:14px;border:none;
        background:linear-gradient(135deg,#7C4DFF,#9C27B0);
        color:#fff;font-family:'Bricolage Grotesque',system-ui,sans-serif;
        font-size:17px;font-weight:900;cursor:pointer;
        box-shadow:0 4px 20px rgba(124,77,255,.4)">
        Play Again 🎉
      </button>
    </div>
  `;

  mountBottomNav(router, 'home');
  return () => { document.getElementById('bottom-nav')?.remove(); };
}
