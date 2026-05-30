// leaderboard.js — TODO: implement
import { json } from 'itty-router';

// Export a plain handler function — itty-router v5 style
// router.all('/api/leaderboard/*', leaderboard) in index.js passes requests here
export default (request, env, ctx) =>
  json({ error: 'Not implemented', route: 'leaderboard' }, { status: 501 });
