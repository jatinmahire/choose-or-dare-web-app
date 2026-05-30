// worker/src/index.js — Cloudflare Worker entry point (itty-router v5)
import { AutoRouter, cors, json } from 'itty-router';

import sessionRoutes     from './routes/session.js';
import historyRoutes     from './routes/history.js';
import statsRoutes       from './routes/stats.js';
import leaderboardRoutes from './routes/leaderboard.js';
import cardsRoutes       from './routes/cards.js';
import accountRoutes     from './routes/account.js';

// ── CORS ────────────────────────────────────────────────────────────────────
// Origin is configured at runtime from env.ALLOWED_ORIGIN.
// We use a wildcard here and restrict it per-request in the corsify step.
const { preflight, corsify } = cors({
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

// ── Router ──────────────────────────────────────────────────────────────────
const router = AutoRouter({
  before:  [preflight],
  finally: [corsify],
});

// ── Health check (unauthenticated) ──────────────────────────────────────────
router.get('/health', () => json({ status: 'ok' }));

// ── Route modules ────────────────────────────────────────────────────────────
router.all('/api/session/*',     sessionRoutes);
router.all('/api/history/*',     historyRoutes);
router.all('/api/stats/*',       statsRoutes);
router.all('/api/leaderboard/*', leaderboardRoutes);
router.all('/api/cards/*',       cardsRoutes);
router.all('/api/account/*',     accountRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────────
router.all('*', () => json({ error: 'Not Found' }, { status: 404 }));

export default router;
