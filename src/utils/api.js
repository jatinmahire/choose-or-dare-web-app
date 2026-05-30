// src/utils/api.js — HTTP client for the Cloudflare Worker API
// All authenticated calls get a fresh idToken injected automatically.
// VITE_WORKER_URL is injected at build time via import.meta.env.

import { getIdToken } from '../auth.js';

const WORKER = import.meta.env.VITE_WORKER_URL ?? '';

// ── Core fetch wrapper ──────────────────────────────────────────────────────

/**
 * Fetch a Worker endpoint with a fresh Bearer token.
 *
 * @param {string} path  - e.g. '/api/stats'
 * @param {object} opts  - fetch options (method, body, etc.)
 * @returns {Promise<any>} Parsed JSON response body
 * @throws {Error} on network failure or non-2xx HTTP status
 */
async function workerFetch(path, opts = {}) {
  const token = await getIdToken();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(opts.headers ?? {}),
  };

  const res = await fetch(`${WORKER}${path}`, { ...opts, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[api] ${res.status} ${path}: ${text}`);
  }

  return res.json();
}

/**
 * Fetch a public (unauthenticated) Worker endpoint.
 *
 * @param {string} path
 * @returns {Promise<any>}
 */
async function publicFetch(path) {
  const res = await fetch(`${WORKER}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[api] ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

// ── API surface ─────────────────────────────────────────────────────────────

export const api = {

  // ── Session ───────────────────────────────────────────────────────────────

  /**
   * Save a completed game session and all its rounds to D1.
   * Rate-limited to 10/hour server-side.
   *
   * @param {{ players, categories, rounds, totalRounds, playerCount }} session
   */
  saveSession(session) {
    return workerFetch('/api/save-session', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  // ── History ───────────────────────────────────────────────────────────────

  /**
   * Paginated game history for the current user.
   * @param {number} page - 1-indexed
   */
  getHistory(page = 1) {
    return workerFetch(`/api/history?page=${page}`);
  },

  // ── Stats ─────────────────────────────────────────────────────────────────

  /** Aggregate statistics for the current user. */
  getStats() {
    return workerFetch('/api/stats');
  },

  // ── Leaderboard ───────────────────────────────────────────────────────────

  /** Public leaderboard — no auth required, cached 5 min on CF edge.
   * @param {'all'|'month'} period */
  getLeaderboard(period = 'all') {
    return publicFetch(`/api/leaderboard?period=${period}`);
  },

  // ── Custom Cards ──────────────────────────────────────────────────────────

  /** List all custom cards created by the current user. */
  getCustomCards() {
    return workerFetch('/api/custom-cards');
  },

  /**
   * Create a new custom card.
   * @param {{ text, type, category, difficulty, is_adult_only }} card
   */
  saveCustomCard(card) {
    return workerFetch('/api/custom-cards', {
      method: 'POST',
      body: JSON.stringify(card),
    });
  },

  /**
   * Delete a custom card by ID. Server enforces uid ownership (no IDOR).
   * @param {number} id
   */
  deleteCustomCard(id) {
    return workerFetch(`/api/custom-cards/${id}`, { method: 'DELETE' });
  },

  // ── Cards ─────────────────────────────────────────────────────────────────

  /**
   * Get a random card matching the given filters.
   *
   * @param {string}   sessionId  - Current session ID (used to exclude played cards)
   * @param {string[]} categories - e.g. ['FRIENDLY', 'PARTY']
   * @param {boolean}  adult      - Include adult-only cards
   */
  getRandomCard(sessionId = '', categories = ['FRIENDLY'], adult = false) {
    const cats = categories.join(',');
    const params = new URLSearchParams({
      categories: cats,
      adult: adult ? '1' : '0',
      ...(sessionId ? { sessionId } : {}),
    });
    return workerFetch(`/api/cards/random?${params}`);
  },

  // ── Account ───────────────────────────────────────────────────────────────

  /**
   * Permanently delete the current user's account and all associated data.
   * Deletes in FK order: history → custom_cards → sessions → users.
   */
  deleteAccount() {
    return workerFetch('/api/account', { method: 'DELETE' });
  },
};
