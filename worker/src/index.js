// worker/src/index.js - Cloudflare Worker entry point with all middleware
import { AutoRouter, cors, json, Router } from "itty-router";
import { requireAuth } from "./auth.js";

// Route handlers (inline to avoid circular import issues with middleware)
import { Router as IRouter } from "itty-router";

// ---- In-memory rate limiter ------------------------------------------------
// Map<key, { count, reset }>
// Keyed by: "save:<uid>" (10/hr), "read:<uid>" (200/hr), "ip:<ip>" (50/min)
const _rl = new Map();

function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  const rec = _rl.get(key);
  if (!rec || now > rec.reset) {
    _rl.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (rec.count >= max) return false;
  rec.count++;
  return true;
}

// ---- Middleware -------------------------------------------------------------

// 1. CORS origin check (strict on mutations, permissive on GET)
function corsCheck(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  // No Origin header = direct API call (curl, server-to-server) — skip CORS check.
  // Browsers always send Origin on cross-origin requests, so this doesn't weaken security.
  if (!origin) return;
  const allowed = env.ALLOWED_ORIGIN ?? "";
  const isLocal = origin.startsWith("http://localhost") || origin.startsWith("http://127.");
  const method = request.method.toUpperCase();
  const isMutating = ["POST","PUT","PATCH","DELETE"].includes(method);
  if (isMutating && !isLocal && allowed && origin !== allowed) {
    return json({ error: "Forbidden: origin not allowed" }, { status: 403 });
  }
}

// 2. Security headers (applied via finally)
function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-XSS-Protection", "1; mode=block");
  return new Response(response.body, { status: response.status, headers });
}

// 3. Content-Type check for POST/PUT
function contentTypeCheck(request) {
  const method = request.method.toUpperCase();
  if (["POST","PUT","PATCH"].includes(method)) {
    const ct = request.headers.get("Content-Type") ?? "";
    if (!ct.includes("application/json")) {
      return json({ error: "Content-Type must be application/json" }, { status: 415 });
    }
  }
}

// 4. IP-based rate limit (50 req/min)
function ipRateLimit(request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ok = checkRateLimit("ip:" + ip, 50, 60_000);
  if (!ok) return json({ error: "Too many requests" }, { status: 429 });
}

// ---- CORS setup ------------------------------------------------------------
const { preflight, corsify } = cors({
  allowMethods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowHeaders: ["Content-Type","Authorization"],
  maxAge: 86400,
});

// ---- Router ----------------------------------------------------------------
const router = AutoRouter({
  before:  [preflight, corsCheck, ipRateLimit],
  finally: [corsify, securityHeaders],
  catch: (err) => {
    console.error("[worker]", err.message);
    return json({ error: "Internal server error" }, { status: 500 });
  },
});

// ---- Health (public) -------------------------------------------------------
router.get("/health", () => json({ status: "ok" }));

// ---- Leaderboard (public, no auth) -----------------------------------------
router.get("/api/leaderboard", async (req, env, ctx) => {
  const { default: handler } = await import("./routes/leaderboard.js");
  return handler(req, env, ctx);
});

// ---- Auth-protected routes -------------------------------------------------
// Wrap every protected route: verify token, then uid-based rate limits
async function withAuth(handler, actionKey, limit, windowMs) {
  return async (request, env, ctx) => {
    const [user, errResp] = await requireAuth(request, env);
    if (errResp) return errResp;
    request._user = user;
    if (actionKey && !checkRateLimit(actionKey + ":" + user.uid, limit, windowMs)) {
      return json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }
    return handler(request, env, ctx);
  };
}

// Lazy-import route modules
async function sessionHandler(req, env, ctx) {
  const { default: h } = await import("./routes/session.js");
  return h(req, env, ctx);
}
async function statsHandler(req, env, ctx) {
  const { default: h } = await import("./routes/stats.js");
  return h(req, env, ctx);
}
async function cardsHandler(req, env, ctx) {
  const { default: h } = await import("./routes/cards.js");
  return h(req, env, ctx);
}
async function accountHandler(req, env, ctx) {
  const { default: h } = await import("./routes/account.js");
  return h(req, env, ctx);
}

// Save session: 10/hour rate limit
router.post("/api/save-session", async (req, env, ctx) => {
  const [user, errResp] = await requireAuth(req, env);
  if (errResp) return errResp;
  if (!checkRateLimit("save:" + user.uid, 10, 3_600_000)) {
    return json({ error: "Save rate limit: max 10 sessions per hour" }, { status: 429 });
  }
  req._user = user;
  return sessionHandler(req, env, ctx);
});

// History: 200 reads/hour
router.get("/api/history", async (req, env, ctx) => {
  const [user, errResp] = await requireAuth(req, env);
  if (errResp) return errResp;
  if (!checkRateLimit("read:" + user.uid, 200, 3_600_000)) {
    return json({ error: "Read rate limit exceeded" }, { status: 429 });
  }
  req._user = user;
  return sessionHandler(req, env, ctx);
});

router.get("/api/stats",           statsHandler);
router.get("/api/cards/random",    cardsHandler);
router.get("/api/custom-cards",    cardsHandler);
router.post("/api/custom-cards",   cardsHandler);
router.delete("/api/custom-cards/:id", cardsHandler);
router.delete("/api/account",      accountHandler);

// ---- 404 -------------------------------------------------------------------
router.all("*", () => json({ error: "Not found" }, { status: 404 }));

export default router;
