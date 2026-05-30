// worker/src/routes/stats.js — User statistics aggregation
import { json, Router } from 'itty-router';
import { query, first } from '../db.js';
import { requireAuth }  from '../auth.js';

// ── Streak calculation ──────────────────────────────────────────────────────
/**
 * Computes currentStreak and bestStreak from an ordered array of dare results.
 * Streak = consecutive DONE dare results. Any SKIPPED dare resets the streak.
 * 'choose' cards are ignored (don't break or extend a dare streak).
 *
 * @param {{ card_type: string, result: string }[]} rows - ordered newest-first
 * @returns {{ currentStreak: number, bestStreak: number }}
 */
function computeStreaks(rows) {
  // Reverse so we process oldest→newest for streak logic
  const dareRows = rows
    .slice()
    .reverse()
    .filter(r => r.card_type === 'dare');

  let best    = 0;
  let current = 0;

  for (const r of dareRows) {
    if (r.result === 'DONE') {
      current++;
      if (current > best) best = current;
    } else if (r.result === 'SKIPPED') {
      current = 0; // reset on skip
    }
    // PENDING rows are ignored
  }

  return { currentStreak: current, bestStreak: best };
}

// ── GET /api/stats ──────────────────────────────────────────────────────────
async function getStats(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  // Pull all history rows for this user (needed for streak calculation)
  const { results: rows } = await query(
    env,
    `SELECT card_type, category, result
     FROM   history
     WHERE  uid = ?
     ORDER  BY timestamp DESC`,
    [user.uid]
  );

  if (!rows || rows.length === 0) {
    return json({
      totalDares:        0,
      totalTruths:       0,
      daresCompleted:    0,
      daresSkipped:      0,
      braveryScore:      0,
      currentStreak:     0,
      bestStreak:        0,
      categoryBreakdown: {},
    });
  }

  // Aggregates
  const totalDares     = rows.filter(r => r.card_type === 'dare').length;
  const totalTruths    = rows.filter(r => r.card_type === 'choose').length;
  const daresCompleted = rows.filter(r => r.card_type === 'dare' && r.result === 'DONE').length;
  const daresSkipped   = rows.filter(r => r.card_type === 'dare' && r.result === 'SKIPPED').length;

  const braveryScore = totalDares > 0
    ? Math.round((daresCompleted / (daresCompleted + daresSkipped || 1)) * 100)
    : 0;

  const { currentStreak, bestStreak } = computeStreaks(rows);

  // Category breakdown: { [category]: { total, done, skipped } }
  const categoryBreakdown = {};
  for (const r of rows) {
    const cat = r.category || 'unknown';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { total: 0, done: 0, skipped: 0 };
    }
    categoryBreakdown[cat].total++;
    if (r.result === 'DONE')    categoryBreakdown[cat].done++;
    if (r.result === 'SKIPPED') categoryBreakdown[cat].skipped++;
  }

  return json({
    totalDares,
    totalTruths,
    daresCompleted,
    daresSkipped,
    braveryScore,
    currentStreak,
    bestStreak,
    categoryBreakdown,
  });
}

// ── Router export ───────────────────────────────────────────────────────────
const router = Router({ base: '/api' });
router.get('/stats', getStats);
export default router.fetch;
