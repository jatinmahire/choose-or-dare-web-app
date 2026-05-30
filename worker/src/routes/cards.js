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
  const categories = (url.searchParams.get("categories") ?? "friendly").split(",").filter(Boolean);
  const isAdult = url.searchParams.get("adult") === "1" ? [0,1] : [0];
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const catPH = categories.map(() => "?").join(",");
  const adultPH = isAdult.map(() => "?").join(",");
  let sql, params;
  if (sessionId) {
    sql = "SELECT id, text, type, category, difficulty, is_adult_only FROM cards WHERE category IN ("+catPH+") AND is_adult_only IN ("+adultPH+") AND id NOT IN (SELECT id FROM history WHERE session_id=?) ORDER BY RANDOM() LIMIT 1";
    params = [...categories, ...isAdult, sessionId];
  } else {
    sql = "SELECT id, text, type, category, difficulty, is_adult_only FROM cards WHERE category IN ("+catPH+") AND is_adult_only IN ("+adultPH+") ORDER BY RANDOM() LIMIT 1";
    params = [...categories, ...isAdult];
  }
  const card = await first(env, sql, params);
  if (!card) return json({ error: "No cards available" }, { status: 404 });
  await run(env, "UPDATE cards SET times_used = times_used + 1 WHERE id = ?", [card.id]);
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
  const text = String(body.text ?? "").replace(/<[^>]*>/g,"").replace(/[<>"'&]/g,"").trim().slice(0,150);
  if (text.length < 5) return json({ error: "Card text must be at least 5 characters" }, { status: 400 });
  const cardType = ["dare","choose"].includes(body.type) ? body.type : "dare";
  const category = String(body.category ?? "CUSTOM").slice(0,30);
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
