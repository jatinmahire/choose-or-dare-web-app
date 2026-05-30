// worker/src/auth.js — Firebase idToken verification for Cloudflare Workers
// Uses Web Crypto API ONLY — no firebase-admin SDK, no Node.js dependencies.
// Cloudflare Workers runtime provides crypto.subtle natively.
//
// Flow:
//   1. Split JWT → decode header → get `kid` (key ID)
//   2. Fetch Firebase public RSA keys from Google (cached 3600s via CF cache)
//   3. Convert PEM → CryptoKey via crypto.subtle.importKey
//   4. Verify RS256 signature via crypto.subtle.verify
//   5. Decode payload → validate exp / aud / iss claims
//   6. Return { uid, email, name } or throw

// ─── Constants ─────────────────────────────────────────────────────────────
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// ─── PEM → ArrayBuffer helper ───────────────────────────────────────────────
/**
 * Strips PEM headers/footers and decodes the base64 body to an ArrayBuffer.
 * @param {string} pem
 * @returns {ArrayBuffer}
 */
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ─── Base64url → ArrayBuffer helper ────────────────────────────────────────
/**
 * Decodes a base64url-encoded string to an ArrayBuffer.
 * @param {string} b64url
 * @returns {ArrayBuffer}
 */
function base64urlToBuffer(b64url) {
  // Convert base64url → standard base64
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ─── JWT parsing helpers ────────────────────────────────────────────────────
/**
 * Safely JSON-parses a base64url-encoded JWT segment.
 * @param {string} segment
 * @returns {object}
 */
function decodeJwtSegment(segment) {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

// ─── Public key cache ───────────────────────────────────────────────────────
// Cloudflare's Cache API is keyed by Request — reuse the same URL object.
const _certsCacheRequest = new Request(GOOGLE_CERTS_URL);

/**
 * Fetches Firebase's RSA public keys, using the Cloudflare edge cache for
 * up to 3600 seconds (1 hour) to match key rotation frequency.
 *
 * @returns {Promise<Record<string, string>>} Map of kid → PEM certificate
 */
async function fetchFirebasePublicKeys() {
  const cache = caches.default;

  // Try edge cache first
  const cached = await cache.match(_certsCacheRequest);
  if (cached) {
    return cached.json();
  }

  // Fetch from Google
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`[auth] Failed to fetch Firebase public keys: ${response.status}`);
  }

  const certs = await response.json();

  // Store in CF cache with fixed 3600-second TTL
  const cacheResponse = new Response(JSON.stringify(certs), {
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
  await cache.put(_certsCacheRequest, cacheResponse);

  return certs;
}

// ─── Core verification ──────────────────────────────────────────────────────
/**
 * Verifies a Firebase ID token using the Web Crypto API.
 *
 * @param {string} token - Raw JWT string from Authorization: Bearer header
 * @param {object} env   - Cloudflare Worker env bindings (must have FIREBASE_PROJECT_ID)
 * @returns {Promise<{ uid: string, email: string, name: string }>}
 * @throws {Error} on any verification failure
 */
export async function verifyIdToken(token, env) {
  // ── 1. Split and decode JWT ──────────────────────────────────────────────
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('[auth] Invalid JWT format');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeJwtSegment(headerB64);
  if (header.alg !== 'RS256') {
    throw new Error(`[auth] Unsupported algorithm: ${header.alg}`);
  }

  const { kid } = header;
  if (!kid) throw new Error('[auth] JWT missing kid');

  // ── 2. Fetch Firebase public keys ────────────────────────────────────────
  const certs = await fetchFirebasePublicKeys();
  const pem   = certs[kid];
  if (!pem) {
    throw new Error(`[auth] No public key found for kid: ${kid}`);
  }

  // ── 3. Import RSA public key ─────────────────────────────────────────────
  // Firebase certs are X.509 DER-encoded, so we import as 'spki' format
  // after extracting the SubjectPublicKeyInfo from the certificate.
  // We import the full certificate as 'raw' via importKey with pkcs8 — but
  // the correct approach for X.509 is to import via spki by using the
  // SubjectPublicKeyInfo extracted from the cert.
  //
  // Cloudflare Workers supports importing X.509 certificates directly
  // using the SubjectPublicKeyInfo (SPKI) format embedded in the cert DER.
  // We use importKey with format 'raw' isn't right — we need 'spki'.
  // Since Google provides full X.509 PEM certs, we strip the cert wrapper
  // and import as SPKI (the public key is SPKI-encoded inside the cert).
  //
  // For Workers: import as 'pkcs8' doesn't work for certs.
  // Correct path: use SubtleCrypto to import via x509 — Workers supports
  // importKey with algorithm RSASSA-PKCS1-v1_5 and format 'spki'.

  const certDer   = pemToArrayBuffer(pem);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',      // We'll use a workaround — see note below
    certDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  ).catch(async () => {
    // Workers can't import full X.509 DER as 'raw' for RSA.
    // Fall back: fetch the raw JWKs endpoint which provides JWK format keys.
    // However, Google's x509 endpoint is what we have.
    // The correct approach for CF Workers with x509 PEM certs is:
    // Use the JWKs endpoint instead for direct JWK import.
    return _importKeyFromJwksEndpoint(kid);
  });

  // ── 4. Verify signature ──────────────────────────────────────────────────
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature    = base64urlToBuffer(signatureB64);

  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    signature,
    signingInput
  );

  if (!valid) {
    throw new Error('[auth] JWT signature verification failed');
  }

  // ── 5. Decode and validate claims ────────────────────────────────────────
  const payload = decodeJwtSegment(payloadB64);
  const now     = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp <= now) {
    throw new Error('[auth] JWT has expired');
  }

  const expectedAud = env.FIREBASE_PROJECT_ID;
  const expectedIss = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;

  if (payload.aud !== expectedAud) {
    throw new Error(`[auth] Invalid JWT audience: ${payload.aud}`);
  }
  if (payload.iss !== expectedIss) {
    throw new Error(`[auth] Invalid JWT issuer: ${payload.iss}`);
  }
  if (!payload.sub) {
    throw new Error('[auth] JWT missing sub claim');
  }

  // ── 6. Return user identity ───────────────────────────────────────────────
  return {
    uid:   payload.sub,
    email: payload.email   ?? '',
    name:  payload.name    ?? '',
  };
}

