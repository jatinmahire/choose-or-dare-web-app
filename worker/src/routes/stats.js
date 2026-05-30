// stats.js — TODO: implement
import { json } from 'itty-router';

// Export a plain handler function — itty-router v5 style
// router.all('/api/stats/*', stats) in index.js passes requests here
export default (request, env, ctx) =>
  json({ error: 'Not implemented', route: 'stats' }, { status: 501 });
