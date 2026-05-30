// worker/src/routes/history.js
// GET /api/history is handled in session.js (same router module)
// This file re-exports that router for the index.js wiring.
export { default } from "./session.js";