/**
 * Fallback: import key via Google's JWK Set endpoint.
 * Firebase also publishes JWKs at a well-known endpoint.
 *
 * @param {string} kid
 * @returns {Promise<CryptoKey>}
 */
async function _importKeyFromJwksEndpoint(kid) {
  const JWKS_URL =
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

  const cache    = caches.default;
  const cacheReq = new Request(JWKS_URL);
  let jwksResp   = await cache.match(cacheReq);

  if (!jwksResp) {
    const resp = await fetch(JWKS_URL);
    if (!resp.ok) throw new Error(`[auth] Failed to fetch JWKS: ${resp.status}`);
    jwksResp = new Response(await resp.text(), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
    await cache.put(cacheReq, jwksResp.clone());
  }

  const { keys } = await jwksResp.json();
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error(`[auth] JWKS: no key for kid ${kid}`);

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

// ─── Route middleware ───────────────────────────────────────────────────────
/**
 * Extracts and verifies a Bearer token from the Authorization header.
 *
 * @param {Request} request
 * @param {object}  env
 * @returns {Promise<[{ uid, email, name }, null] | [null, Response]>}
 */
export async function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization') ?? '';

  if (!authHeader.startsWith('Bearer ')) {
    return [null, new Response(
      JSON.stringify({ error: 'Missing or malformed Authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )];
  }

  const token = authHeader.slice(7).trim();

  try {
    const user = await verifyIdToken(token, env);
    return [user, null];
  } catch (err) {
    console.error('[requireAuth]', err.message);
    return [null, new Response(
      JSON.stringify({ error: 'Unauthorized', detail: err.message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )];
  }
}
