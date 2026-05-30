// worker/src/routes/account.js
// DELETE /api/account - delete all user data (ordered for FK safety)
import { json, Router } from "itty-router";
import { run } from "../db.js";
import { requireAuth } from "../auth.js";

async function deleteAccount(request, env) {
  const [user, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  // Delete in dependency order: history -> custom_cards -> sessions -> users
  await run(env, "DELETE FROM history      WHERE uid = ?",        [user.uid]);
  await run(env, "DELETE FROM custom_cards WHERE uid = ?",        [user.uid]);
  await run(env, "DELETE FROM sessions     WHERE host_uid = ?",   [user.uid]);
  await run(env, "DELETE FROM users        WHERE uid = ?",        [user.uid]);

  return json({ success: true, message: "Account and all data deleted" });
}

const router = Router({ base: "/api" });
router.delete("/account", deleteAccount);
export default router.fetch;
