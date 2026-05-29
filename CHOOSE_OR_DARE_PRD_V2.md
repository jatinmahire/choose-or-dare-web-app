# Product Requirements Document — V2
# Choose or Dare — Mobile Web Party Game
# Last updated: 2026-05-30

---

## 1. Overview

Choose or Dare is an 18+ adult party game web application built exclusively
for mobile browsers. All gameplay happens on one shared phone. Players place
fingers on the screen simultaneously and a random winner is chosen for each
truth or dare card. The app runs entirely on free-tier cloud services.

The companion build document (30_PHASES_V2.md) references this PRD in every
phase prompt so the AI agent always has full context about what is being built.

---

## 2. Core Constraints

MOBILE ONLY: The app must be inaccessible on desktop browsers.
  Detection: screen.width > 768px AND no touch events AND non-mobile user agent.
  Desktop experience: show only a bottle spinner party game (CSS/JS only).
  Also block landscape orientation on mobile (show rotate-phone overlay).

ZERO COST TO OPERATE: Every service must stay within its free tier forever.
  See Section 9 for verified free tier limits.

OFFLINE CAPABLE: After first load, basic gameplay works without internet.
  Service worker caches cards and static assets.

---

## 3. Tech Stack (Forever Free)

Hosting:        Cloudflare Pages (unlimited static bandwidth)
Identity:       Firebase Auth — Google Sign-In only
Real-time:      Firebase Firestore (game rooms during play only, deleted after)
Database:       Cloudflare D1 SQLite (permanent: history, profiles, cards)
API:            Cloudflare Workers (secure D1 bridge, idToken verification)
UI Generation:  Google Stitch MCP (human-quality screen designs)
Frontend:       Vanilla JS + Vite (smallest possible bundle, < 150KB gzipped)
CI/CD:          GitHub Actions → Cloudflare Pages auto-deploy on push to main
Build tool:     Node.js 20, npm

---

## 4. Authentication

Provider: Google Sign-In only. No email/password. No anonymous users.
Implementation: signInWithPopup (desktop/Android) + signInWithRedirect (iOS Safari).
Token: Firebase idToken stored in JavaScript memory (store.idToken) only.
  NEVER stored in: localStorage, sessionStorage, cookies, DOM attributes, URL.
Token refresh: automatic every 55 minutes via getIdToken(force=true).
Session: persists across page refreshes via Firebase onAuthStateChanged().
Age gate: Not technical — relies on 18+ disclaimer shown at sign-in.

---

## 5. Game Categories

FRIENDLY (isAdultOnly=false, difficulty 1-3): General party questions for all adults.
PARTY    (isAdultOnly=false, difficulty 2-4): Bold social challenges.
COUPLES  (isAdultOnly=true,  difficulty 2-4): Romantic/relationship cards.
DIRTY    (isAdultOnly=true,  difficulty 4-5): Explicit adult content.
CUSTOM   (isAdultOnly=false, user-created):   User-written truth and dare cards.

NOT included: No Spicy category. No Spin Wheel feature. These were removed by design.

Adult categories (COUPLES, DIRTY) are locked behind a toggle in game setup.
The toggle sets store.isAdultUnlocked = true for the current app session.

---

## 6. Card System

Seed cards: 320 minimum (40 truths + 40 dares × 4 categories).
Card fields: id (UUID), text, type (TRUTH|DARE), category, difficultyLevel (1-5),
             isAdultOnly (bool), timesUsed, isCustom (bool).
Anti-repeat: usedCardIds Set tracked in store.js. Worker excludes used IDs.
Custom cards: stored in D1 custom_cards table. Max 150 chars. Sanitized with DOMPurify.
QR sharing: custom card packs exported as JSON-encoded QR codes.

---

## 7. Firestore Room Architecture (Ephemeral)

Document structure:
  /rooms/{roomId}: {
    hostUid, players[], categories[], status (picking|card_active|complete),
    currentRound, winner, cardType, cardText, createdAt
  }
  /rooms/{roomId}/fingers/{pointerId}: { x (0-1), y (0-1), playerIndex, timestamp }
  /rooms/{roomId}/votes/{uid}: { vote (DONE|CHICKENED), timestamp }

Finger write throttle: maximum 1 write per 500ms per pointer (debounced in firestore.js).
Room lifecycle: created on Start Game → used during play → DELETED after game ends.
Why delete: Firestore has 1GB free storage cap. Deletion keeps it near zero permanently.
Room security rules: only hostUid can update/delete room. Any auth user can read.
  Each user can only write to their own /votes/{uid} document.

