// history.js — placeholder until Phase 11
import { store }           from '../store.js';
import { mountBottomNav }  from './home.js';

export default function renderHistory(params, router) {
  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = `
    <div style="min-height:100dvh;background:#0A0A0F;color:#e6e0ee;
      font-family:'Hanken Grotesk',system-ui,sans-serif;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:24px;text-align:center;
      padding-bottom:calc(80px + env(safe-area-inset-bottom))">
      <div style="font-size:48px;margin-bottom:16px">📜</div>
      <h1 style="font-family:'Bricolage Grotesque',system-ui,sans-serif;
        font-size:24px;font-weight:800;color:#cdbdff;margin:0 0 8px">Game History</h1>
      <p style="color:#948ea1;font-size:14px">Coming in Phase 11</p>
    </div>
  `;
  mountBottomNav(router, 'history');
  return () => { document.getElementById('bottom-nav')?.remove(); };
}
