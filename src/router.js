// router.js — Hash-based client-side router with auth guard and param support

import { store } from './store.js';

/**
 * Minimal hash-based SPA router.
 *
 * Routes are registered with optional :param segments.
 * Auth-guarded routes redirect to #/landing if store.user is null.
 * Each page handler may return a cleanup function that is called before
 * the next render (for removing listeners, timers, etc.).
 *
 * Usage:
 *   const router = new Router();
 *   router.register('/', homePage,    true);   // auth-guarded
 *   router.register('/landing', landingPage, false);
 *   router.init(document.getElementById('app'));
 */
export class Router {
  constructor() {
    /** @type {Array<{pattern: RegExp, paramNames: string[], handler: Function, auth: boolean}>} */
    this._routes = [];

    /** Cleanup function returned by the previous page render */
    this._cleanup = null;

    /** The DOM element that page content is mounted into */
    this._container = null;
  }

  // ── Route Registration ─────────────────────────────────────────────────

  /**
   * Register a route.
   *
   * @param {string}   pattern  - Path pattern, e.g. '/game/:sessionId'
   * @param {Function} handler  - Page factory: (params, router) => Element | void
   *                              May return a cleanup function.
   * @param {boolean}  auth     - If true, redirect to /landing when not signed in
   */
  register(pattern, handler, auth = true) {
    // Parse :paramName segments from the pattern string
    const paramNames = [];
    const regexStr = pattern
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, (c) =>
        // Escape all regex special chars EXCEPT our own : syntax
        c === ':' ? c : `\\${c}`
      )
      // Replace :paramName with a named capture group
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    const regex = new RegExp(`^${regexStr}$`);
    this._routes.push({ pattern: regex, paramNames, handler, auth });
    return this; // allow chaining
  }

  // ── Route Matching ─────────────────────────────────────────────────────

  /**
   * Find the first route matching path and extract URL params.
   *
   * @param {string} path - e.g. '/game/abc-123'
   * @returns {{ route: object, params: object } | null}
   */
  match(path) {
    for (const route of this._routes) {
      const m = path.match(route.pattern);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  /**
   * Navigate to a hash path, pushing (or replacing) a history entry.
   *
   * @param {string}  path    - e.g. '/home' (the # prefix is added automatically)
   * @param {boolean} replace - Use replaceState instead of pushState
   */
  navigate(path, replace = false) {
    const hash = '#' + path;
    if (replace) {
      history.replaceState(null, '', hash);
    } else {
      history.pushState(null, '', hash);
    }
    this._render(path);
  }

  /**
   * Go back one step in the browser history.
   */
  back() {
    history.back();
  }

  // ── Initialisation ─────────────────────────────────────────────────────

  /**
   * Attach the router to a DOM container and start listening for navigation.
   * Call this once after all routes have been registered.
   *
   * @param {HTMLElement} container
   */
  init(container) {
    this._container = container;

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', () => {
      const path = this._getHashPath();
      this._render(path);
    });

    // Render the current URL on load
    this._render(this._getHashPath());
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Extract the path portion from the current window hash.
   * Falls back to '/' when no hash is present.
   *
   * @returns {string} e.g. '/home' or '/'
   */
  _getHashPath() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return '/';
    return hash.slice(1); // strip leading '#'
  }

  /**
   * Run cleanup from the previous page, clear the container, check the auth
   * guard, then mount the matched page — or show an error fallback UI.
   *
   * @param {string} path
   */
  async _render(path) {
    // ── 1. Cleanup previous page ─────────────────────────────────────────
    if (typeof this._cleanup === 'function') {
      try {
        this._cleanup();
      } catch (e) {
        console.warn('[router] cleanup error:', e);
      }
    }
    this._cleanup = null;

    // ── 2. Clear the container ───────────────────────────────────────────
    if (this._container) {
      this._container.innerHTML = '';
    }

    // ── 3. Match route ───────────────────────────────────────────────────
    const result = this.match(path);

    if (!result) {
      // No route matched → render 404
      this._renderNotFound();
      return;
    }

    const { route, params } = result;

    // ── 4. Auth guard ────────────────────────────────────────────────────
    if (route.auth && !store.user) {
      console.debug(`[router] auth guard: redirecting ${path} → /landing`);
      this.navigate('/landing', true);
      return;
    }

    // ── 5. Mount page ────────────────────────────────────────────────────
    try {
      const cleanup = await route.handler(params, this);
      // Store cleanup fn if the handler returned one
      if (typeof cleanup === 'function') {
        this._cleanup = cleanup;
      }
    } catch (err) {
      console.error('[router] render error:', err);
      this._renderError(err);
    }
  }

  /**
   * Renders a minimal 404 fallback UI into the container.
   */
  _renderNotFound() {
    if (!this._container) return;
    this._container.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:100dvh;padding:24px;
        text-align:center;color:#EEEEF4;background:#0A0A0F;
      ">
        <div style="font-size:56px;margin-bottom:12px;">🤷</div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">Page Not Found</h1>
        <p style="color:rgba(238,238,244,0.55);margin:0 0 24px;">
          That route doesn't exist.
        </p>
        <button
          id="router-404-home"
          onclick="location.hash='#/'"
          style="
            height:48px;padding:0 24px;border-radius:12px;border:none;
            background:#7C4DFF;color:#fff;font-size:15px;font-weight:600;cursor:pointer;
          "
        >Go Home</button>
      </div>
    `;
  }

  /**
   * Renders a minimal error fallback UI into the container.
   * @param {Error} err
   */
  _renderError(err) {
    if (!this._container) return;
    // Static shell uses innerHTML; message injected via textContent (XSS-safe)
    this._container.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:100dvh;padding:24px;
        text-align:center;color:#EEEEF4;background:#0A0A0F;
      ">
        <div style="font-size:52px;margin-bottom:12px;">⚠️</div>
        <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;">Something went wrong</h1>
        <p id="router-err-msg" style="color:rgba(238,238,244,0.55);font-size:13px;margin:0 0 24px;max-width:280px;word-break:break-word;"></p>
        <button
          id="router-error-home"
          onclick="location.hash='#/'"
          style="
            height:48px;padding:0 24px;border-radius:12px;border:none;
            background:#7C4DFF;color:#fff;font-size:15px;font-weight:600;cursor:pointer;
          "
        >Go Home</button>
      </div>
    `;
    // Safe: textContent never executes HTML/scripts
    const msgEl = this._container.querySelector('#router-err-msg');
    if (msgEl) msgEl.textContent = err?.message || 'An unexpected error occurred.';
  }

}

/** Singleton router instance — import and use throughout the app. */
export const router = new Router();