---

## 8. D1 Database Schema

TABLE users:
  uid TEXT PK, display_name TEXT, photo_url TEXT, created_at INTEGER,
  total_sessions INTEGER DEFAULT 0, total_dares INTEGER DEFAULT 0,
  total_truths INTEGER DEFAULT 0, bravery_score REAL DEFAULT 0.0

TABLE sessions:
  id TEXT PK, host_uid TEXT, started_at INTEGER, ended_at INTEGER,
  player_count INTEGER DEFAULT 0, total_rounds INTEGER DEFAULT 0, categories TEXT

TABLE history:
  id TEXT PK, session_id TEXT FK→sessions, uid TEXT FK→users,
  player_name TEXT, card_text TEXT, card_type TEXT, category TEXT,
  result TEXT DEFAULT 'PENDING', timestamp INTEGER, duration_seconds INTEGER

TABLE custom_cards:
  id TEXT PK, uid TEXT FK→users, text TEXT NOT NULL, type TEXT NOT NULL,
  category TEXT DEFAULT 'CUSTOM', difficulty INTEGER DEFAULT 3,
  is_adult_only INTEGER DEFAULT 0, created_at INTEGER

TABLE cards:
  id TEXT PK, text TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL,
  difficulty INTEGER DEFAULT 3, is_adult_only INTEGER DEFAULT 0,
  times_used INTEGER DEFAULT 0, is_custom INTEGER DEFAULT 0

Indexes: history(uid), history(session_id), history(timestamp DESC),
         cards(category, is_adult_only), custom_cards(uid)

---

## 9. Cloudflare Worker API Endpoints

All endpoints require Authorization: Bearer {idToken} header EXCEPT /api/leaderboard.
Worker verifies token using Web Crypto API (JWT signature + claims validation).
All responses include security headers. All SQL uses parameterized statements.

POST   /api/save-session       Archive completed game to D1. Rate: 10/hour per uid.
GET    /api/history            Paginated history for authenticated user. 20 per page.
GET    /api/stats              Aggregate stats + streaks + category breakdown.
GET    /api/leaderboard        Top 50 players by bravery score. Cached 5 min. Public.
GET    /api/custom-cards       Fetch user's custom cards.
POST   /api/custom-cards       Save new custom card (sanitized, 150 char max).
DELETE /api/custom-cards/:id   Delete card — WHERE id=? AND uid=? (IDOR protection).
GET    /api/cards/random       Get next card excluding usedIds. Anti-repeat in SQL.
DELETE /api/account            Delete all user data: history → cards → sessions → users.
DELETE /api/history            Clear only history + reset user stats.
GET    /health                 Always returns 200 OK. No auth.

---

## 10. Security Requirements (Non-Negotiable)

1. idToken: memory-only. Never localStorage, sessionStorage, cookie, DOM, URL.
2. SQL injection: parameterized statements exclusively. Zero string concatenation in SQL.
3. XSS: DOMPurify.sanitize() on all user-provided text before any use.
   textContent for display, never innerHTML with user data.
4. IDOR: deleteCustomCard always includes AND uid=? in WHERE clause.
5. CORS: Worker checks Origin header against env.ALLOWED_ORIGIN on all mutating requests.
6. Content-Type: Worker rejects POST requests without Content-Type: application/json.
7. Rate limiting: 10 save-session per hour per uid. 200 reads per hour per uid.
   Secondary: 60 requests per minute per IP (CF-Connecting-IP header).
8. Security headers on all Cloudflare Pages responses (via public/_headers):
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
   Cross-Origin-Opener-Policy: same-origin
   Content-Security-Policy: (restricts to self + Firebase + Google APIs only)
9. roomId validation: isValidRoomId() (UUID v4 regex) before ANY Firestore call.
10. CSP: object-src 'none'. No inline scripts except where absolutely needed.

---

## 11. All Application Screens

