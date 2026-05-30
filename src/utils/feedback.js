// feedback.js — Sound, haptic, toast, and offline banner utilities
// All audio created via Web Audio API — no audio files required.
// All sounds gated by store.soundEnabled.
// All haptics gated by store.hapticsEnabled && navigator.vibrate.

import { store } from '../store.js';

// ─── Audio Context (lazy init to comply with autoplay policy) ──────────────
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers suspend on first load until user gesture)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

/**
 * iOS Safari: AudioContext starts in 'suspended' state and NEVER auto-resumes.
 * Must be called from main.js once — attaches a one-shot touchstart listener
 * that unlocks the context on first user touch.
 * Safe to call on non-iOS; does nothing if already running.
 */
export function initAudioUnlock() {
  function unlock() {
    if (_audioCtx?.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    } else if (!_audioCtx) {
      // Pre-create and immediately suspend so first beep() has 0 latency
      try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // On iOS the act of creating inside a touch event is enough to unlock
      } catch (_) { /* non-critical */ }
    }
  }
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  // Also cover click (desktop fallback / PWA installs)
  document.addEventListener('click',      unlock, { once: true, passive: true });
}


// ─── Core Beep Primitive ───────────────────────────────────────────────────
/**
 * Plays a single synthesized tone.
 *
 * @param {number} freq  - Frequency in Hz
 * @param {number} dur   - Duration in seconds
 * @param {string} type  - OscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth'
 * @param {number} vol   - Peak gain volume (0–1)
 * @param {number} [startOffset=0] - Delay from now in seconds
 */
export function beep(freq = 440, dur = 0.12, type = 'sine', vol = 0.25, startOffset = 0) {
  if (!store.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + startOffset;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type            = type;
    osc.frequency.value = freq;

    // Attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    // Exponential decay to silence
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.start(now);
    osc.stop(now + dur + 0.01);
  } catch (_) {
    // Fail silently — audio is non-critical
  }
}

// ─── Sound Library ─────────────────────────────────────────────────────────
export const sound = {
  /** Short tick for countdown timer */
  tick() {
    beep(880, 0.06, 'square', 0.15);
  },

  /** 3-note ascending melody for winner */
  winner() {
    beep(523, 0.12, 'sine', 0.30, 0.00); // C5
    beep(659, 0.12, 'sine', 0.30, 0.14); // E5
    beep(784, 0.22, 'sine', 0.35, 0.28); // G5
  },

  /** Card flip swoosh */
  flip() {
    beep(300, 0.08, 'triangle', 0.20, 0.00);
    beep(600, 0.06, 'triangle', 0.15, 0.06);
  },

  /** Vote cast confirmation */
  vote() {
    beep(440, 0.10, 'sine', 0.20);
  },

  /** Positive confirmation ding */
  ding() {
    beep(1046, 0.18, 'sine', 0.25, 0.00); // C6
    beep(1318, 0.14, 'sine', 0.20, 0.10); // E6
  },

  /** Error / invalid action buzz */
  error() {
    beep(150, 0.18, 'sawtooth', 0.25, 0.00);
    beep(130, 0.18, 'sawtooth', 0.25, 0.10);
  },
};

// ─── Haptic Library ────────────────────────────────────────────────────────
export const haptic = {
  light() {
    if (store.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(25);
    }
  },

  medium() {
    if (store.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  heavy() {
    if (store.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(90);
    }
  },

  winner() {
    if (store.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate([0, 80, 40, 160]);
    }
  },

  error() {
    if (store.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate([0, 70, 30, 70]);
    }
  },
};

// ─── Toast System ──────────────────────────────────────────────────────────
/**
 * Ensures the toast container exists in the DOM, creating it if necessary.
 * @returns {HTMLElement}
 */
function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Shows a toast notification.
 *
 * @param {string} msg        - Message to display
 * @param {'info'|'success'|'error'|'warning'} type - Visual style
 * @param {number} dur        - Auto-dismiss duration in ms (default 2800)
 */
export function showToast(msg, type = 'info', dur = 2800) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = msg;

  // Apply type-specific styling on top of the base .toast class
  if (type === 'success') {
    toast.classList.add('toast-success');
  } else if (type === 'error') {
    toast.classList.add('toast-error');
    sound.error();
    haptic.error();
  } else if (type === 'warning') {
    toast.classList.add('toast-warning');
  }

  container.appendChild(toast);

  // Mirror message to dedicated aria-live region for reliable SR announcement
  const liveRegion = document.getElementById('toast-live');
  if (liveRegion) {
    liveRegion.textContent = '';
    // Tiny delay so the DOM change is detected by the live region observer
    requestAnimationFrame(() => { liveRegion.textContent = msg; });
  }

  // Auto-remove
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 220ms ease, transform 220ms ease';
    setTimeout(() => toast.remove(), 230);
  };

  const timer = setTimeout(removeToast, dur);

  // Allow tap-to-dismiss
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    removeToast();
  }, { once: true });
}

