// session.js — TODO: implement
import { json } from 'itty-router';

// Export a plain handler function — itty-router v5 style
// router.all('/api/session/*', session) in index.js passes requests here
export default (request, env, ctx) =>
  json({ error: 'Not implemented', route: 'session' }, { status: 501 });
