// device.js — Mobile detection and landscape block utilities

/**
 * Returns true if the current device is a mobile/touch device.
 * Requires: hardware touch support AND (narrow screen OR mobile user-agent).
 */
export function isMobile() {
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  const narrowScreen = screen.width <= 768;

  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
    navigator.userAgent
  );

  return hasTouch && (narrowScreen || mobileUA);
}

/**
 * Returns true if the current orientation is landscape.
 */
export function isLandscape() {
  if (window.matchMedia) {
    return window.matchMedia('(orientation: landscape)').matches;
  }
  // Fallback: compare dimensions
  return window.innerWidth > window.innerHeight;
}

/**
 * Creates and injects a fixed full-screen overlay that appears when the device
 * is held in landscape orientation. Listens to orientationchange and resize
 * events, showing/hiding accordingly.
 *
 * @returns {{ destroy: () => void }} — call destroy() to clean up listeners.
 */
export function initLandscapeBlock() {
  // Reuse existing overlay if already created
  let overlay = document.getElementById('landscape-warning');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'landscape-warning';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div style="font-size:52px;margin-bottom:12px;">📱</div>
      <p style="font-size:18px;font-weight:700;margin:0 0 8px;color:#EEEEF4;">
        Rotate Your Phone
      </p>
      <p style="font-size:14px;margin:0;color:rgba(238,238,244,0.55);">
        Choose or Dare is designed for portrait mode
      </p>
    `;

    // Inline styles as a safety fallback if CSS hasn't loaded yet
    Object.assign(overlay.style, {
      position:       'fixed',
      inset:          '0',
      zIndex:         '10000',
      display:        'none',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      textAlign:      'center',
      padding:        '24px',
      background:     '#0A0A0F',
    });

    document.body.appendChild(overlay);
  }

  function update() {
    if (isLandscape() && isMobile()) {
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  // Initial check
  update();

  // Listen for orientation/resize events
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);

  // Support matchMedia listener for modern browsers
  let mql = null;
  if (window.matchMedia) {
    mql = window.matchMedia('(orientation: landscape)');
    const mqlHandler = () => update();
    if (mql.addEventListener) {
      mql.addEventListener('change', mqlHandler);
    } else {
      // Safari < 14 fallback
      mql.addListener(mqlHandler);
    }
  }

  return {
    destroy() {
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', update);
        } else {
          mql.removeListener(update);
        }
      }
      overlay.remove();
    },
  };
}
