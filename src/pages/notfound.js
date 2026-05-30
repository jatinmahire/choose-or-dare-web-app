// src/pages/notfound.js — 404 page: fun, purple, premium dark feel

export default function renderNotFound(router) {
  const app = document.getElementById('app');
  if (!app) return;

  // Inject styles once
  if (!document.getElementById('nf-css')) {
    const s = document.createElement('style');
    s.id = 'nf-css';
    s.textContent = `
      @keyframes nf-float {
        0%, 100% { transform: translateY(0) rotate(-6deg); }
        50%       { transform: translateY(-14px) rotate(4deg); }
      }
      @keyframes nf-pulse-glow {
        0%, 100% { text-shadow: 0 0 40px rgba(124,77,255,.7), 0 0 80px rgba(124,77,255,.3); }
        50%       { text-shadow: 0 0 60px rgba(124,77,255,1), 0 0 120px rgba(124,77,255,.5); }
      }
      @keyframes nf-slide-up {
        from { transform: translateY(24px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .nf-root {
        min-height: 100dvh; background: #0A0A0F; color: #e6e0ee;
        font-family: 'Hanken Grotesk', system-ui, sans-serif;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 40px 24px; text-align: center;
        position: relative; overflow: hidden;
      }
      /* Subtle background pattern */
      .nf-root::before {
        content: '';
        position: fixed; inset: 0; pointer-events: none;
        background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,77,255,.18) 0%, transparent 70%),
                    radial-gradient(ellipse 40% 30% at 100% 100%, rgba(255,64,129,.08) 0%, transparent 60%);
      }
      .nf-emoji {
        font-size: 80px; line-height: 1;
        animation: nf-float 3.5s ease-in-out infinite;
        margin-bottom: 8px; filter: drop-shadow(0 8px 24px rgba(124,77,255,.4));
      }
      .nf-404 {
        font-family: 'Bricolage Grotesque', system-ui, sans-serif;
        font-size: 108px; font-weight: 900; letter-spacing:-.06em;
        color: #7C4DFF; line-height: .9;
        animation: nf-pulse-glow 3s ease-in-out infinite;
        margin-bottom: 16px; position: relative; z-index: 1;
      }
      .nf-title {
        font-family: 'Bricolage Grotesque', system-ui, sans-serif;
        font-size: 26px; font-weight: 800; color: #e6e0ee;
        letter-spacing: -.03em; margin-bottom: 12px;
        animation: nf-slide-up .5s cubic-bezier(.22,1,.36,1) .1s both;
        position: relative; z-index: 1;
      }
      .nf-sub {
        font-size: 15px; color: #948ea1; line-height: 1.6;
        margin-bottom: 32px; max-width: 280px;
        animation: nf-slide-up .5s cubic-bezier(.22,1,.36,1) .2s both;
        position: relative; z-index: 1;
      }
      .nf-actions {
        display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px;
        animation: nf-slide-up .5s cubic-bezier(.22,1,.36,1) .3s both;
        position: relative; z-index: 1;
      }
      .nf-home-btn {
        width: 100%; height: 54px; border-radius: 16px; border: none;
        background: linear-gradient(135deg, #7C4DFF, #9C27B0);
        color: #fff; font-family: 'Bricolage Grotesque', system-ui, sans-serif;
        font-size: 18px; font-weight: 900; cursor: pointer; letter-spacing: .02em;
        box-shadow: 0 4px 24px rgba(124,77,255,.5);
        transition: transform .12s, box-shadow .12s;
      }
      .nf-home-btn:active {
        transform: scale(.96);
        box-shadow: 0 2px 12px rgba(124,77,255,.4);
      }
      .nf-back-btn {
        width: 100%; height: 46px; border-radius: 14px;
        background: transparent; border: 1.5px solid rgba(255,255,255,.12);
        color: #948ea1; font-family: 'Hanken Grotesk', system-ui, sans-serif;
        font-size: 15px; font-weight: 600; cursor: pointer;
        transition: border-color .15s, color .15s;
      }
      .nf-back-btn:active { border-color: rgba(255,255,255,.25); color: #e6e0ee; }
      /* Floating mini emoji decorations */
      .nf-deco {
        position: fixed; pointer-events: none; font-size: 28px;
        opacity: .12; animation: nf-float var(--dur,4s) ease-in-out infinite;
        animation-delay: var(--del,0s);
      }
    `;
    document.head.appendChild(s);
  }

  app.innerHTML = `
    <div class="nf-root">
      <!-- Floating decorations -->
      <span class="nf-deco" style="top:8%;left:6%;--dur:4.2s;--del:0s">🎲</span>
      <span class="nf-deco" style="top:15%;right:8%;--dur:3.8s;--del:.8s;font-size:22px">🃏</span>
      <span class="nf-deco" style="bottom:20%;left:8%;--dur:5s;--del:.4s;font-size:22px">🎭</span>
      <span class="nf-deco" style="bottom:28%;right:6%;--dur:3.5s;--del:1.2s">🎲</span>
      <span class="nf-deco" style="top:50%;left:2%;--dur:6s;--del:.6s;font-size:18px">✨</span>
      <span class="nf-deco" style="top:40%;right:3%;--dur:4.5s;--del:1.5s;font-size:18px">🃏</span>

      <div class="nf-emoji">🎲</div>
      <div class="nf-404">404</div>
      <h1 class="nf-title">This room doesn't exist</h1>
      <p class="nf-sub">
        Looks like someone picked a dare that led here.
        Let's get you back in the game.
      </p>
      <div class="nf-actions">
        <button class="nf-home-btn" id="nf-home">Go Home 🏠</button>
        <button class="nf-back-btn" id="nf-back">← Go Back</button>
      </div>
    </div>
  `;

  app.querySelector('#nf-home').addEventListener('click', () => {
    router.navigate('/home');
  });

  app.querySelector('#nf-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else router.navigate('/home');
  });
}