1.  / Landing                  Public homepage. Sign-in CTA. Feature preview. Dark party feel.
2.  /home Home dashboard        Stats, recent games, Start Game. Bottom nav on all auth screens.
3.  /setup Game setup           Player names+colors, categories, adult toggle, timer setting.
4.  /game/:id Finger picker     Full-screen multi-touch canvas. Countdown. Winner. Particles.
5.  /game/:id/card Card reveal  CSS 3D flip. Category color fronts. Timer. Voting panel.
6.  /result/:id Session result  Confetti. Podium. Bravery leaderboard. Stagger animations.
7.  /history History            Session timeline. Expandable. Search + filter. Infinite scroll.
8.  /stats Stats                Bravery gauge. Category bars. Dare streak. Achievement badges.
9.  /leaderboard Leaderboard    Top 50 global. Monthly tab. Current user highlighted.
10. /cards Custom cards         Card creator + live preview. QR export. Camera scan import.
11. /settings Settings          Profile. Sound/haptic toggles. Timer. Adult lock. Export. Delete.
12. 404 / Error                 Friendly error screen with home button.
13. Desktop blocker             Bottle spinner party game. Cannot access real game at all.

---

## 12. UI Design Requirements

Design tool: Google Stitch MCP generates all screen designs from detailed prompts.
Aesthetic: Dark party / late-night club. NOT generic SaaS. NOT material design templates.
Typography: System UI font stack only. -apple-system, BlinkMacSystemFont, system-ui.
  NO web fonts. NO Google Fonts. NO Nunito, Poppins, or any font request to external CDN.
Colors: CSS custom properties from theme.css. Zero hardcoded hex values in JS.
Touch targets: All interactive elements minimum 48×48px.
Animations: CSS keyframes for transitions. requestAnimationFrame for canvas only.
Stitch UI workflow: Generate design → adapt HTML/CSS → replace colors with CSS vars
  → replace fonts with system-ui → verify touch targets → implement JS logic on top.

---

## 13. Performance Targets

Bundle size:        < 150KB total gzipped (JS + CSS)
First Contentful Paint: < 1.5 seconds on 4G mobile
Time to Interactive:    < 3 seconds on 3G mobile
Offline support:    Static assets + card data cached after first load
PWA:               Manifest, service worker, icons, standalone display, portrait lock
iOS compatibility: signInWithRedirect on iOS Safari. AudioContext resume on touch.
                   100svh viewport units. safe-area-inset padding.

---

## 14. Free Tier Capacity

Service              Limit/day         Safe ceiling
Cloudflare Pages     Unlimited         No limit — static CDN
Firebase Auth        Unlimited         No limit
Firestore reads      50,000/day        ~55 simultaneous game rooms
Cloudflare Workers   100,000/day       ~25,000 daily active users
D1 reads/month       5,000,000         ~33,000 monthly users
D1 writes/month      100,000           ~10,000 games/month
D1 storage           5 GB free         Years of history data

Bottleneck: Firestore 50k reads/day. Throttle finger writes to 1/500ms to maximize rooms.
At 40k reads/day: set up Cloudflare notification alert → review if needed.
Upgrade path: Firebase Blaze plan ($0.06/100k reads) if consistently over 40k reads/day.

---

## 15. Deployment Architecture

Repository:     GitHub (public or private). Main branch auto-deploys.
Frontend:       Cloudflare Pages. Build: npm run build. Output: dist/.
Worker:         Cloudflare Workers. Deploys from worker/ directory.
Database:       Cloudflare D1. Migrations in migrations/ folder.
CI/CD:          GitHub Actions. Two workflows: deploy.yml (pages), deploy-worker.yml (worker).
Secrets:        GitHub Secrets → CI/CD env vars. Cloudflare Worker secrets via wrangler CLI.
Custom domain:  Optional. Free subdomain: choose-or-dare.pages.dev always available.

---

## 16. Credit Usage Strategy (4 Gemini Pro IDs)

The companion 30-phase build document allocates phases across 4 Gemini Pro accounts:
  Account ID 1: Phases 1-8   — Foundation, Firebase, Cloudflare, Worker API, cards seed
  Account ID 2: Phases 9-16  — All game screens via Stitch MCP + implementations
  Account ID 3: Phases 17-24 — Deploy, verification, security, testing
  Account ID 4: Phases 25-30 — Polish, optimization, monitoring, launch

Switch account in Antigravity Settings when "Rate limited" appears.
Each phase prompt embeds the PRD summary so no re-explaining is needed after switching.

---

## 17. Success Metrics

Technical:   Zero runtime cost for first 6 months of operation
Reliability: App works on Android Chrome and iOS Safari
Security:    Zero auth bypass incidents. Zero XSS incidents. All security headers present.
Performance: Bundle < 150KB. FCP < 1.5s. Lighthouse mobile score > 85.
Game:        Full game flow (sign-in → setup → picker → card → result) works end-to-end.

