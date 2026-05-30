// worker/src/routes/cards.js
// GET  /api/cards/random        - random card, excludes used session cards
// GET  /api/custom-cards        - user's custom cards
// POST /api/custom-cards        - create custom card (sanitized)
// DELETE /api/custom-cards/:id  - delete own card (uid guard prevents IDOR)
import { json, Router } from "itty-router";
import { query, run, first } from "../db.js";
import { requireAuth } from "../auth.js";

async function getRandomCard(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  const url = new URL(request.url);

  // Uppercase categories to match DB values (FRIENDLY, PARTY, COUPLES, DIRTY)
  const categories = (url.searchParams.get("categories") ?? "FRIENDLY")
    .split(",")
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);

  // adult=1 → include adult cards; otherwise only non-adult
  const isAdult = url.searchParams.get("adult") === "1" ? [0, 1] : [0];

  // usedIds: comma-separated integer card IDs already seen this session
  // The history table stores card_text (not card_id), so anti-repeat is
  // handled client-side by passing already-used IDs as query params.
  const usedIds = (url.searchParams.get("usedIds") ?? "")
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n > 0);

  const catPH   = categories.map(() => "?").join(",");
  const adultPH = isAdult.map(() => "?").join(",");

  let sql, params;

  if (usedIds.length > 0) {
    const usedPH = usedIds.map(() => "?").join(",");
    sql = `SELECT id, text, type, category, difficulty, is_adult_only
           FROM cards
           WHERE category IN (${catPH})
             AND is_adult_only IN (${adultPH})
             AND id NOT IN (${usedPH})
           ORDER BY RANDOM()
           LIMIT 1`;
    params = [...categories, ...isAdult, ...usedIds];
  } else {
    sql = `SELECT id, text, type, category, difficulty, is_adult_only
           FROM cards
           WHERE category IN (${catPH})
             AND is_adult_only IN (${adultPH})
           ORDER BY RANDOM()
           LIMIT 1`;
    params = [...categories, ...isAdult];
  }

  const card = await first(env, sql, params);
  if (!card) return json({ error: "No cards available" }, { status: 404 });

  // Increment usage counter (fire-and-forget, don't block response)
  env.DB.prepare("UPDATE cards SET times_used = times_used + 1 WHERE id = ?")
    .bind(card.id)
    .run()
    .catch(() => {}); // non-critical, swallow errors

  return json({ card });
}

async function getCustomCards(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;
  const { results } = await query(env,
    "SELECT id, text, type, category, difficulty, is_adult_only, created_at FROM custom_cards WHERE uid = ? ORDER BY created_at DESC",
    [user.uid]);
  return json({ cards: results ?? [] });
}

async function saveCustomCard(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }); }
  const text = String(body.text ?? '').replace(/<[^>]*>/g,'').replace(/[<>"'&]/g,'').trim().slice(0, 150);
  if (text.length < 10) return json({ error: 'Card text must be at least 10 characters' }, { status: 400 });
  // Validate type against known values (client sends TRUTH or DARE)
  const VALID_TYPES = ['TRUTH', 'DARE'];
  const cardType = VALID_TYPES.includes(String(body.type ?? '').toUpperCase())
    ? String(body.type).toUpperCase()
    : 'DARE';
  // Validate category against known values (not arbitrary user string)
  const VALID_CATS = ['FRIENDLY', 'PARTY', 'COUPLES', 'DIRTY', 'CUSTOM'];
  const category = VALID_CATS.includes(String(body.category ?? '').toUpperCase())
    ? String(body.category).toUpperCase()
    : 'CUSTOM';
  const difficulty = Math.min(5, Math.max(1, parseInt(body.difficulty ?? 3, 10)));
  const isAdult = body.is_adult_only ? 1 : 0;
  const { meta } = await run(env,
    "INSERT INTO custom_cards (uid, text, type, category, difficulty, is_adult_only) VALUES (?,?,?,?,?,?)",
    [user.uid, text, cardType, category, difficulty, isAdult]);
  return json({ success: true, id: meta.last_row_id }, { status: 201 });
}

async function deleteCustomCard(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;
  const id = parseInt(request.params?.id ?? "0", 10);
  if (!id) return json({ error: "Invalid card id" }, { status: 400 });
  const { meta } = await run(env, "DELETE FROM custom_cards WHERE id = ? AND uid = ?", [id, user.uid]);
  if (meta.changes === 0) return json({ error: "Card not found or not yours" }, { status: 404 });
  return json({ success: true });
}

const router = Router({ base: "/api" });
router.get("/cards/random", getRandomCard);
router.get("/custom-cards", getCustomCards);
router.post("/custom-cards", saveCustomCard);
router.delete("/custom-cards/:id", deleteCustomCard);
export default router.fetch;