// ─── Offline Banner ────────────────────────────────────────────────────────
/**
 * Injects a persistent offline banner that slides in when the browser loses
 * network connectivity and slides back out when it reconnects.
 *
 * @returns {{ destroy: () => void }}
 */
export function initOfflineBanner() {
  let banner = document.getElementById('offline-banner');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.textContent = '⚠️  You are offline — some features may be unavailable';

    Object.assign(banner.style, {
      position:        'fixed',
      top:             '0',
      left:            '0',
      right:           '0',
      zIndex:          '9999',
      background:      '#FF5252',
      color:           '#fff',
      fontSize:        '13px',
      fontWeight:      '600',
      textAlign:       'center',
      padding:         '10px 16px',
      transform:       'translateY(-110%)',
      transition:      'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
    });

    document.body.appendChild(banner);
  }

  function onOffline() {
    banner.style.transform = 'translateY(0)';
  }

  function onOnline() {
    banner.style.transform = 'translateY(-110%)';
    showToast('Back online!', 'success', 2000);
  }

  // Set initial state
  if (!navigator.onLine) onOffline();

  window.addEventListener('offline', onOffline);
  window.addEventListener('online',  onOnline);

  return {
    destroy() {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online',  onOnline);
      banner.remove();
    },
  };
}

// ─── Pull-to-refresh ────────────────────────────────────────────────────────
/**
 * Attach pull-to-refresh behaviour to the window (document body scroll).
 *
 * @param {HTMLElement} indicatorEl  - Element shown during pull (text/spinner)
 * @param {() => Promise<void>} onRefresh - Async callback to reload data
 * @returns {{ destroy: () => void }}
 */
export function initPullToRefresh(indicatorEl, onRefresh) {
  let startY     = 0;
  let pulling    = false;
  let refreshing = false;

  function onTouchStart(e) {
    if (window.scrollY === 0) startY = e.touches[0].clientY;
    else startY = 0;
  }

  function onTouchMove(e) {
    if (!startY || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 60) {
      pulling = true;
      indicatorEl.textContent = '\u2191 Release to refresh';
      indicatorEl.classList.add('visible');
    } else if (dy > 20) {
      indicatorEl.textContent = '\u2193 Pull to refresh';
      indicatorEl.classList.add('visible');
    } else {
      indicatorEl.classList.remove('visible');
    }
  }

  async function onTouchEnd() {
    if (!pulling) { startY = 0; return; }
    pulling    = false;
    startY     = 0;
    refreshing = true;
    indicatorEl.textContent = '\u27f3 Refreshing\u2026';

    try {
      await onRefresh();
    } finally {
      refreshing = false;
      setTimeout(() => indicatorEl.classList.remove('visible'), 500);
    }
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove',  onTouchMove,  { passive: true });
  window.addEventListener('touchend',   onTouchEnd,   { passive: true });

  return {
    destroy() {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    },
  };
}

// ─── Infinite scroll ────────────────────────────────────────────────────────
/**
 * Watch a sentinel element with IntersectionObserver.
 * Fires onLoadMore() whenever the sentinel enters the viewport.
 *
 * @param {HTMLElement} sentinelEl   - Empty div at end of scrollable list
 * @param {() => void}  onLoadMore  - Callback to load next page
 * @param {string}     [rootMargin] - IO rootMargin (default '200px')
 * @returns {{ disconnect: () => void }}
 */
export function addInfiniteScroll(sentinelEl, onLoadMore, rootMargin = '200px') {
  const observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
    { rootMargin }
  );
  observer.observe(sentinelEl);
  return { disconnect: () => observer.disconnect() };
}