// worker/src/routes/leaderboard.js
// Public leaderboard (no auth). Cached 5 min via CF Cache API.
import { json, Router } from "itty-router";
import { query } from "../db.js";

const CACHE_TTL = 300;
const CACHE_KEY = new Request("https://cache.internal/leaderboard-v1");

async function getLeaderboard(request, env, ctx) {
  const cache = caches.default;
  const cached = await cache.match(CACHE_KEY);
  if (cached) {
    const body = await cached.json();
    return json(body, { headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=300" } });
  }
  const { results } = await query(env,
    "SELECT uid, display_name, photo_url, total_sessions, total_dares, total_truths, bravery_score FROM users ORDER BY bravery_score DESC LIMIT 50", []);
  const payload = { leaderboard: results ?? [], cachedAt: Date.now() };
  const cr = new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
  });
  if (ctx && ctx.waitUntil) { ctx.waitUntil(cache.put(CACHE_KEY, cr.clone())); }
  else { await cache.put(CACHE_KEY, cr.clone()); }
  return json(payload, { headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=300" } });
}

const router = Router({ base: "/api" });
router.get("/leaderboard", getLeaderboard);
export default router.fetch;
