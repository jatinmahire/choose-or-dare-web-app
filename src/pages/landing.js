// src/pages/landing.js — Choose or Dare landing page
// Design: Stitch "Midnight Dare" system — Bricolage Grotesque + Hanken Grotesk
// Interactions: Google Sign-In, loading state, error toast.

import { signInWithGoogle } from '../auth.js';
import { store }            from '../store.js';
import { showToast }        from '../utils/feedback.js';

// ── Google Fonts (loaded once) ───────────────────────────────────────────────
function loadFonts() {
  if (document.getElementById('cod-fonts')) return;
  const link = document.createElement('link');
  link.id   = 'cod-fonts';
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@700&family=Hanken+Grotesk:wght@400;600;700&display=swap';
  document.head.appendChild(link);
}

// ── Styles (injected once) ───────────────────────────────────────────────────
const CSS = `
@keyframes pulse-glow {
  0%,100% { transform: scale(1) translate(var(--tx,0),var(--ty,0)); box-shadow: var(--glow); opacity:.9; }
  50%      { transform: scale(1.06) translate(var(--tx,0),var(--ty,0)); opacity:1; filter:brightness(1.25); }
}
@keyframes float-idle {
  0%,100% { transform: translate(var(--tx,0),var(--ty,0)) translateY(0px); }
  50%     { transform: translate(var(--tx,0),var(--ty,0)) translateY(-6px); }
}
.landing-root {
  min-height: 100dvh;
  background: #0A0A0F;
  color: #e6e0ee;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  position: relative;
}
.landing-glow-bg {
  position: fixed;
  width: 150vw; height: 150vw;
  border-radius: 50%;
  background: radial-gradient(circle, #7c4dff 0%, transparent 70%);
  filter: blur(80px);
  opacity: .12;
  top: -50vw; left: -25vw;
  pointer-events: none;
  z-index: 0;
}
.landing-main {
  width: 100%; max-width: 375px;
  padding: 40px 20px 96px;
  display: flex; flex-direction: column;
  gap: 40px;
  position: relative; z-index: 1;
}
/* ── Hero ── */
.landing-hero {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  gap: 16px; margin-top: 24px;
}
.landing-circles {
  position: relative; width: 192px; height: 192px;
  display: flex; align-items: center; justify-content: center;
}
.landing-circle {
  position: absolute; border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite, float-idle 4s ease-in-out infinite;
}
.c1 {
  width: 96px; height: 96px;
  background: #7C4DFF;
  --tx: 2rem; --ty: -1rem;
  --glow: 0 0 40px rgba(124,77,255,.8);
  animation-delay: 0s, 0s;
}
.c2 {
  width: 80px; height: 80px;
  background: #FF4081;
  --tx: -2rem; --ty: 1.5rem;
  --glow: 0 0 30px rgba(255,64,129,.8);
  animation-delay: 1s, .6s;
}
.c3 {
  width: 64px; height: 64px;
  background: #00BCD4;
  --tx: -.5rem; --ty: -2.5rem;
  --glow: 0 0 25px rgba(0,188,212,.8);
  animation-delay: 2s, 1.2s;
}
.landing-title {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(38px, 11vw, 44px);
  font-weight: 900;
  line-height: .9;
  letter-spacing: -.06em;
  color: #cdbdff;
  text-shadow: 0 0 24px rgba(205,189,255,.35);
  display: inline-block;
  transform: rotate(-2deg);
  margin-top: 8px;
}
.landing-subtitle {
  font-size: 17px; line-height: 1.5;
  color: #cac3d8; margin-top: 4px;
}
/* ── Sign-In ── */
.landing-signin-section { display:flex; flex-direction:column; gap:8px; width:100%; }
.google-btn {
  width: 100%; height: 52px;
  background: #fff; border: none;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,.4);
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
  touch-action: manipulation;
  min-height: 52px;
  position: relative;
  overflow: hidden;
}
.google-btn:active { transform: scale(.97); }
.google-btn:disabled { opacity:.7; cursor:not-allowed; }
.google-btn-text { font-family:'Hanken Grotesk',system-ui,sans-serif; font-size:16px; font-weight:700; color:#111; }
.google-btn-spinner {
  width:20px; height:20px; border-radius:50%;
  border:2.5px solid rgba(124,77,255,.25);
  border-top-color:#7C4DFF;
  animation: spin .7s linear infinite;
  display:none;
}
.google-btn.loading .google-btn-spinner { display:block; }
.google-btn.loading .google-btn-icon,
.google-btn.loading .google-btn-text  { display:none; }
.signin-hint {
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size:11px; font-weight:700; letter-spacing:.1em;
  color:#cac3d8; opacity:.6; text-align:center;
}
/* ── Feature Grid ── */
.landing-features { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; }
.feature-card {
  background:#1C1C2E;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  border-radius:16px; padding:20px 16px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; gap:10px; aspect-ratio:1;
}
.feature-emoji { font-size:36px; line-height:1; }
.feature-label { font-size:14px; font-weight:600; color:#e6e0ee; }
/* ── Categories ── */
.landing-cats { display:flex; flex-direction:column; gap:8px; width:100%; }
.cats-label { font-family:'Space Grotesk',system-ui,sans-serif; font-size:11px; font-weight:700; letter-spacing:.12em; color:#948ea1; }
.cats-scroll {
  display:flex; gap:10px;
  overflow-x: auto; padding-bottom:4px;
  scrollbar-width:none; -ms-overflow-style:none;
}
.cats-scroll::-webkit-scrollbar { display:none; }
.cat-chip {
  padding:8px 18px; border-radius:9999px;
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size:11px; font-weight:700; letter-spacing:.1em;
  white-space:nowrap; flex-shrink:0;
}
/* ── Footer ── */
.landing-footer {
  text-align:center;
  font-family:'Space Grotesk',system-ui,sans-serif;
  font-size:10px; font-weight:700; letter-spacing:.1em;
  color:#948ea1; opacity:.5;
}
`;

