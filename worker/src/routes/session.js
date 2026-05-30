// worker/src/routes/session.js — Save session and get history
import { json } from 'itty-router';
import { query, run, first, upsertUser, generateId } from '../db.js';
import { requireAuth } from '../auth.js';

// ── POST /api/save-session ──────────────────────────────────────────────────
async function saveSession(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { players, categories, rounds, totalRounds, playerCount } = body;

  // Validate required fields
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return json({ error: 'rounds must be a non-empty array' }, { status: 400 });
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    return json({ error: 'categories must be a non-empty array' }, { status: 400 });
  }

  // Upsert user row on first save
  await upsertUser(env, user.uid, user.name, user.email);

  const sessionId  = generateId();
  const now        = Math.floor(Date.now() / 1000);
  const pCount     = Number(playerCount) || (Array.isArray(players) ? players.length : 1);
  const totalRnds  = Number(totalRounds) || rounds.length;
  const catsJson   = JSON.stringify(categories);

  // Insert session row
  await run(
    env,
    `INSERT INTO sessions (id, host_uid, started_at, ended_at, player_count, total_rounds, categories)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, user.uid, now, now, pCount, totalRnds, catsJson]
  );

  // Insert one history row per round (batch via individual prepared statements)
  const stmt = env.DB.prepare(
    `INSERT INTO history
       (session_id, uid, player_name, card_text, card_type, category, result, timestamp, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const batch = rounds.map((r) =>
    stmt.bind(
      sessionId,
      user.uid,
      String(r.playerName   ?? '').slice(0, 50),
      String(r.cardText     ?? '').slice(0, 150),
      String(r.cardType     ?? 'dare').slice(0, 10),
      String(r.category     ?? '').slice(0, 30),
      ['DONE', 'SKIPPED', 'PENDING'].includes(r.result) ? r.result : 'PENDING',
      Number(r.timestamp    ?? now),
      Number(r.durationSecs ?? 0)
    )
  );
  await env.DB.batch(batch);

  // Update user aggregate stats
  const dones    = rounds.filter(r => r.result === 'DONE').length;
  const dares    = rounds.filter(r => r.cardType === 'dare').length;
  const truths   = rounds.filter(r => r.cardType === 'choose').length;
  const skipped  = rounds.filter(r => r.result === 'SKIPPED').length;
  const bravery  = dares > 0 ? Math.round((dones / (dones + skipped)) * 100) : 0;

  await run(
    env,
    `UPDATE users
     SET total_sessions = total_sessions + 1,
         total_dares    = total_dares    + ?,
         total_truths   = total_truths   + ?,
         bravery_score  = ROUND(
           (bravery_score * total_sessions + ?) / (total_sessions + 1), 2
         )
     WHERE uid = ?`,
    [dares, truths, bravery, user.uid]
  );

  return json({ success: true, sessionId });
}

// ── GET /api/history ────────────────────────────────────────────────────────
async function getHistory(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  const url    = new URL(request.url);
  const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const { results } = await query(
    env,
    `SELECT h.id, h.session_id, h.player_name, h.card_text, h.card_type,
            h.category, h.result, h.timestamp, h.duration_seconds,
            s.categories, s.player_count
     FROM   history h
     JOIN   sessions s ON s.id = h.session_id
     WHERE  h.uid = ?
     ORDER  BY h.timestamp DESC
     LIMIT  ? OFFSET ?`,
    [user.uid, limit, offset]
  );

  // Total count for pagination
  const countRow = await first(
    env,
    `SELECT COUNT(*) AS total FROM history WHERE uid = ?`,
    [user.uid]
  );

  return json({
    history:  results ?? [],
    total:    countRow?.total ?? 0,
    page,
    pageSize: limit,
  });
}

// ── Router export ───────────────────────────────────────────────────────────
import { Router } from 'itty-router';
const router = Router({ base: '/api' });

router.post('/save-session', saveSession);
router.get('/history',       getHistory);

export default router.fetch;
