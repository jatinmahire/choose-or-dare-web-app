// worker/src/db.js — D1 database helpers
// All queries are parameterized. String interpolation in SQL is NEVER used.

// ── Query helpers ───────────────────────────────────────────────────────────

/**
 * Run a SELECT (returns all rows).
 * @param {Env}    env
 * @param {string} sql    - Parameterized SQL
 * @param {any[]}  params - Bound values
 * @returns {Promise<{results: any[], success: boolean}>}
 */
export function query(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).all();
}

/**
 * Run a mutating statement (INSERT / UPDATE / DELETE).
 * @returns {Promise<{success: boolean, meta: object}>}
 */
export function run(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).run();
}

/**
 * Return the first row of a SELECT, or null.
 * @returns {Promise<object|null>}
 */
export function first(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).first();
}

// ── User upsert ─────────────────────────────────────────────────────────────

/**
 * Creates a user row if it doesn't already exist.
 * Uses INSERT OR IGNORE so concurrent inserts are safe.
 *
 * @param {Env}    env
 * @param {string} uid
 * @param {string} name
 * @param {string} photo
 */
export function upsertUser(env, uid, name, photo) {
  return run(
    env,
    `INSERT OR IGNORE INTO users (uid, display_name, photo_url)
     VALUES (?, ?, ?)`,
    [uid, name ?? '', photo ?? '']
  );
}

// ── ID generation ───────────────────────────────────────────────────────────

/**
 * Generate a UUID v4 using the Workers runtime crypto global.
 * @returns {string}
 */
export function generateId() {
  return crypto.randomUUID();
}
