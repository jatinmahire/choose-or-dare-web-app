// src/pages/landing.js — Choose or Dare landing page
// Design: Stitch "Nocturnal Editorial" system — editorial left-aligned layout,
// shimmer CTA, floating depth circles, entrance animations.

import { signInWithGoogle, onAuthChange } from '../auth.js';
import { store }            from '../store.js';
import { showToast }        from '../utils/feedback.js';

// ── Styles (injected once) ───────────────────────────────────────────────────
const CSS = `
/* Entrance animations */
@keyframes land-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer-sweep {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(300%) skewX(-15deg); }
}
@keyframes btn-glow-pulse {
  0%,100% { box-shadow: 0 8px 40px rgba(124,77,255,.5); }
  50%     { box-shadow: 0 8px 56px rgba(124,77,255,.8); }
}
@keyframes float-drift {
  0%,100% { transform: translate(var(--ox,0px), var(--oy,0px)) translateY(0px) scale(1); }
  33%     { transform: translate(calc(var(--ox,0px) + 6px), calc(var(--oy,0px) - 8px)) scale(1.04); }
  66%     { transform: translate(calc(var(--ox,0px) - 4px), calc(var(--oy,0px) + 5px)) scale(.97); }
}
@keyframes circle-glow {
  0%,100% { opacity: .85; filter: blur(0px); }
  50%     { opacity: 1;   filter: blur(1px); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Root */
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
/* Background depth glow */
.land-bg-glow {
  position: fixed;
  width: 180vw; height: 180vw;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 20%, rgba(124,77,255,.18) 0%, transparent 60%),
              radial-gradient(circle at 80% 70%, rgba(255,64,129,.10) 0%, transparent 50%);
  top: -60vw; left: -40vw;
  pointer-events: none;
  z-index: 0;
}
/* Floating background circles (depth layer) */
.land-bg-circles {
  position: fixed;
  inset: 0; pointer-events: none; z-index: 0;
  overflow: hidden;
}
.land-bg-c {
  position: absolute;
  border-radius: 50%;
  animation: float-drift var(--dur,8s) ease-in-out infinite var(--del,0s),
             circle-glow var(--gd,5s) ease-in-out infinite var(--del,0s);
}
.land-bg-c1 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(124,77,255,.35) 0%, transparent 70%);
  --ox: -60px; --oy: -80px;
  top: 5%; left: -10%;
  --dur: 9s; --del: 0s; --gd: 6s;
}
.land-bg-c2 {
  width: 160px; height: 160px;
  background: radial-gradient(circle, rgba(255,64,129,.3) 0%, transparent 70%);
  --ox: 40px; --oy: 60px;
  top: 20%; right: -5%;
  --dur: 11s; --del: 2s; --gd: 7s;
}
.land-bg-c3 {
  width: 120px; height: 120px;
  background: radial-gradient(circle, rgba(0,188,212,.25) 0%, transparent 70%);
  --ox: -20px; --oy: 30px;
  bottom: 30%; left: 10%;
  --dur: 13s; --del: 4s; --gd: 8s;
}
/* Main container — editorial layout */
.landing-main {
  width: 100%; max-width: 390px;
  padding: 64px 24px 100px;
  display: flex; flex-direction: column;
  gap: 0;
  position: relative; z-index: 1;
}
/* Badge pill (above title) */
.land-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 9999px;
  background: rgba(124,77,255,.15);
  border: 1.5px solid rgba(124,77,255,.35);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #cdbdff; text-transform: uppercase;
  margin-bottom: 20px;
  animation: land-fade-up .5s ease both;
  align-self: flex-start;
}
/* Hero headline — left-aligned editorial */
.land-headline-wrap {
  display: flex; flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
  animation: land-fade-up .55s .1s ease both;
}
.land-title-choose {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(56px, 17vw, 72px);
  font-weight: 900;
  line-height: .9;
  letter-spacing: -.05em;
  color: #ffffff;
  display: block;
}
.land-title-or {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(28px, 9vw, 36px);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -.03em;
  color: #948ea1;
  display: block;
  margin-top: 2px;
}
.land-title-dare {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(56px, 17vw, 72px);
  font-weight: 900;
  line-height: .9;
  letter-spacing: -.05em;
  background: linear-gradient(135deg, #cdbdff 0%, #FF4081 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  display: block;
  margin-top: 2px;
}
.land-subtitle {
  font-size: 16px; line-height: 1.5;
  color: #948ea1; margin-top: 14px;
  animation: land-fade-up .55s .2s ease both;
}
/* Sign-in section */
.land-signin {
  display: flex; flex-direction: column;
  gap: 10px; width: 100%;
  margin-top: 40px;
  animation: land-fade-up .55s .3s ease both;
}
/* Play Now primary CTA */
.play-now-btn {
  width: 100%; height: 60px;
  background: linear-gradient(135deg, #7C4DFF 0%, #9C27B0 100%);
  border: none;
  border-radius: 9999px;
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: 22px; font-weight: 900; letter-spacing: .02em;
  color: #fff;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s;
  touch-action: manipulation;
  position: relative;
  overflow: hidden;
  animation: btn-glow-pulse 3s ease-in-out infinite;
  box-shadow: 0 8px 40px rgba(124,77,255,.5);
}
.play-now-btn::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.22) 50%, transparent 100%);
  transform: translateX(-100%) skewX(-15deg);
  animation: shimmer-sweep 3s ease-in-out infinite 1.5s;
}
.play-now-btn:active { transform: scale(.97); box-shadow: 0 4px 20px rgba(124,77,255,.4); }
/* Optional sign-in link (subtle, below Play Now) */
.land-signin-link {
  background: none; border: none;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing: .06em;
  color: #494455; cursor: pointer;
  padding: 6px 12px; border-radius: 8px;
  transition: color .15s;
  align-self: center;
}
.land-signin-link:hover { color: #948ea1; }
.land-signin-link:active { color: #cdbdff; }
.signin-hint {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: #494455; text-align: center;
}
/* Keep google-btn styles for backwards compat (cached old pages) */
.google-btn { display: none; }

/* Feature chips row */
.land-chips {
  display: flex; gap: 8px; justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 40px;
  animation: land-fade-up .55s .4s ease both;
}
.land-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 9999px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing: .06em;
  color: #cac3d8;
}
/* Category row */
.land-cats-label {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: #494455; text-transform: uppercase;
  margin-top: 32px; margin-bottom: 10px;
  animation: land-fade-up .55s .5s ease both;
}
.land-cats-scroll {
  display: flex; gap: 8px; overflow-x: auto;
  scrollbar-width: none; padding-bottom: 4px;
  animation: land-fade-up .55s .55s ease both;
}
.land-cats-scroll::-webkit-scrollbar { display: none; }
.land-cat-chip {
  padding: 7px 18px; border-radius: 9999px;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  white-space: nowrap; flex-shrink: 0;
}
/* Footer */
.land-footer {
  text-align: center;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .12em;
  color: #494455;
  margin-top: 48px;
  animation: land-fade-up .55s .6s ease both;
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
  injectStyles();

  const app = document.getElementById('app');
  if (!app) return;

  // If already signed in synchronously, go straight to home
  if (store.user) {
    router.navigate('/home', true);
    return;
  }

  // If Google redirect sign-in completes while on landing, go to home.
  // (Guest users stay on landing until they tap Play Now.)
  let _unsubscribeAuth = onAuthChange((user) => {
    if (user) {
      if (_unsubscribeAuth) { _unsubscribeAuth(); _unsubscribeAuth = null; }
      router.navigate('/home', true);
    }
  });

  app.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'landing-root';

  root.innerHTML = `
    <!-- Background depth -->
    <div class="land-bg-glow"></div>
    <div class="land-bg-circles">
      <div class="land-bg-c land-bg-c1"></div>
      <div class="land-bg-c land-bg-c2"></div>
      <div class="land-bg-c land-bg-c3"></div>
    </div>

    <main class="landing-main" id="app-main">

      <!-- Badge pill above title -->
      <div class="land-badge" aria-hidden="true">🎲 Party &middot; 2–8 Players</div>

      <!-- Editorial left-aligned headline -->
      <div class="land-headline-wrap">
        <span class="land-title-choose">CHOOSE</span>
        <span class="land-title-or">or</span>
        <span class="land-title-dare">DARE</span>
        <p class="land-subtitle">The finger-picker party game that decides who goes.</p>
      </div>

      <!-- CTA -->
      <section class="land-signin" aria-label="Start playing">
        <button class="play-now-btn" id="landing-play-btn" aria-label="Play Now">
          Play Now →
        </button>
        <p class="signin-hint">NO ACCOUNT NEEDED &middot; FREE &middot; ALL DEVICES</p>
        <button class="land-signin-link" id="landing-google-btn" aria-label="Sign in with Google to save progress">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.81c.87-2.6 3.3-4.5 6.16-4.5z" fill="#EA4335"/>
          </svg>
          Sign in to save progress
        </button>
      </section>

      <!-- Feature chips -->
      <div class="land-chips" aria-label="Features" role="list">
        <span class="land-chip" role="listitem">⚡ Fast Setup</span>
        <span class="land-chip" role="listitem">🃏 500+ Cards</span>
        <span class="land-chip" role="listitem">👥 Any Group</span>
        <span class="land-chip" role="listitem">🔞 18+ Mode</span>
      </div>

      <!-- Categories -->
      <p class="land-cats-label">Categories</p>
      <div class="land-cats-scroll" aria-label="Card categories">
        <span class="land-cat-chip" style="background:rgba(76,175,132,.15);color:#4CAF84">FRIENDLY</span>
        <span class="land-cat-chip" style="background:rgba(255,193,7,.15);color:#FFC107">PARTY</span>
        <span class="land-cat-chip" style="background:rgba(233,30,99,.15);color:#E91E63">COUPLES</span>
        <span class="land-cat-chip" style="background:rgba(244,67,54,.15);color:#F44336">DIRTY</span>
      </div>

      <!-- Footer -->
      <footer class="land-footer">18+ ONLY &middot; WORKS ON ANY DEVICE &middot; ALWAYS FREE</footer>

    </main>
  `;

  app.appendChild(root);

  // ── Play Now handler ────────────────────────────────────────────────────────
  function handlePlayNow() {
    // Unsubscribe BEFORE navigating to prevent the auth listener
    // from firing after we leave and redirecting away from /setup.
    if (_unsubscribeAuth) { _unsubscribeAuth(); _unsubscribeAuth = null; }
    // Use direct hash change — more reliable on mobile (hashchange event
    // is native browser behavior, cannot be blocked by JS issues).
    window.location.hash = '#/setup';
  }
  root.querySelector('#landing-play-btn').addEventListener('click', handlePlayNow);

  // ── Sign-in handler (optional) ───────────────────────────────────────────
  const btn = root.querySelector('#landing-google-btn');

  async function handleSignIn() {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = 'Redirecting…';

    try {
      await signInWithGoogle(); // triggers full-page redirect — never resolves
    } catch (err) {
      console.error('[landing] redirect error:', err);
      showToast('Sign-in failed. Check your connection and try again.', 'error');
      btn.disabled = false;
      btn.style.opacity = '';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.81c.87-2.6 3.3-4.5 6.16-4.5z" fill="#EA4335"/></svg> Sign in to save progress`;
    }
  }

  btn.addEventListener('click', handleSignIn);

  // Cleanup: unsubscribe auth listener AND remove button listener
  return () => {
    if (_unsubscribeAuth) { _unsubscribeAuth(); _unsubscribeAuth = null; }
    btn.removeEventListener('click', handleSignIn);
    root.querySelector('#landing-play-btn')?.removeEventListener('click', handlePlayNow);
  };
}
