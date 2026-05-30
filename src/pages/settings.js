// settings.js — placeholder until Phase 11
import { store }           from '../store.js';
import { mountBottomNav }  from './home.js';
import { logout }          from '../auth.js';
import { showToast }       from '../utils/feedback.js';

export default function renderSettings(params, router) {
  const app = document.getElementById('app');
  if (!app) return;
  if (!store.user) { router.navigate('/landing', true); return; }

  app.innerHTML = `
    <div style="min-height:100dvh;background:#0A0A0F;color:#e6e0ee;
      font-family:'Hanken Grotesk',system-ui,sans-serif;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:24px;text-align:center;gap:16px;
      padding-bottom:calc(80px + env(safe-area-inset-bottom))">
      <div style="font-size:48px">⚙️</div>
      <h1 style="font-family:'Bricolage Grotesque',system-ui,sans-serif;
        font-size:24px;font-weight:800;color:#cdbdff;margin:0">Settings</h1>
      <p style="color:#948ea1;font-size:14px;margin:0">More options in Phase 11</p>
      <button id="signout-btn" style="margin-top:8px;padding:12px 28px;
        border-radius:12px;border:1.5px solid rgba(244,67,54,.4);
        background:rgba(244,67,54,.08);color:#ff7675;
        font-size:14px;font-weight:700;cursor:pointer;
        font-family:'Hanken Grotesk',system-ui,sans-serif">
        Sign Out
      </button>
    </div>
  `;

  document.getElementById('signout-btn').addEventListener('click', async () => {
    try {
      await logout();
      router.navigate('/landing', true);
    } catch (e) {
      showToast('Sign out failed', 'error');
    }
  });

  mountBottomNav(router, 'settings');
  return () => { document.getElementById('bottom-nav')?.remove(); };
}
