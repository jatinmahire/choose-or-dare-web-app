// worker/src/routes/account.js
// DELETE /api/account   - delete all user data (ordered for FK safety)
// DELETE /api/history   - clear history + reset user stats (account stays)
import { json, Router } from "itty-router";
import { run } from "../db.js";
import { requireAuth } from "../auth.js";

async function deleteAccount(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  // Delete in dependency order: history → custom_cards → sessions → users
  await run(env, "DELETE FROM history      WHERE uid = ?",      [user.uid]);
  await run(env, "DELETE FROM custom_cards WHERE uid = ?",      [user.uid]);
  await run(env, "DELETE FROM sessions     WHERE host_uid = ?", [user.uid]);
  await run(env, "DELETE FROM users        WHERE uid = ?",      [user.uid]);

  return json({ success: true, message: "Account and all data deleted" });
}

async function clearHistory(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  // Remove all history rows for this user
  await run(env, "DELETE FROM history WHERE uid = ?", [user.uid]);

  // Reset aggregate stats on the user row so leaderboard stays accurate
  await run(
    env,
    `UPDATE users
     SET total_sessions = 0,
         total_dares    = 0,
         total_truths   = 0,
         bravery_score  = 0
     WHERE uid = ?`,
    [user.uid]
  );

  return json({ success: true, message: "History cleared" });
}

const router = Router({ base: "/api" });
router.delete("/account", deleteAccount);
router.delete("/history",  clearHistory);
export default router.fetch;