function injectStyles() {
  if (document.getElementById('landing-styles')) return;
  const s = document.createElement('style');
  s.id = 'landing-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Render ───────────────────────────────────────────────────────────────────
export default function renderLanding(router) {
  loadFonts();
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;

  // If already signed in, skip landing
  if (store.user) {
    router.navigate('/home', true);
    return;
  }

  app.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'landing-root';

  root.innerHTML = `
    <div class="landing-glow-bg"></div>
    <main class="landing-main">

      <!-- HERO -->
      <section class="landing-hero">
        <div class="landing-circles" id="landing-circles">
          <div class="landing-circle c1"></div>
          <div class="landing-circle c2"></div>
          <div class="landing-circle c3"></div>
        </div>
        <h1 class="landing-title">CHOOSE<br>OR DARE</h1>
        <p class="landing-subtitle">The game that picks who dares</p>
      </section>

      <!-- SIGN IN -->
      <section class="landing-signin-section">
        <button class="google-btn" id="landing-google-btn" aria-label="Sign in with Google">
          <svg class="google-btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.81c.87-2.6 3.3-4.5 6.16-4.5z" fill="#EA4335"/>
          </svg>
          <div class="google-btn-spinner"></div>
          <span class="google-btn-text">Sign in with Google</span>
        </button>
        <p class="signin-hint">Free · No email needed · Mobile only</p>
      </section>

      <!-- FEATURES -->
      <section class="landing-features" aria-label="Features">
        <div class="feature-card"><span class="feature-emoji">👆</span><span class="feature-label">Finger Picker</span></div>
        <div class="feature-card"><span class="feature-emoji">🃏</span><span class="feature-label">500+ Cards</span></div>
        <div class="feature-card"><span class="feature-emoji">📊</span><span class="feature-label">Track History</span></div>
        <div class="feature-card"><span class="feature-emoji">🔞</span><span class="feature-label">18+ Mode</span></div>
      </section>

      <!-- CATEGORIES -->
      <section class="landing-cats" aria-label="Card categories">
        <p class="cats-label">CATEGORIES</p>
        <div class="cats-scroll">
          <span class="cat-chip" style="background:rgba(76,175,132,.15);color:#4CAF84">FRIENDLY</span>
          <span class="cat-chip" style="background:rgba(255,193,7,.15);color:#FFC107">PARTY</span>
          <span class="cat-chip" style="background:rgba(233,30,99,.15);color:#E91E63">COUPLES</span>
          <span class="cat-chip" style="background:rgba(244,67,54,.15);color:#F44336">DIRTY</span>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="landing-footer">18+ ONLY · WORKS IN YOUR MOBILE BROWSER · ALWAYS FREE</footer>

    </main>
  `;

  app.appendChild(root);

  // ── Sign-in handler ───────────────────────────────────────────────────────
  const btn = root.querySelector('#landing-google-btn');

  async function handleSignIn() {
    // Disable button and show redirect message immediately.
    // signInWithRedirect() navigates away — the page never comes back here.
    btn.disabled = true;
    btn.classList.add('loading');
    const textEl = btn.querySelector('.google-btn-text');
    if (textEl) textEl.textContent = 'Redirecting to Google…';

    try {
      await signInWithGoogle(); // triggers full-page redirect — never resolves
    } catch (err) {
      // Only reachable if redirect itself fails (rare network error)
      console.error('[landing] redirect error:', err);
      showToast('Sign-in failed. Check your connection and try again.', 'error');
      btn.disabled = false;
      btn.classList.remove('loading');
      if (textEl) textEl.textContent = 'Sign in with Google';
    }
  }

  btn.addEventListener('click', handleSignIn);

  // ── Parallax circles on mouse/touch move ─────────────────────────────────
  const circles = root.querySelectorAll('.landing-circle');
  const speeds  = [0.05, 0.08, 0.03];
  const origins = [
    { x: 32, y: -16 }, // c1: translate-x-8 -translate-y-4 (px)
    { x: -32, y: 24 }, // c2
    { x: -8,  y: -40 }, // c3
  ];

  function onMove(clientX, clientY) {
    const container = root.querySelector('#landing-circles');
    if (!container) return;
    const r = container.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top  + r.height / 2);
    circles.forEach((c, i) => {
      const ox = origins[i].x + dx * speeds[i];
      const oy = origins[i].y + dy * speeds[i];
      c.style.transform = `translate(${ox}px,${oy}px)`;
    });
  }

  const onMouseMove = (e) => onMove(e.clientX, e.clientY);
  const onTouchMove = (e) => {
    if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Cleanup
  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    btn.removeEventListener('click', handleSignIn);
  };
}
