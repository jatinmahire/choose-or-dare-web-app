# Choose or Dare — Web App
# 30 Build Phases V2 | Full Gemini Pro Credits | AI-Automated
# PRD embedded in every prompt | Minimal manual steps
# 4 Gemini Pro IDs: use ID1 for P1-8, ID2 for P9-16, ID3 for P17-24, ID4 for P25-30

---

## PRD QUICK REFERENCE (embedded in every prompt)
App: Choose or Dare — 18+ mobile-only party game.
Stack: Vanilla JS + Vite. Firebase Auth + Firestore (ephemeral). Cloudflare Pages + Workers + D1.
Mobile-only: block desktop (show bottle spinner). Block landscape orientation.
Auth: Google Sign-In only. idToken memory-only — never localStorage/cookie/DOM.
Firestore: ephemeral rooms only. Delete room after game. Throttle writes 500ms.
D1 tables: users, sessions, history, custom_cards, cards.
Worker: verifies idToken on every endpoint. Parameterized SQL only.
Categories: FRIENDLY, PARTY, COUPLES, DIRTY, CUSTOM. NO Spicy. NO Spin Wheel.
Cards: 320 seed (40T+40D × 4 categories). Anti-repeat per session.
Security: DOMPurify, CSP headers, parameterized SQL, CORS, rate limiting.
Colors: bg #0A0A0F, surface #141420, card #1C1C2E, primary #7C4DFF, accent #FF4081.
Screens: landing, home, setup, game, card-reveal, result, history, stats, leaderboard, custom-cards, settings, 404, desktop-blocker.
Free tier: CF Pages unlimited, Firestore 50k reads/day, Workers 100k/day, D1 5M reads/month.

---
## HOW TO USE

1. Paste the prompt from each phase into Antigravity Agent Manager
2. Switch Gemini Pro ID when "Rate limited" appears: Settings → Switch Account
3. Steps marked [YOU DO] require your action (browser clicks, passwords)
4. AI does everything else including terminal commands, file creation, config
5. After every phase: git add -A && git commit -m "phaseN done" && git push

---
## PHASE 1 — Git init + Vite scaffold + all empty files
## ID1 | Token: LOW
---

[YOU DO FIRST — 5 minutes]:
1. github.com → sign in → New repository → name: choose-or-dare → Public → Create
2. Copy the HTTPS clone URL shown
3. Open Antigravity → Agent Manager → Open a new empty folder as workspace

PROMPT:
Read the PRD: App is Choose or Dare mobile party game. Vanilla JS + Vite.
Firebase + Cloudflare stack. Mobile-only. Dark party UI #0A0A0F/#7C4DFF.
PRD summary: [see PRD QUICK REFERENCE at top of this document].

TASK: Complete project initialization. Run every command yourself.

Run in terminal:
  git init
  git remote add origin PASTE_YOUR_GITHUB_URL_HERE
  npm create vite@latest . -- --template vanilla --yes
  npm install
  npm install firebase dompurify qrcode jsqr
  npm install -D wrangler rollup-plugin-visualizer

Create .gitignore with: node_modules/, dist/, .env, .env.local,
  .dev.vars, worker/.dev.vars, *.local, .DS_Store, worker/node_modules/

Create .env.example:
  VITE_FIREBASE_API_KEY=your_key
  VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=your_project_id
  VITE_FIREBASE_APP_ID=your_app_id
  VITE_WORKER_URL=https://your-worker.workers.dev

Create ALL these empty files (each with // TODO comment only):
  src/main.js, src/router.js, src/firebase.js, src/auth.js, src/store.js,
  src/firestore.js, src/utils/api.js, src/utils/security.js, src/utils/device.js,
  src/utils/debounce.js, src/utils/feedback.js,
  src/pages/landing.js, src/pages/home.js, src/pages/setup.js, src/pages/game.js,
  src/pages/card.js, src/pages/result.js, src/pages/history.js, src/pages/stats.js,
  src/pages/leaderboard.js, src/pages/cards.js, src/pages/settings.js,
  src/pages/desktop.js, src/pages/notfound.js,
  src/styles/global.css, src/styles/theme.css, src/styles/animations.css,
  src/styles/components.css,
  worker/src/index.js, worker/src/auth.js, worker/src/db.js,
  worker/src/routes/session.js, worker/src/routes/history.js,
  worker/src/routes/stats.js, worker/src/routes/leaderboard.js,
  worker/src/routes/cards.js, worker/src/routes/account.js,
  worker/wrangler.toml, worker/package.json,
  public/manifest.json, public/robots.txt, public/_headers, public/sw.js,
  public/_redirects, migrations/001_initial.sql, migrations/002_seed_cards.sql,
  .github/workflows/deploy.yml, .github/workflows/deploy-worker.yml,
  scripts/generate-icons.js, docs/monitoring.md, README.md

Create worker/package.json:
  {"name":"choose-or-dare-api","version":"1.0.0",
   "dependencies":{"itty-router":"^5.0.0"}}

Run: cd worker && npm install && cd ..

Update index.html <head> with:
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta name="theme-color" content="#0A0A0F">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="description" content="Choose or Dare — the mobile party game that picks who dares next. Free.">
  All 4 CSS files linked. <div id="app"></div> in body.

Run: git add -A && git commit -m "chore: project scaffold" && git push -u origin main

Report: confirm all files exist and git push succeeded.
---

VERIFY: ls src/pages shows all .js files. git log shows 1 commit.

---
## PHASE 2 — Complete CSS design system
## ID1 | Token: LOW-MEDIUM
---

PROMPT:
PRD: Dark mobile party game. System UI fonts only. All touch targets 48px+.
Colors: bg #0A0A0F, surface #141420, card #1C1C2E, elevated #242436,
primary #7C4DFF, accent #FF4081, text #EEEEF4.

TASK: Fill in all 4 CSS files completely. No placeholders.

FILE src/styles/global.css — complete reset + mobile optimizations:
- Box-sizing reset, body with system font stack and dark bg var(--bg)
- -webkit-tap-highlight-color transparent on all elements
- touch-action manipulation on all interactive elements
- All buttons/role=button: min-height 48px, min-width 48px
- Scrollbar hidden globally
- Landscape warning div: position fixed, z-index 10000, dark bg, hidden by default
- Shimmer keyframe animation for skeleton loading
- Utility classes: .hidden, .sr-only, .flex, .flex-col, .items-center,
  .justify-center, .justify-between, .gap-1 through .gap-4, .w-full,
  .text-center, .text-muted, .text-hint

FILE src/styles/theme.css — CSS custom properties + component tokens:
All :root variables: --bg --surface --card --elevated --primary --primary-dim
  --primary-glow --accent --text --text-muted --text-hint --success --warning
  --error --border --border-strong --radius-s/m/l/xl/full --shadow-card
  --shadow-glow --transition --transition-spring
  --cat-friendly/party/couples/dirty/custom (category colors)
  --av0 through --av7 (8 avatar colors)
Component classes: .btn-primary (52px, 16px radius, purple, glow shadow, active scale),
  .btn-outline (52px, transparent, border), .card-surface (card bg, radius-l, border),
  .chip (34px, pill, transitions), result badge classes (.result-done/skipped/pending)

FILE src/styles/animations.css — all keyframes + animation classes:
3D card flip: .card-scene (perspective 900px), .card-inner (transform-style preserve-3d),
  .card-inner.flipped (rotateY 180deg), .card-face (backface-visibility hidden),
  .card-back (rotateY 180deg pre-rotated)
Keyframes: confetti-fall, slide-in-right, slide-in-up, fade-in, scale-in, bounce-in, pulse-glow
Animation utility classes with stagger: .animate-fade-in, .animate-slide-up,
  .animate-scale-in, .animate-bounce-in, .stagger-1 through .stagger-5 (60ms each)

FILE src/styles/components.css — reusable component CSS:
Bottom nav: .bottom-nav (fixed bottom, 64px, 4 columns, surface bg, safe area padding)
  .nav-item (flex-col, center, 11px text, hint color), .nav-item.active (primary color)
Toast: .toast-container (fixed bottom 80px, centered) .toast (elevated bg, pill, slide-in-up)
Avatar: .avatar (circle, grid center, white bold text, flex-shrink 0)
Category chip selected states for each category class

Run: git add -A && git commit -m "feat: complete CSS design system"
---

VERIFY: npm run dev. Black screen, no CSS errors in console.

---
## PHASE 3 — All utility files + store + router
## ID1 | Token: MEDIUM
---

PROMPT:
PRD: idToken never in localStorage. DOMPurify on all inputs. isValidRoomId UUID check.
In-memory state only. Hash-based routing (#/home etc). Auth guard on protected routes.
Mobile detection: hasTouch AND (narrow OR mobile UA). Debounce 300ms, throttle 500ms.

TASK: Fill in src/utils/device.js, security.js, debounce.js, feedback.js,
      src/store.js, and src/router.js completely.

device.js:
  isMobile(): hasTouch && (screen.width<=768 || mobile UA regex)
  isLandscape(): window.matchMedia orientation landscape
  initLandscapeBlock(): create fixed overlay div, listen orientationchange,
    show/hide based on isLandscape(), add rotate phone message + emoji

security.js (import DOMPurify):
  sanitize(str, max=500): DOMPurify strip all tags/attrs, trim, slice
  sanitizeCard(str): sanitize(str, 150)
  sanitizeName(str): sanitize(str, 50)
  isValidRoomId(id): UUID v4 regex test
  isValidUid(uid): string, length 10-200, alphanumeric only
  escapeHtml(str): replace &<>"' with HTML entities

debounce.js:
  debounce(fn, ms): clearTimeout + setTimeout pattern
  throttle(fn, ms): timestamp comparison pattern
  once(fn): boolean flag, only run first time

store.js — in-memory proxy object:
  Fields: user, idToken, tokenExpiry, gameSession, currentCard,
  currentPlayerName, currentCardType, usedCardIds (Set),
  roundResults (array), soundEnabled, hapticsEnabled,
  defaultTimer, isAdultUnlocked
  resetGame(): clears game-related fields
  IMPORTANT: comment at top "idToken stored here in memory only — never written to localStorage"

feedback.js:
  Web Audio API sound functions (no files needed):
  beep(freq, dur, type, vol): create OscillatorNode + GainNode, exponential ramp
  sound: { tick, winner (3-note melody), flip, vote, ding, error }
  haptic: { light(25ms), medium(50ms), heavy(90ms), winner([0,80,40,160]), error([0,70,30,70]) }
    All haptic checks: store.hapticsEnabled && navigator.vibrate
    All sound checks: store.soundEnabled
  showToast(msg, type='info', dur=2800): create toast div, append to container,
    auto-remove after dur. Types: info/success/error change border/bg colors.
  initOfflineBanner(): offline/online event listeners, transform slide banner in/out

router.js:
  class Router with _routes array, _cleanup fn, _container
  register(pattern, handler, auth=true): parse :param names, build regex, push
  match(path): find first matching route, extract params
  navigate(path, replace=false): pushState/replaceState + _render
  back(): history.back()
  init(container): store container, popstate listener, render current hash path
  _render(path): call _cleanup, clear container, check auth guard,
    try/catch with error fallback UI, store cleanup return

Run: git add -A && git commit -m "feat: all utilities, store, router"
---

VERIFY: npm run dev, no import errors. Open console: run sanitize('<script>alert(1)</script>') → empty string.

---
## PHASE 4 — Firebase setup automation + Firebase files
## ID1 | Token: MEDIUM
---

[YOU DO — 10 minutes — these require browser clicks]:
1. console.firebase.google.com → Add project → "choose-or-dare" → disable Analytics → Create
2. Authentication → Get Started → Google → Enable → Save
3. Project Settings → </> → name "choose-or-dare-web" → Register → COPY firebaseConfig
4. Create .env.local in project root with your values:
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=choose-or-dare-XXXX.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=choose-or-dare-XXXX
   VITE_FIREBASE_APP_ID=1:XXXX
5. Firestore → Create database → Production mode → pick region → Enable
6. Rules tab → Replace with these rules → Publish:
   rules_version='2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /rooms/{roomId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
         allow update, delete: if request.auth != null
           && request.auth.uid == resource.data.hostUid;
         match /fingers/{pid} {
           allow read, write: if request.auth != null;
         }
         match /votes/{uid} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.auth.uid == uid;
         }
       }
     }
   }

PROMPT:
PRD: Firebase Auth Google Sign-In only. idToken stored in store.idToken memory only.
Auto-refresh at 55-min mark. Firestore rooms: ephemeral, deleted after game.
Finger write throttle 500ms max. Room structure: /rooms/{id}, /fingers/{ptr}, /votes/{uid}.

TASK: Fill in src/firebase.js, src/auth.js, src/firestore.js completely.

firebase.js: initializeApp with import.meta.env vars. Export auth and db.
  Do NOT call enableIndexedDbPersistence — prevents stale data.

auth.js: Full implementation with:
  GoogleAuthProvider, prompt:'select_account'
  signInWithGoogle(): signInWithPopup → store.idToken = await getIdToken()
    → store.tokenExpiry = Date.now() + 55*60*1000 → return user
  getIdToken(): if Date.now() > store.tokenExpiry → force refresh → update store
    → return store.idToken
  logout(): store.idToken=null, store.tokenExpiry=0, store.user=null → signOut(auth)
  onAuthChange(cb): onAuthStateChanged → on user: refresh token → store.user=user
  getCurrentUser(): return auth.currentUser
  Comment at top: "idToken lives only in store.idToken (in-memory). Never touches DOM or storage."

firestore.js: Full room lifecycle with Firebase v9 modular SDK:
  createRoom(hostUid, players, categories): addDoc to /rooms → return id
  updateRoom(roomId, data): validate isValidRoomId first, then updateDoc
  listenToRoom(roomId, cb): onSnapshot → cb(data) or cb(null)
  writeFingerPos(roomId, pointerId, x, y, playerIndex): throttled 500ms per pointer
    using Map of throttle functions keyed by roomId:pointerId
    setDoc to /rooms/{roomId}/fingers/{pointerId}
  listenToFingers(roomId, cb): onSnapshot collection → build fingers object → cb
  writeVote(roomId, uid, vote): setDoc to /votes/{uid}
  listenToVotes(roomId, cb): onSnapshot collection → build votes map → cb
  clearFingers(roomId): getDocs + writeBatch delete all finger docs
  deleteRoom(roomId): delete fingers + votes + room doc in one batch

Run: git add -A && git commit -m "feat: Firebase auth and Firestore room management"
---

VERIFY: npm run dev. Console: import('./src/auth.js').then(m=>console.log('ok',Object.keys(m))) — no errors.

---
## PHASE 5 — Cloudflare automation: D1 + Worker skeleton
## ID1 | Token: MEDIUM
---

[YOU DO — 8 minutes]:
1. cloudflare.com/sign-up → create free account with email
2. Dashboard → Workers & Pages → D1 SQL → Create database
   Name: choose-or-dare → Create → COPY the Database ID
3. Workers & Pages → Overview → Create application → Create Worker
   Name: choose-or-dare-api → Deploy (default hello world)
4. Run in terminal: npx wrangler login → browser opens → Authorize
5. Get Account ID: it's in your Cloudflare dashboard URL after /
   dash.cloudflare.com/ACCOUNT_ID/... → COPY it

PROMPT:
PRD: D1 tables: users, sessions, history, custom_cards, cards.
All SQL parameterized. Worker verifies Firebase idToken via Web Crypto API.
No firebase-admin SDK — use JWT verification with crypto.subtle.

TASK: Fill in worker/wrangler.toml, migrations/001_initial.sql, worker/src/auth.js.
Then run the migration to create all tables.

worker/wrangler.toml: Fill in completely with placeholders for IDs:
  name="choose-or-dare-api", main="src/index.js",
  compatibility_date="2025-06-01", compatibility_flags=["nodejs_compat"]
  [[d1_databases]] binding="DB", database_name="choose-or-dare", database_id="PASTE_D1_ID"
  [vars] ALLOWED_ORIGIN="https://choose-or-dare.pages.dev"
  NOTE in comment: "Replace PASTE_D1_ID with your actual D1 database ID"

migrations/001_initial.sql: All CREATE TABLE IF NOT EXISTS statements:
  users: uid PK, display_name, photo_url, created_at, total_sessions,
         total_dares, total_truths, bravery_score
  sessions: id PK, host_uid, started_at, ended_at, player_count, total_rounds, categories
  history: id PK, session_id FK, uid FK, player_name, card_text, card_type,
           category, result DEFAULT 'PENDING', timestamp, duration_seconds
  custom_cards: id PK, uid FK, text, type, category DEFAULT 'CUSTOM',
                difficulty DEFAULT 3, is_adult_only DEFAULT 0, created_at
  cards: id PK, text, type, category, difficulty DEFAULT 3,
         is_adult_only DEFAULT 0, times_used DEFAULT 0, is_custom DEFAULT 0
  All required indexes: history(uid), history(session_id), history(timestamp DESC),
  cards(category, is_adult_only), custom_cards(uid)

worker/src/auth.js: Firebase idToken verification WITHOUT firebase-admin.
  Uses Web Crypto API only — works in Cloudflare Workers runtime.
  verifyIdToken(token, env):
    1. Split JWT, decode header to get kid
    2. Fetch Firebase public keys from googleapis.com
       URL: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
       Cache with CF cache TTL 3600 seconds
    3. Import RSA-PKCS1-v1_5 key with crypto.subtle.importKey
    4. Verify signature with crypto.subtle.verify
    5. Decode payload, verify: exp > now, aud === env.FIREBASE_PROJECT_ID,
       iss === "https://securetoken.google.com/"+env.FIREBASE_PROJECT_ID
    6. Return {uid: payload.sub, email: payload.email, name: payload.name}
  requireAuth(request, env): extract Bearer token → call verifyIdToken
    → return [user, null] on success, [null, Response(401)] on failure

After creating files, run these commands:
  cd worker && npm install
  npx wrangler d1 execute choose-or-dare --local --file=../migrations/001_initial.sql
  npx wrangler d1 execute choose-or-dare --remote --file=../migrations/001_initial.sql
  npx wrangler dev &
  sleep 3 && curl http://localhost:8787/health
  kill %1
  cd ..

Run: git add -A && git commit -m "feat: Cloudflare D1 schema and Worker auth"
---

VERIFY: Migration ran without errors. wrangler dev starts without errors.

---
## PHASE 6 — Full Worker API (all endpoints)
## ID1 | Token: HIGH
---

PROMPT:
PRD: Endpoints: POST /api/save-session, GET /api/history, GET /api/stats,
GET /api/leaderboard (public), GET/POST/DELETE /api/custom-cards,
GET /api/cards/random, DELETE /api/account.
Rate limit: 10 saves/hour per uid. CORS from ALLOWED_ORIGIN only.
Security headers on every response. Upsert users table on first save.
Parameterized SQL always. No string interpolation in queries ever.

TASK: Fill in worker/src/db.js, all 5 route files, worker/src/index.js completely.

worker/src/db.js:
  query(env,sql,params): env.DB.prepare(sql).bind(...params).all()
  run(env,sql,params): env.DB.prepare(sql).bind(...params).run()
  first(env,sql,params): env.DB.prepare(sql).bind(...params).first()
  upsertUser(env,uid,name,photo): INSERT OR IGNORE into users
  generateId(): crypto.randomUUID()

worker/src/routes/session.js:
  saveSession(req,env,user): parse body, validate required fields,
    upsertUser, INSERT session, INSERT one history row per round
    (all parameterized), UPDATE user stats. Return {success:true}.
  getHistory(req,env,user): paginated SELECT with JOIN, 20 per page.

worker/src/routes/stats.js:
  getStats(req,env,user): aggregate SELECT from history WHERE uid=?
    Return: totalDares, totalTruths, daresCompleted, daresSkipped,
    braveryScore, currentStreak, bestStreak, categoryBreakdown (object).
    Streak: consecutive DONE dare results without SKIPPED gap.

worker/src/routes/leaderboard.js:
  getLeaderboard: SELECT top 50 users by bravery_score DESC.
    Cache response 5 minutes with Cache API.
    No auth required.

worker/src/routes/cards.js:
  getRandomCard: SELECT FROM cards WHERE category IN (?) AND is_adult_only IN (?)
    AND id NOT IN (SELECT card_id FROM history WHERE session_id=?)
    ORDER BY RANDOM() LIMIT 1
    usedIds from query param as comma-separated list
  getCustomCards, saveCustomCard (sanitize text max 150), deleteCustomCard
    DELETE WHERE id=? AND uid=? (uid check prevents IDOR attack)

worker/src/routes/account.js:
  deleteAccount: DELETE history → custom_cards → sessions → users (in order for FK)

worker/src/index.js: Using itty-router.
  Middleware functions (applied in order):
    corsCheck(req,env): verify Origin header matches env.ALLOWED_ORIGIN
      Also allow localhost for dev. Return 403 if mismatch on mutating requests.
    securityHeaders(response): add to every response:
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      Referrer-Policy: strict-origin-when-cross-origin
    contentTypeCheck(req): on POST/PUT, verify Content-Type includes application/json
    rateLimiter: Map<uid:action, {count,reset}>. 10 saves/hour. 200 reads/hour per uid.
      Also secondary limit: 50 req/min per CF-Connecting-IP.
  All routes wired with requireAuth middleware before handler.
  Global try-catch: never expose stack traces to client.
  Health: GET /health → 200 OK
  404: all unmatched → JSON {error:'Not found'} 404

After implementation run:
  cd worker
  npx wrangler dev &
  sleep 3
  curl -X POST http://localhost:8787/api/save-session → should get 401
  curl http://localhost:8787/api/leaderboard → should get 200 JSON
  curl http://localhost:8787/health → should get OK
  kill %1
  cd ..

Run: git add -A && git commit -m "feat: complete Cloudflare Worker API all endpoints"
---

VERIFY: All 3 curl tests pass as described. No runtime errors in wrangler dev output.

---
## PHASE 7 — Seed 320 cards into D1
## ID1 | Token: HIGH (320 real card texts)
---

PROMPT:
PRD: 320 seed cards. 40 truths + 40 dares per category.
FRIENDLY (isAdultOnly=0, difficulty 1-3), PARTY (isAdultOnly=0, difficulty 2-4),
COUPLES (isAdultOnly=1, difficulty 2-4), DIRTY (isAdultOnly=1, difficulty 4-5).
All card text must be real, usable party game content. No placeholders ever.

TASK: Write migrations/002_seed_cards.sql with all 320 INSERT statements.
Then run the migration on both local and remote D1.

Write the file with format:
INSERT INTO cards(id,text,type,category,difficulty,is_adult_only) VALUES
  (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||
   substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(2)))||'-'||
   lower(hex(randomblob(6))), TEXT, TYPE, CATEGORY, DIFFICULTY, ADULT);

FRIENDLY TRUTHS (40 cards) — real embarrassing/funny questions:
What is the most embarrassing thing that has ever happened to you in public?
What food combination do you eat secretly that others would find disgusting?
What is the strangest dream you have ever had about someone you know?
What is a habit you have that you would be embarrassed if others found out about?
What is the most childish thing you still do as an adult?
What is the weirdest thing you have searched for online late at night?
What is the most embarrassing song you secretly love?
What did you do as a child that still makes you cringe when you think about it?
... (write all 40 complete unique questions about everyday embarrassments)

FRIENDLY DARES (40 cards) — real silly party dares:
Do your best celebrity impression and keep going until someone guesses who it is.
Speak only in rhymes for the next two minutes or take a penalty point.
Let the group give you an embarrassing nickname for the rest of the game.
... (write all 40 complete unique silly dares)

PARTY TRUTHS (40 cards) — bolder social questions:
What is the most embarrassing text you have ever sent to the wrong person?
Tell us about the wildest night out you have ever had in one minute.
What is the biggest lie you have told and got away with?
... (write all 40)

PARTY DARES (40 cards) — bold group dares:
Call a random contact and sing them Happy Birthday in full.
Let the group send one text from your phone to a contact they choose.
Do 20 push-ups while the group counts out loud — miss any and start over.
... (write all 40)

COUPLES TRUTHS (40 cards, isAdultOnly=1) — relationship questions:
What was your honest first impression of your partner the day you met?
What is one thing your partner does that you find secretly adorable but have never told them?
What is the most embarrassing moment you have had in front of your partner?
... (write all 40)

COUPLES DARES (40 cards, isAdultOnly=1) — romantic dares:
Give your partner a 60-second shoulder massage right now.
Whisper the most romantic thing you can think of into your partner's ear.
Look into your partner's eyes without laughing or looking away for 30 seconds.
... (write all 40)

DIRTY TRUTHS (40 cards, isAdultOnly=1) — adult personal questions:
Write 40 bold adult-only personal questions appropriate for 18+ party players.

DIRTY DARES (40 cards, isAdultOnly=1) — adult party dares:
Write 40 bold adult party game dares appropriate for 18+ verified players.

After writing the file, run:
  npx wrangler d1 execute choose-or-dare --local --file=migrations/002_seed_cards.sql
  npx wrangler d1 execute choose-or-dare --remote --file=migrations/002_seed_cards.sql
  npx wrangler d1 execute choose-or-dare --remote --command="SELECT COUNT(*) as total FROM cards"
  → Confirm total = 320. If not, diagnose and fix.

Run: git add -A && git commit -m "feat: 320 seed cards in D1"
---

VERIFY: D1 query shows total=320. Category counts correct.

---
## PHASE 8 — Router wiring + main.js + API client + PWA + SW
## ID1 | Token: MEDIUM
---

PROMPT:
PRD: Hash-based routing. Auth guard redirects to / if not signed in.
All pages lazy-loaded via dynamic import. PWA: portrait-only, dark theme.
Service worker: cache-first static, network-first API.
Worker URL from VITE_WORKER_URL env var. idToken from getIdToken() call.

TASK: Fill in src/router.js, src/main.js, src/utils/api.js,
public/manifest.json, public/robots.txt, public/_headers,
public/_redirects, public/sw.js, vite.config.js, scripts/generate-icons.js.

src/router.js: Full Router class (hash-based, already scaffolded in Phase 3
— complete the _render method with try/catch error boundary showing friendly
error UI with home button if any page throws).

src/main.js:
  Import all CSS files. Check isMobile() — if desktop: render desktop.js.
  Otherwise: initLandscapeBlock(), lazy-register all routes,
  onAuthChange: set store.user, call router.init(app).
  After init: remove #init-spinner div, call initOfflineBanner().
  Register service worker if supported.

src/utils/api.js:
  const WORKER = import.meta.env.VITE_WORKER_URL
  workerFetch(path, opts): gets fresh idToken, adds Authorization Bearer header,
    fetches WORKER+path, throws Error on non-ok with status + text
  api object: saveSession, getHistory(page), getStats, getLeaderboard (no auth),
    getCustomCards, saveCustomCard, deleteCustomCard, getRandomCard(sessionId,cats,usedIds),
    deleteAccount

public/manifest.json: name, short_name, start_url:/, display:standalone,
  orientation:portrait-primary, theme_color:#7C4DFF, background_color:#0A0A0F,
  icons: [{src:/icon-192.png,sizes:192x192},{src:/icon-512.png,sizes:512x512}]

public/robots.txt: User-agent: *, Disallow: /api, Allow: /

public/_headers: Security headers for all CF Pages paths:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(),microphone=(),geolocation=(),payment=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
    https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://lh3.googleusercontent.com;
    connect-src 'self' https://*.firebaseio.com https://*.googleapis.com
    wss://*.firebaseio.com WORKER_URL_PLACEHOLDER;
    frame-src https://accounts.google.com; object-src 'none'
  For /assets/* path: Cache-Control: public, max-age=31536000, immutable

public/_redirects: /* /index.html 200

public/sw.js: Full service worker. Cache name 'cod-v1'.
  Install: cache all static assets.
  Fetch: cache-first for static, network-first for /api/ calls.
  Cache successful /api/cards/random responses for offline play.

vite.config.js: defineConfig with rollupOptions manualChunks separating
  firebase and utils (dompurify, qrcode, jsqr) chunks. Terser minify.
  Plugin to replace WORKER_URL_PLACEHOLDER in _headers with process.env.VITE_WORKER_URL.

scripts/generate-icons.js: Generate icon-192.png and icon-512.png programmatically.
  Check if 'canvas' npm package available. If yes, use node-canvas.
  If not available, create simple SVG-based icons and save as PNG using sharp.
  Try: npm install -D canvas 2>/dev/null || npm install -D sharp
  Icon design: purple background (#7C4DFF), white "C&D" text centered, 20% border radius.

Add to index.html body before app div:
  <div id="init-spinner" style="position:fixed;inset:0;background:#0A0A0F;
    display:grid;place-items:center;z-index:999">
    <div style="width:44px;height:44px;border-radius:50%;
      border:3px solid rgba(124,77,255,0.2);border-top-color:#7C4DFF;
      animation:spin 0.8s linear infinite"></div>
  </div>
Add to global.css: @keyframes spin{to{transform:rotate(360deg)}}

Run: node scripts/generate-icons.js
Run: git add -A && git commit -m "feat: router, main, api client, PWA, service worker"
---

VERIFY: npm run dev. / loads, redirects to / if no auth. PWA manifest accessible at /manifest.json.
---
## PHASE 9 — Stitch MCP: Landing page + Desktop bottle spinner
## ID2 | Token: HIGH
---

[YOU DO — 3 minutes]:
1. stitch.googleapis.com → sign in with Google → Settings → API Keys → Create → COPY key
2. Antigravity → Settings → MCP Servers → Add:
   Name: stitch | URL: https://stitch.googleapis.com/mcp | Header: X-Goog-Api-Key: YOUR_KEY
3. Test: type "list my Stitch projects" in Antigravity — should respond

PROMPT:
PRD: Landing page is the public homepage. Mobile-only (375px portrait).
Desktop shows only bottle spinner game — no access to real game.
Colors: #0A0A0F bg, #7C4DFF primary. Google Sign-In only.
UI must look handcrafted and premium — NOT generic AI-generated material design.

TASK: Use Stitch MCP to generate both screens then implement them.

STEP 1 — Stitch MCP call for landing page:
Use Stitch with this prompt:
"Mobile landing page for Choose or Dare adult party game. 375px wide portrait only.
Deep black background #0A0A0F. Electric purple CTA #7C4DFF.
App name in large bold custom lettering style, feels handcrafted not system font.
Subtitle: The game that picks who dares. Glowing animated finger circles preview below.
Sign in with Google button: white bg, Google G logo SVG inline, dark text, 52px tall, full width, rounded 16px.
Feature cards 2x2 grid with emoji icons: Finger Picker, 500+ Cards, Track History, 18+ Mode.
Category chips horizontal scroll: Friendly(green #4CAF84), Party(yellow), Couples(pink), Dirty(red).
Footer: 18+ only. Works in mobile browser. Always free.
Must look like a premium app someone crafted by hand at 2am for their friend group.
Not Bootstrap. Not Material Design. Not generic SaaS. Dark party vibe."

Get the HTML/CSS from Stitch. Then implement src/pages/landing.js:
export default function renderLanding(container, router) — returns cleanup fn.
Use Stitch HTML adapted with all colors → CSS vars, fonts → system-ui.
Sign-in button: import {signInWithGoogle} from '../auth.js'
  → loading state (spinner in button) while signing in
  → on success: store.user=user → router.navigate('/home')
  → on error: showToast(e.message, 'error')
Hero finger circles: 3 animated CSS circles pulsing with different colors and delays.
All buttons 52px+ tall.

STEP 2 — Stitch MCP call for desktop blocker:
Use Stitch with this prompt:
"Desktop party game bottle spinner. Full viewport, dark #0A0A0F background.
Large message: This game is for mobile only 📱.
Below: Animated bottle spinner party game. Tall SVG bottle shape that spins.
Add player name inputs (up to 8 players), remove buttons. Spin button large purple.
Bottle animates 3s with ease-out to point at random player. Player name shown large.
Score tracker. After 5 spins: QR code appears linking to mobile site.
Fun party colors, NOT generic."

Implement src/pages/desktop.js — full bottle spinner:
export default function renderDesktop(container) — no cleanup needed.
SVG bottle: simple brown ellipse + cylindrical neck, spins on CSS transform.
Physics: cubic-bezier(0.17,0.67,0.12,1) 3-second spin.
Player management: add up to 8, remove. Default 4 players.
After 5 rounds: generate QR code linking to window.location.origin using qrcode package.
Score per player: track who was picked how many times.

Run: git add -A && git commit -m "feat: landing page and desktop bottle spinner via Stitch MCP"
---

VERIFY: Widen browser > 768px → bottle spinner. Mobile emulator 375px → landing page with sign-in.

---
## PHASE 10 — Stitch MCP: Home dashboard + Game setup
## ID2 | Token: HIGH
---

PROMPT:
PRD: Home shows user avatar, stats (sessions, dares, bravery%), recent games, Start Game CTA.
Setup: player management 2-8, color picker, category chips with adult lock, timer setting.
Bottom nav: 4 tabs — Home, History, Stats, Settings. All interactive elements 52px+.

TASK: Stitch MCP for both screens then implement home.js and setup.js.

STITCH PROMPT for home dashboard:
"Mobile dark home screen for Choose or Dare party game. 375px portrait.
Top bar: user avatar (40px circle from Google photo), user first name, right side bell icon.
Prominent hero section: surfaced dark card (#1C1C2E), subtle purple glow,
  'Ready to Play?' heading, Start New Game button with purple glow shadow.
Stats row beneath: 3 equal cards showing Sessions Played, Dares Done, Bravery%.
  Numbers in large purple bold. Labels small and muted.
Recent Games section: list of 3 compact session cards.
  Each card: date left, player count + rounds right, subtle chevron.
Empty state for no games: fun illustration area + encouragement text.
Bottom navigation bar: 4 icons (home active/purple, history, stats, settings).
  Active indicator: small dot or underline in purple.
  64px total height with safe area padding.
Feels like a premium native app with depth and personality. NOT flat or generic."

Implement src/pages/home.js completely:
- Build bottom nav once, inject into DOM, reuse across authenticated pages
- Load stats from api.getStats(), show skeleton .skeleton divs while loading
- Load history from api.getHistory(1), show last 3 sessions
- User avatar: <img src={store.user.photoURL}> with fallback to initials circle
- Start New Game → router.navigate('/setup')
- Each nav icon navigates to correct route
- Pull-to-refresh: touchstart at top + pull down gesture → reload stats

STITCH PROMPT for game setup:
"Mobile dark game setup screen for party game. 375px portrait.
Page title Set Up Game with back arrow button.
Player list section header. Each player row:
  Colored avatar circle (tappable opens inline color palette),
  name text input with subtle border, delete X icon button.
  Color palette: 8 circles in a row, slides in below player row on tap.
Add Player button: outlined style below list.
Categories section: 2-column grid of chips.
  Each chip: color dot + category name. FRIENDLY(green), PARTY(yellow),
  COUPLES(pink, shows lock when locked), DIRTY(red, shows lock), CUSTOM(blue).
18+ Content switch row with subtitle text explaining it unlocks adult categories.
Timer Duration row: segmented control 30s / 60s / 90s.
Sticky bottom area: Start Game primary button, disabled state obvious, validation message.
The player rows and color picker should feel smooth and satisfying to use."

Implement src/pages/setup.js completely:
- Player rows with inline color picker slide-in (AnimatedSize via CSS max-height transition)
- 8 avatar color options using var(--av0) through var(--av7)
- Adult toggle: store.isAdultUnlocked = true → COUPLES and DIRTY chips unlock
- Validation: 2+ players, all names non-empty, no duplicates, 1+ category
  Show inline error messages, disable button until valid
- On Start Game:
  1. show loading spinner in button
  2. await createRoom(store.user.uid, players, categories)
  3. store.gameSession = {roomId, players, categories, sessionId: crypto.randomUUID()}
  4. router.navigate('/game/'+roomId)

Run: git add -A && git commit -m "feat: home dashboard and game setup screens via Stitch MCP"
---

VERIFY: /home shows dashboard with skeleton loading then real data. /setup shows player list and chips.

---
## PHASE 11 — Finger picker: full multi-touch canvas
## ID2 | Token: HIGH
---

PROMPT:
PRD: Full-screen canvas. Touch events (not pointer events for iOS compat).
Map touchId → {x,y,playerIndex}. 3-second countdown cancels if finger lifts.
Firestore writes throttled 500ms. Particle explosion on winner.
TRUTH button: blue border #42A5F5. DARE button: red border #FF6061.

TASK: Stitch MCP for visual design then implement full src/pages/game.js.

STITCH PROMPT:
"Full-screen dark finger picker game screen. 375px portrait, no UI chrome.
Pure black background. 4 colored glowing circles at different positions.
Each circle: 120px diameter, player name centered, glow aura matching circle color.
Center: huge countdown number '3' in electric purple with blur glow, bounces on each second.
Top area: tiny player chip row (avatar + name, muted colors).
'Dont lift your finger!' hint text near bottom, semi-transparent.
After winner selected: all other circles fade to 20% opacity, winner scales up 1.4x.
Winner name in large bold white text fades in above winner circle.
Bottom: TRUTH button (blue outlined, 56px) and DARE button (red outlined, 56px) slide up.
Particle explosion from winner circle: 30 colorful dots flying outward.
This is the most important screen — it must feel exciting and satisfying."

Implement src/pages/game.js — full canvas multi-touch:
State: touches Map<id,{x,y,playerIndex}>, winner, countdownVal=3, state enum(waiting/countdown/winner)
  particles array, animFrame id, countdownTimer.

Setup: create canvas filling viewport. Style it touch-action:none.
Listen to canvas touchstart/touchmove/touchend (not window, to prevent scroll).
Map touch identifiers to player indices in order of arrival.
Reject touches beyond player count (no null errors).

Draw loop (rAF):
  Clear canvas each frame.
  For each touch: glow circle(r=75,color@15%), filled circle(r=60,color@70%), white stroke 2px.
  Text centered: player name, 13px bold, white.
  Winner: non-winners alpha lerp toward 0.18, winner scale lerp toward 1.4.
  Particles: position = origin + direction*progress*180, alpha = (1-progress/maxLife).
    Add gravity (vy += 0.3 each frame).

Countdown: start when touches.size >= 2 AND state===waiting.
  setInterval 1000ms, decrement, update DOM countdown el.
  Cancel if touches.size < 2.
  On 0: pick random key from touches, set winner, launch particles.
  haptic.winner() + sound.winner().
  After 1500ms: show TRUTH/DARE buttons with CSS slide-up.

Firestore: call writeFingerPos(roomId, touchId, x/canvasW, y/canvasH, playerIndex)
  from onMove handler (already throttled in firestore.js).

Navigation:
  TRUTH → store.currentCardType='TRUTH', store.currentPlayerName=winner.name
         → router.navigate('/game/'+roomId+'/card')
  DARE → same with 'DARE'

Cleanup fn returned: cancelAnimationFrame, remove listeners, clearInterval.

Add all CSS to a <style> tag injected in this page (scoped with .gp- prefix).

Run: git add -A && git commit -m "feat: finger picker multi-touch canvas"
---

VERIFY: Two simultaneous touches create two circles. Countdown starts. Winner selected with particles.

---
## PHASE 12 — Card reveal: 3D flip + dare timer + voting panel
## ID2 | Token: HIGH
---

PROMPT:
PRD: CSS 3D flip animation. Front: category color + tap hint. Back: card text 22px.
SVG circular timer: changes green→amber→red. Voting: DONE/CHICKENED per player.
After 3+ rounds: End Game button. Save via api.saveSession() then deleteRoom().

TASK: Stitch MCP then implement card.js and its two widget files.

STITCH PROMPT:
"Mobile game card reveal screen for truth or dare party game. 375px portrait.
Top bar: player avatar circle + player name (left), round number badge (center), Skip text button (right).
Large playing card centered: portrait aspect ratio 0.65, rounded corners 22px.
  Card front: category gradient background, category emoji large, Tap to reveal italic text,
    difficulty dots at bottom (5 circles, filled = category color).
  Card back: dark surface background, type badge pill top (TRUTH=blue, DARE=red),
    card text large 22px centered with good vertical padding, difficulty stars.
  The flip must feel physical and satisfying — 3D perspective visible.
Below card (DARE only): circular SVG countdown timer 120px.
  Track circle light, progress arc clockwise, seconds number centered.
  Color changes as urgency increases.
Voting panel: slides up from bottom. Grid of player buttons 2-col.
  Each shows avatar + name. Toggles between DONE (green border) and CHICKENED (red border).
  Vote count display. Submit button.
End Game button top right appears after 3 rounds. Red or muted color.
This card is what players look at most — make it feel premium and tactile."

Implement src/pages/card.js:
Load card: api.getRandomCard(sessionId, categories, store.usedCardIds) on mount.
  Show skeleton card shape while loading (shimmer animation).
  store.currentCard = card.

Card flip HTML structure (from animations.css classes):
  .card-scene > .card-inner > (.card-face.card-front + .card-face.card-back)
  On tap front: add .flipped to .card-inner, sound.flip(), haptic.medium().

Card front bg by category:
  FRIENDLY: linear-gradient(135deg,#1a2e24,#243b2c), border #4CAF84
  PARTY: linear-gradient(135deg,#2a2614,#332e16), border #F0C040
  COUPLES: linear-gradient(135deg,#2a1520,#361c28), border #E878B8
  DIRTY: linear-gradient(135deg,#2a1416,#36181a), border #FF5060
  CUSTOM: linear-gradient(135deg,#142028,#182a36), border #50CCFF

SVG Timer (inline SVG, not canvas):
  Two <circle> elements: track (r=52, white@10%, 6px stroke) + arc (r=52, 6px stroke, linecap round)
  stroke-dasharray: 2*PI*52 = 326.7
  stroke-dashoffset: 326.7 * (1 - elapsed/total)
  Color: elapsed/total < 0.4 → var(--success), < 0.8 → var(--warning), else → var(--error)
  setInterval 1000ms update. At 10s: haptic.medium(). At 3s: haptic.heavy(). At 0: haptic.error() + sound.ding() + show voting.

TRUTH done: single green button → append result immediately.
Voting panel: slide up from bottom (CSS transform translateY transition).
  Render all session players except active player as vote buttons.
  Local votes Map. Toggle DONE/CHICKENED on tap with haptic.light().
  Submit: majority wins → if DONE: sound.ding() else sound.error()

After result:
  store.roundResults.push({playerName, cardText, cardType, category, result, duration})
  store.usedCardIds.add(card.id)
  router.navigate('/game/'+roomId) — back to picker for next round

End Game (show after store.roundResults.length >= 3):
  Confirm bottom sheet: "End game and see results?"
  On confirm: show loading, await api.saveSession({...data}), then deleteRoom(roomId),
  then router.navigate('/result/'+store.gameSession.sessionId, true)

Run: git add -A && git commit -m "feat: card reveal 3D flip, dare timer, voting panel"
---

VERIFY: Card flip smooth 60fps. Back face not mirrored. Timer color changes correctly. Vote majority works.

---
## PHASE 13 — Session result + history screen
## ID2 | Token: HIGH
---

PROMPT:
PRD: Result: data from store.roundResults (already in memory). Confetti canvas.
Podium 3 blocks gold/silver/bronze. Leaderboard with bravery scores.
History: api.getHistory() paginated. Grouped by session. Expandable. Search + filter.

TASK: Stitch MCP for both screens then implement result.js and history.js.

STITCH PROMPT for result:
"Mobile session result celebration screen for party game. 375px portrait.
Session Complete! heading in large purple bold.
Canvas confetti at top: colorful paper pieces falling briefly.
Podium section: 3 blocks (gold center tallest, silver left, bronze right).
  Player avatar circles above each block. Bravery % below name. Grows upward on enter.
Full leaderboard list below podium.
  Each row: rank circle (1=gold #FFD740, 2=silver, 3=gray), avatar, name, bravery bar, %.
  Rows slide in from right with stagger delay.
Three buttons stacked at bottom: Play Again (primary), New Game (outlined), View History (text).
Feels like a celebration — premium confetti, satisfying animations."

STITCH PROMPT for history:
"Mobile history timeline screen for party game. 375px portrait.
Top bar: History title, search icon, filter icon.
Animated search bar: slides down from top bar when search icon tapped.
Filter chips horizontal scroll row below: All, Truths, Dares, Done, Skipped.
Main content: sessions grouped with sticky date headers.
  Session header: date left, X rounds right, expand/collapse chevron.
  Collapsed: just header. Expanded: shows history item cards below.
  History item: player avatar circle, card text 2 lines ellipsis,
    result badge (Done=green pill, Skipped=red pill), timestamp.
Skeleton loading: 3 shimmer cards while data loads.
Empty state: fun illustration, No history yet, Start a Game button.
Clean minimal list design with good depth and contrast."

Implement src/pages/result.js:
- Compute per-player stats from store.roundResults
- Confetti: 80 particles, requestAnimationFrame, random colors, fall with gravity
- Podium: 3 divs, CSS height transition from 0 on mount, gold/silver/bronze colors
- Leaderboard: CSS animation-delay: calc(var(--i) * 60ms) stagger
- Play Again: preserve store.gameSession.players → router.navigate('/setup')
- New Game: resetGame() → router.navigate('/setup')

Implement src/pages/history.js:
- Load api.getHistory(1) on mount, show 3 skeleton cards while loading
- Group by session_id using Map, render sticky headers with position:sticky
- Expand/collapse: CSS max-height transition 0 → auto
- Search: debounce(300ms) → filter client-side against loaded items
- Filter chips: filter clientside for cardType and result
- IntersectionObserver on last session → load next page and append
- Pull to refresh: call initPullToRefresh(container, loadHistory) from feedback.js

Run: git add -A && git commit -m "feat: session result with confetti, history timeline"
---

---
## PHASE 14 — Stats + Leaderboard screens
## ID2 | Token: MEDIUM
---

PROMPT:
PRD: Stats from api.getStats(). Animated bravery gauge SVG arc.
Achievements: Fearless(10 dares), TruthTeller(20 truths), PartyAnimal(5 sessions), BraveHeart(>80%).
Leaderboard from api.getLeaderboard(). Top 50. Current user highlighted.

TASK: Stitch MCP for both then implement stats.js and leaderboard.js.

STITCH PROMPT for stats:
"Mobile player stats screen for party game. 375px portrait.
Large circular bravery gauge at top center: 270° SVG arc from bottom-left to bottom-right.
Background arc light, progress arc purple-to-green gradient. Percentage in center bold.
2x2 metric grid below: Dares Done (green), Truths Done (blue), Dares Skipped (red), Sessions (purple).
Each card dark surface background with number large bold, label small muted.
Category Breakdown card: each category has horizontal bar with category color fill.
Dare Streak card: flame emoji, large number, Best: X below.
Achievement badges horizontal scroll: 4 circles 72px, golden=unlocked, gray with lock=locked.
Badge names: Fearless, Truth Teller, Party Animal, Brave Heart.
Skeleton shimmer for all sections while loading. Premium dark feel."

STITCH PROMPT for leaderboard:
"Mobile leaderboard screen for party game. 375px portrait.
Two tabs: All Time, This Month. Purple underline on active tab.
Top 3 podium with crown icon above #1. Player avatars above blocks.
Ranked list: rank circle (1=gold,2=silver,3=bronze,4+=gray), avatar, name, bravery bar, %.
Current user's row: subtle purple border glow to distinguish.
My Rank sticky bar at bottom: shows your rank+score if off screen.
Clean dark list with good contrast and hierarchy."

Implement src/pages/stats.js:
- api.getStats() → show skeleton while loading
- Bravery gauge: SVG inline, animate arc stroke-dashoffset from full (0%) to actual
  using requestAnimationFrame over 1200ms with easeOut curve
- Color: lerp between --error (0) → --warning (50%) → --success (100%)
- Category bars: CSS width transition from 0, triggered after data loads
- Achievements: check stats against thresholds, apply .unlocked or .locked class

Implement src/pages/leaderboard.js:
- api.getLeaderboard() → show skeleton while loading
- Highlight row where uid matches store.user.uid with purple glow style
- Tab switching: append ?period=month or ?period=all to API call
- My rank sticky bar: if user is in list, find their rank, show at bottom

Run: git add -A && git commit -m "feat: stats with animated gauge, leaderboard with tabs"
---

---
## PHASE 15 — Custom cards creator + QR sharing
## ID3 | Token: HIGH
---

PROMPT:
PRD: Custom cards in D1 via Worker. Max 150 chars. QR export with qrcode package.
Camera scan with jsqr. Custom cards appear in game when CUSTOM category selected.

TASK: Stitch MCP then implement src/pages/cards.js completely.

STITCH PROMPT:
"Mobile custom card creator screen for party game. 375px portrait.
Live card preview at top: small physical-looking card 3D flippable.
Updates in real-time as user types. Auto-flips when text > 10 chars.
Below preview:
  TRUTH/DARE segmented button toggle, full width.
  Multiline text input, min 3 rows, character counter '0/150' bottom-right.
  5 star difficulty row: tap to select, amber filled, gray unfilled.
  Adult content toggle (conditional on settings).
  Save Card button: primary, full width, disabled until 10+ chars.
My Cards section below: list of saved cards.
  Each: type badge, 2 lines text preview, edit icon, delete icon.
  Swipe left to delete gesture support optional.
Share Pack section at bottom of list:
  Generate QR button and Scan to Import button side by side.
QR display: bottom sheet with generated QR image, share button.
Scanner: full-screen camera view with scan frame overlay.
Card creator feels like you're creating a physical card — premium texture feeling."

Implement src/pages/cards.js fully:
Live preview: clone card HTML structure from Phase 12, update text+type on input event.
Auto-flip: when text.length > 10 → add .flipped class to preview card inner.
Difficulty: 5 star buttons, clicking star N sets difficulty to N.
Adult toggle: show only if store.isAdultUnlocked is true.
Save: sanitizeCard(text) → api.saveCustomCard({text, type, category:'CUSTOM', difficulty, isAdultOnly})
  → showToast('Card saved! ✓','success') → reset form.
Edit: load card into form, change Save button to Update, PUT to same endpoint.
Delete: confirm dialog → api.deleteCustomCard(id) → remove from list.

QR Export:
  import QRCode from 'qrcode'
  const json = JSON.stringify({v:1, cards: customCards.map(c=>({text:c.text,type:c.type,diff:c.difficulty,adult:c.is_adult_only}))})
  QRCode.toCanvas(canvasEl, json, {width:260, color:{dark:'#7C4DFF',light:'#0A0A0F'}})
  Show in bottom sheet. Share button: navigator.share({text: json}) or fallback copy.

QR Scanner:
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
  → <video> element → requestAnimationFrame capture frames
  → jsQR(imageData.data, width, height) → on detection: parse JSON
  → show import preview: card count + first 5 card texts → Import All button
  → api.saveCustomCard for each → showToast('X cards imported!','success')

Run: git add -A && git commit -m "feat: custom card creator with QR export and scan import"
---

---
## PHASE 16 — Settings screen + 404 page + notifications
## ID3 | Token: MEDIUM
---

PROMPT:
PRD: Settings in store.js only (no localStorage). Sound, haptics, timer, adult toggle.
Export history as CSV via Web Share API. Delete account removes all D1 data.

TASK: Stitch MCP for settings, implement settings.js, notfound.js.

STITCH PROMPT:
"Mobile settings screen for party game. 375px portrait.
User profile section top: Google avatar circle (56px), display name bold, email muted below.
Grouped settings sections separated by section headers:
  GAME section: Sound Effects (toggle), Haptic Feedback (toggle), Dare Timer (30s/60s/90s segmented).
  CONTENT section: 18+ Content toggle with warning subtitle.
  DATA section: Export History (row with share icon), Clear History (row, red text), Delete Account (row, danger red).
Account section: Sign Out button full width outlined danger style.
About section: App Version row, Made with ❤️ row.
Each row: 52px min height, left icon + label + right control/chevron.
Clean minimal dark settings — iOS-inspired list sections but dark party themed."

Implement src/pages/settings.js:
- Sound toggle: store.soundEnabled = !store.soundEnabled → test with sound.tick()
- Haptics toggle: store.hapticsEnabled = !store.hapticsEnabled → test with haptic.light()
- Timer segments: store.defaultTimer = 30|60|90
- Adult toggle: store.isAdultUnlocked = !store.isAdultUnlocked
- Export: api.getHistory(1) then format as CSV text, navigator.share({text:csv}) or blob download
- Clear history: confirm dialog → run multiple api calls to clear (add endpoint if needed)
- Delete account: confirm dialog → api.deleteAccount() → auth.logout() → router.navigate('/')
- Sign out: auth.logout() → router.navigate('/')

Implement src/pages/notfound.js:
  Fun 404 page. "404" large purple. "This room doesn't exist 🎲". "Go Home" button.
  Use Stitch: "404 page dark party game. Fun with dice or card emoji. Purple accent. Go Home button."

Run: git add -A && git commit -m "feat: settings screen, 404 page"
---

---
## PHASE 17 — GitHub Actions CI/CD + first live deploy
## ID3 | Token: MEDIUM
---

[YOU DO — 12 minutes]:
1. cloudflare.com → My Profile → API Tokens → Create Token
   → Use "Edit Cloudflare Workers" template → Create → COPY token
2. Your Account ID: shown in Cloudflare dashboard right sidebar
3. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   CF_API_TOKEN = paste Cloudflare token
   CF_ACCOUNT_ID = paste Account ID
   VITE_FIREBASE_API_KEY = your Firebase key
   VITE_FIREBASE_AUTH_DOMAIN = your domain
   VITE_FIREBASE_PROJECT_ID = your project ID
   VITE_FIREBASE_APP_ID = your app ID
   VITE_WORKER_URL = https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev

PROMPT:
PRD: GitHub Actions deploys frontend to Cloudflare Pages. Separate workflow deploys Worker.
All env vars from GitHub Secrets. No secrets in source ever.

TASK: Fill in both workflow files and run first deployment.

FILE .github/workflows/deploy.yml:
Complete workflow:
  on push to main. Ubuntu latest.
  Steps: checkout, setup-node 20, npm ci,
  build with all VITE_ env vars from secrets,
  deploy with cloudflare/wrangler-action@v3 command:
    "pages deploy dist --project-name=choose-or-dare --branch=main"

FILE .github/workflows/deploy-worker.yml:
  on push to main where paths include worker/** or migrations/**
  working-directory: worker
  Steps: checkout, setup-node, npm ci,
  wrangler deploy command

After creating files, run these commands to deploy Worker manually first:
  cd worker
  npx wrangler secret put ALLOWED_ORIGIN
  (enter: https://choose-or-dare.pages.dev when prompted)
  npx wrangler secret put FIREBASE_PROJECT_ID
  (enter: your Firebase project ID when prompted)
  npx wrangler deploy
  cd ..

Then push all code to trigger Pages build:
  git add -A && git commit -m "ci: GitHub Actions deploy workflows + first deploy" && git push

Show the deployed Pages URL after successful build.
---

[YOU DO AFTER DEPLOY SHOWS URL]:
1. Firebase Console → Authentication → Settings → Authorized domains
   → Add domain: choose-or-dare.pages.dev (or your custom URL)

VERIFY: Open Pages URL on phone browser. Landing page visible. Sign-in button works.

---
## PHASE 18 — Production verification + smoke tests
## ID3 | Token: LOW
---

PROMPT:
PRD: All endpoints live. Firestore rules in production mode. D1 remote has 320 cards.
Security headers on Pages responses. CORS working between Pages and Worker.

TASK: Run all production smoke tests. Fix any failures found.

Run these tests and fix every failure:

1. D1 remote card count:
   npx wrangler d1 execute choose-or-dare --remote --command="SELECT COUNT(*) as total FROM cards"
   → Must show 320. If not: npx wrangler d1 execute choose-or-dare --remote --file=migrations/002_seed_cards.sql

2. Worker health:
   curl https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/health
   → Must return 200 OK

3. Worker leaderboard (public endpoint):
   curl https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/api/leaderboard
   → Must return JSON with results array

4. Worker auth protection:
   curl -X POST https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/api/save-session
   → Must return 401

5. CORS check:
   curl -H "Origin: https://choose-or-dare.pages.dev" https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/api/leaderboard
   → Must return 200, not 403

6. Security headers on Pages:
   curl -I https://choose-or-dare.pages.dev
   → Must show: X-Frame-Options: DENY and X-Content-Type-Options: nosniff

7. Bundle size:
   npm run build
   du -sh dist/ (should be < 5MB unpacked, < 150KB gzipped main chunk)

8. PWA manifest:
   curl https://choose-or-dare.pages.dev/manifest.json
   → Must return valid JSON

If any test fails: diagnose and fix the specific issue before continuing.

git add -A && git commit -m "ops: production smoke tests passing"
---

---
## PHASE 19 — Full security hardening
## ID3 | Token: LOW-MEDIUM
---

PROMPT:
PRD: DOMPurify on all inputs. Parameterized SQL always. CSP headers.
idToken never in DOM/localStorage. isValidRoomId before Firestore calls.
CORS + content-type checks in Worker. Rate limiting by IP + uid.

TASK: Security audit across all files. Fix every issue found. No new features.

AUDIT game.js:
  → roomId comes from router params. Verify isValidRoomId(params.id) called before createRoom/listenToRoom.
  → If not present: add check at top of renderGame, redirect to /home if invalid.

AUDIT card.js:
  → cardText displayed: must use textContent not innerHTML.
  → Any other dynamic content from API: use textContent or escapeHtml().

AUDIT setup.js:
  → Player names sent to Firestore: wrap each in sanitizeName() before createRoom call.
  → Category values: validate against known list before sending.

AUDIT cards.js:
  → Card text input: wrap in sanitizeCard() before api.saveCustomCard().
  → QR scanned content: try-catch JSON.parse, validate structure before inserting.
  → Import: check each card text with sanitizeCard() before saving.

AUDIT worker/src/routes/cards.js:
  → deleteCustomCard: verify DELETE WHERE id=? AND uid=? is the exact query used.
    → If uid is not in WHERE clause: add it (prevents IDOR).

AUDIT worker/src/routes/session.js:
  → Each round's cardText sliced to 200 chars max.
  → playerName sliced to 50 chars max.
  → All SQL uses ? placeholders, never string concatenation.

AUDIT worker/src/index.js:
  → Content-type check on POST requests (reject if not application/json).
  → IP-based rate limit: extract CF-Connecting-IP header, limit 60 req/min.
  → Verify Origin check runs on POST and DELETE but not GET.
  → Error handler never exposes e.stack or e.message to client.

VERIFY no idToken leaks:
  Search all src/ files for: localStorage, sessionStorage, document.cookie,
  setAttribute (with token value), innerHTML (with token value).
  Report: "No idToken leaks found" or fix any found.

UPDATE public/_headers:
  Verify CSP connect-src includes your actual Worker URL (not placeholder).

Run: git add -A && git commit -m "security: full audit, all inputs sanitized, IDOR fixed"
---

---
## PHASE 20 — Accessibility audit + performance optimizations
## ID3 | Token: LOW
---

PROMPT:
PRD: WCAG AA. All interactive elements 48px+ touch target.
Bundle < 150KB gzipped. FCP < 1.5s on 4G. System UI fonts only. No web font requests.

TASK: Accessibility fixes and performance optimizations.

ACCESSIBILITY — add to all page files:
  All icon-only buttons: add aria-label="descriptive name"
  All avatar images: alt="${playerName}'s avatar" or alt="" if decorative
  All text inputs: ensure associated <label> or aria-label exists
  Toast container: add role="status" aria-live="polite"
  Countdown element in game.js: add aria-live="assertive" aria-atomic="true"
  Category chips: aria-label="${name} category${isSelected?' selected':''}"
    aria-pressed="${isSelected}"
  Result badges: aria-label="Result: ${result}"

ACCESSIBILITY — add to global.css:
  :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }
  Add skip link: <a href="#app" class="sr-only focus-visible:...">Skip to content</a> in index.html

PERFORMANCE — vite.config.js:
  Add rollup-plugin-visualizer to see bundle breakdown.
  Verify manualChunks separates firebase (large) from game code.
  Check: does qrcode and jsqr only load when /cards route is visited?
  If not: ensure cards.js uses dynamic import() for qrcode and jsqr.

PERFORMANCE — check these pages lazy-load heavy deps:
  cards.js: import('qrcode') and import('jsqr') should be inside functions, not at top.
  landing.js: any animation library should be imported only when mounted.

PERFORMANCE — index.html:
  Add: <link rel="preconnect" href="https://www.gstatic.com">
  Add: <link rel="preconnect" href="https://apis.google.com">
  Add: <link rel="dns-prefetch" href="https://firebaseio.com">

Run: npm run build
  Check output: show size of each chunk. Fix any chunk over 50KB gzipped.

git add -A && git commit -m "a11y: accessibility audit, perf: bundle optimization"
---

---
## PHASE 21 — Haptics + sounds integrated across all screens
## ID3 | Token: LOW
---

PROMPT:
PRD: Haptic on all key interactions. Sound via Web Audio API (no files).
Always check store.hapticsEnabled and store.soundEnabled before calling.

TASK: Audit all page files, add all missing haptic/sound calls, add toast feedback.

ADD to game.js:
  touchstart → haptic.light() for each new finger added
  winner selected → haptic.winner() + after 200ms delay: sound.winner()

ADD to card.js:
  card tap (flip) → haptic.medium() + sound.flip()
  each vote button tap → haptic.light() + sound.vote()
  timer at 10s remaining → haptic.medium()
  timer at 3s remaining → haptic.heavy()
  timer complete → haptic.error() + sound.ding()
  submit votes → haptic.medium()
  skip card → haptic.light()

ADD to setup.js:
  add player → haptic.light()
  remove player → haptic.light()
  category chip toggle → haptic.light()
  start game → haptic.medium()
  validation error → haptic.error() + showToast(errorMsg, 'error')

ADD to home.js:
  start new game tap → haptic.medium()

ADD to result.js:
  on mount (confetti starts) → haptic.winner() + sound.winner()
  session saved toast → showToast('Session saved to history ✓', 'success')

ADD toasts for API errors:
  In every api.js call site: wrap in try/catch, showToast(err.message, 'error') on failure.
  Specific messages: "Could not load card — retrying" in card.js.
  "Connection issue — changes may not save" for Firestore errors.

VERIFY store.soundEnabled and store.hapticsEnabled are initialized to true in store.js.
VERIFY settings.js toggles actually update store values immediately.

git add -A && git commit -m "feat: haptics and sounds integrated across all screens"
---

---
## PHASE 22 — Offline + SW + pull-to-refresh + infinite scroll
## ID3 | Token: LOW-MEDIUM
---

PROMPT:
PRD: Service worker caches static + card data for offline play.
Offline banner when no network. History has infinite scroll and pull-to-refresh.

TASK: Complete public/sw.js, add pull-to-refresh utility, infinite scroll.

Complete public/sw.js — full implementation:
  CACHE_NAME = 'cod-v1'
  STATIC_ASSETS: ['/','index.html', all CSS paths, '/manifest.json', '/sw.js']
  install: cache all static assets, self.skipWaiting()
  activate: delete old caches, self.clients.claim()
  fetch strategy:
    For static assets (/assets/, .css, .js): cache-first (check cache, then network)
    For /api/cards/random: network-first, cache successful responses for offline
    For all other /api/: network-only (live data)
    For navigation requests: respond with cached index.html

Add to src/utils/feedback.js:
  initPullToRefresh(scrollContainer, onRefresh):
    trackTouch: startY on touchstart when scrollTop===0
    on touchmove: if pull distance > 60px → show "↑ Release to refresh" indicator
    on touchend: if pulled far enough → indicator shows spinner → await onRefresh() → hide
  addInfiniteScroll(sentinelEl, onLoadMore):
    IntersectionObserver watching sentinelEl
    On intersect: call onLoadMore()
    Return disconnect() cleanup function

Apply pull-to-refresh in history.js and stats.js.
Apply infinite scroll in history.js (sentinel after last session group).
initOfflineBanner() already called in main.js — verify it is.

git add -A && git commit -m "feat: complete service worker, pull-to-refresh, infinite scroll"
---

---
## PHASE 23 — Stitch MCP UI polish: improve 3 key screens
## ID4 | Token: HIGH
---

PROMPT:
PRD: UI must look handcrafted and professional. NOT AI-generated. NOT generic.
Three most-used screens need polish: landing, finger picker, card reveal.

TASK: Use Stitch MCP to review each screen and apply top improvements.

STITCH REVIEW for landing page:
Prompt to Stitch: "Review this mobile party game landing page and suggest 3 specific
improvements to make it look more handcrafted and premium. Focus on:
1. Visual hierarchy and focal point 2. How to add personality without more clutter
3. One micro-interaction that would make the CTA button feel more alive.
The current design should use more depth, better type scale contrast, and a
more editorial layout. Background: dark #0A0A0F, primary: purple #7C4DFF."
Apply top 2 suggestions to landing.js.

STITCH REVIEW for game screen (finger picker):
Prompt to Stitch: "Improve the countdown experience for a finger picker game.
The countdown numbers 3-2-1 should feel more dramatic. Suggest an animation approach
that makes each number feel weighty and urgent without being distracting.
Also: how should the winner reveal moment look? The name appearing should feel like
a climactic reveal, not a simple fade-in. Keep: black bg, player-colored circles."
Apply the countdown and winner reveal improvements to game.js.

STITCH REVIEW for card screen:
Prompt to Stitch: "Improve the card flip moment for a truth-or-dare game.
The instant before reveal should build anticipation. Suggest:
1. A way to add a shimmer/anticipation effect to the card front before tap
2. How to make the card back text appear more dramatically after flip
3. How the dare timer should visually communicate urgency in the last 10 seconds.
Keep: dark background, category-colored card borders."
Apply improvements to card.js front face and timer section.

git add -A && git commit -m "ui: Stitch MCP polish pass on landing, picker, card screens"
---

---
## PHASE 24 — Add missing Worker endpoints + account deletion
## ID4 | Token: LOW
---

PROMPT:
PRD: DELETE /api/account removes all user data from D1. GET /api/cards/random
serves from D1 cards table with anti-repeat logic.

TASK: Verify /api/cards/random is fully working. Add Clear History endpoint.
Fix any missing Worker routes discovered in testing.

VERIFY worker/src/routes/cards.js getRandomCard:
  SQL: SELECT * FROM cards WHERE category IN (?) AND is_adult_only IN (?) 
       AND id NOT IN (SELECT card_id FROM history WHERE session_id=?)
       ORDER BY RANDOM() LIMIT 1
  Test: npx wrangler dev then:
    curl "http://localhost:8787/api/cards/random?categories=FRIENDLY&sessionId=test&usedIds="
    → Should return a card. If not: debug the SQL and params.

Add to worker/src/routes/account.js: clearHistory(req,env,user)
  DELETE FROM history WHERE uid=?
  Then UPDATE users SET total_sessions=0,total_dares=0,total_truths=0,bravery_score=0 WHERE uid=?
  Return {success:true, message:'History cleared'}

Add route to worker/src/index.js:
  DELETE /api/history → requireAuth → clearHistory

Update src/utils/api.js:
  clearHistory: () => call('/api/history', {method:'DELETE'})

Update settings.js Clear History action:
  → call api.clearHistory() → showToast('History cleared','success') → reload stats

cd worker && npx wrangler deploy && cd ..
git add -A && git commit -m "feat: clear history endpoint, card random verified"
---

---
## PHASE 25 — Error handling + loading states everywhere
## ID4 | Token: LOW
---

PROMPT:
PRD: All API calls have error handling. All async operations show loading state.
User never sees blank screen or unhandled error.

TASK: Audit every async operation in every page file. Add try/catch + loading states.

PATTERN to apply everywhere:
  1. Before async call: set loading state true → show skeleton or spinner in button
  2. In try: run the call, update UI with data
  3. In catch: showToast(err.message, 'error'), log to console
  4. In finally: set loading state false → hide spinner

Pages to audit and fix:
  home.js: getStats() and getHistory() — both need individual skeleton states
  stats.js: getStats() — skeleton gauge and skeleton cards
  leaderboard.js: getLeaderboard() — skeleton list rows
  history.js: getHistory() — already has skeleton, verify try/catch exists
  cards.js: getCustomCards(), saveCustomCard(), deleteCustomCard() — loading states
  card.js: getRandomCard() on mount AND on each new round (skip clears to next card)
  result.js: saveSession() — show full-screen loading overlay while saving,
    disable all buttons, show error with retry if fails

Add retry button pattern to card.js if getRandomCard fails:
  Show: "Could not load card" + Retry button → calls getRandomCard again

Add full-screen error overlay for critical failures (room not found, session expired):
  Shows: large error message + Go Home button
  Triggered by: room deleted mid-game, auth expired mid-game

git add -A && git commit -m "feat: comprehensive error handling and loading states"
---

---
## PHASE 26 — Bundle optimization + PWA icons + final perf
## ID4 | Token: LOW
---

PROMPT:
PRD: Bundle < 150KB gzipped. PWA icons: icon-192.png, icon-512.png.
FCP < 1.5s. System UI fonts only.

TASK: Complete performance optimization and generate PWA icons.

STEP 1: Generate PWA icons:
  Run: node scripts/generate-icons.js
  If canvas package failed to install, use this alternative in scripts/generate-icons.js:
    Create SVG string: purple circle bg (#7C4DFF), white "C&D" text, then
    convert to PNG using: npm install -D sharp
    Or: create base64-encoded PNG directly as a data URL and write Buffer to file

STEP 2: Verify icons in public/:
  ls -la public/icon-192.png public/icon-512.png
  Both must exist and be > 0 bytes

STEP 3: Run bundle analysis:
  npm run build
  Look at dist/stats.html if visualizer configured.
  Show sizes of all chunks.

STEP 4: Fix any oversized chunks:
  Firebase chunk > 80KB: normal (Firebase SDK is large) — acceptable
  DOMPurify: should be in utils chunk, < 30KB — check
  qrcode/jsqr: must only load in cards.js chunk — verify dynamic import in cards.js

STEP 5: Remove any web font references:
  Search all HTML and CSS for: fonts.googleapis, fonts.gstatic, @import url(
  → Remove any found. System UI stack only.

STEP 6: Verify init spinner shows on cold load:
  Disable JS in browser DevTools → load page → spinner should be visible in pure HTML

STEP 7: Add Open Graph meta tags to index.html:
  og:title, og:description, og:type (website), twitter:card (summary)

Run: git add -A && git commit -m "perf: PWA icons, bundle optimization, OG tags"
---

---
## PHASE 27 — Cross-browser testing + known iOS Safari fixes
## ID4 | Token: LOW-MEDIUM
---

PROMPT:
PRD: Must work on Chrome Android and Safari iOS. Touch events (not pointer events).
iOS: no vibration API. iOS: AudioContext needs user gesture. iOS: viewport fixed issues.

TASK: Fix all iOS Safari compatibility issues. Verify Android Chrome works fully.

iOS SAFARI FIXES to check and implement:

FIX 1 — AudioContext requires user gesture on iOS:
  In feedback.js, _ctx is created lazily already. But on iOS the context starts
  in 'suspended' state until user interaction. Add:
  document.addEventListener('touchstart', () => {
    if(_ctx?.state === 'suspended') _ctx.resume()
  }, {once: true})
  Add this to feedback.js initAudio() function called from main.js after router.init().

FIX 2 — navigator.vibrate not available on iOS (always returns false):
  All haptic.* functions already check navigator.vibrate — verify this is the case.
  If not: add typeof navigator.vibrate === 'function' check.

FIX 3 — viewport height on iOS (100vh includes Safari toolbar):
  In global.css: replace height:100vh with height:100svh (small viewport height).
  Fallback: height: -webkit-fill-available; for older iOS.
  Fix: body { min-height: 100svh; } and .full-screen { height: 100svh; }

FIX 4 — Position:fixed bottom elements shift on iOS when keyboard opens:
  In setup.js sticky button: use position:sticky instead of position:fixed.
  Or: add padding-bottom: env(safe-area-inset-bottom) to bottom-nav.

FIX 5 — signInWithPopup on iOS Safari may be blocked:
  Firebase recommends signInWithRedirect on iOS Safari.
  Detect iOS: /iPhone|iPad|iPod/i.test(navigator.userAgent)
  If iOS: use signInWithRedirect(auth, provider) + getRedirectResult() in auth.js
  Update auth.js signInWithGoogle() to handle both cases.

FIX 6 — Canvas touch events on iOS:
  canvas.addEventListener('touchstart', handler, {passive: false}) — verify passive:false.
  preventDefault() inside handler prevents page scroll during game — verify present.

FIX 7 — iOS < 16 doesn't support :focus-visible well:
  Add -webkit-focus-ring-color polyfill or remove focus-visible reliance.

Run: git add -A && git commit -m "fix: iOS Safari compatibility — vibrate, AudioContext, viewport, redirect sign-in"
---

---
## PHASE 28 — End-to-end manual test + bug fixes
## ID4 | Token: MEDIUM
---

PROMPT:
PRD: Full game flow: sign in → setup → finger picker → card reveal → result → history.
Desktop shows bottle spinner only. Security headers on all responses.
All free tier budgets: Firestore 50k/day, Workers 100k/day, D1 5M reads/month.

TASK: Simulate full test checklist by reading through all code. Fix any bugs found.

For each test case below: read the relevant code and verify the logic is correct.
If logic is wrong or missing: fix it. Report which tests passed and which were fixed.

GROUP A — Device + Auth:
  A1: isMobile() false for screen.width=1920 no touch → shows desktop.js only
  A2: isMobile() true for screen.width=375 with touch → shows app
  A3: Unauthenticated → /home redirects to /
  A4: Logout → store.idToken=null, store.user=null, navigate to /
  A5: idToken never in localStorage (search for localStorage in auth.js)
  A6: Token refresh: getIdToken() called after tokenExpiry → calls getIdToken(true)

GROUP B — Setup + Room:
  B1: 1 player → Start Game disabled
  B2: Duplicate names → validation error message shown
  B3: COUPLES chip locked when store.isAdultUnlocked=false
  B4: Adult toggle → COUPLES and DIRTY unlock
  B5: Start Game → createRoom called → roomId set in store.gameSession
  B6: roomId stored uses crypto.randomUUID() format (valid UUID)

GROUP C — Finger Picker:
  C1: Single touch → circle appears, no countdown
  C2: Second touch → countdown starts
  C3: Lift finger during countdown → countdown resets
  C4: Countdown hits 0 → winner randomly from active touches
  C5: Winner → particles spawn from winner position
  C6: TRUTH/DARE buttons appear after 1500ms delay
  C7: writeFingerPos throttled to 1 write per 500ms per pointer

GROUP D — Card + Voting:
  D1: Card loads from Worker on mount (getRandomCard called)
  D2: Card front tap → flip animation (no back-face mirroring)
  D3: TRUTH → Done button only, no timer
  D4: DARE → timer appears, no Done button until timer complete
  D5: Timer 0: voting panel slides up
  D6: All players vote → majority determines result
  D7: result saved to store.roundResults, card ID to store.usedCardIds
  D8: End Game (after 3 rounds) → saveSession → deleteRoom → navigate /result

GROUP E — Security:
  E1: POST /api/save-session without token → 401
  E2: saveCustomCard text="<script>alert(1)</script>" → sanitized
  E3: roomId="/../../etc" → isValidRoomId returns false → no Firestore call
  E4: deleteCustomCard with wrong uid → Worker rejects (uid check in SQL)
  E5: Response headers: X-Frame-Options: DENY present

Run: git add -A && git commit -m "fix: end-to-end test pass, all issues resolved"
---

---
## PHASE 29 — Monitoring setup + docs + credit guide
## ID4 | Token: LOW
---

PROMPT:
PRD: Free tier limits: Firestore 50k reads/day, Workers 100k req/day, D1 5M reads/month.
Set alerts at 80% of each limit. Monitor Worker error rate.

TASK: Create monitoring docs, alert setup instructions, and credit switching guide.

Create docs/monitoring.md:
  Cloudflare Alerts to configure (provide exact steps):
    1. cloudflare.com Dashboard → Notifications → Create notification
       Type: Workers Error Rate → threshold 1% → email alert
    2. Create notification → Workers requests → 80,000/day → email warning
    3. D1: check Cloudflare Analytics weekly for write count approaching 80k/month
  Firebase Console monitoring:
    1. Firebase Console → project → Usage and billing
    2. Firestore reads: if approaching 40k/day → review game frequency
  Free tier upgrade triggers (when to pay):
    Workers > 80k/day consistently → $5/month Workers Paid plan
    Firestore > 40k reads/day consistently → Firebase Blaze pay-as-you-go

Create docs/credit-switching-guide.md:
  Title: How to Use 4 Gemini Pro Accounts with Antigravity
  Phase allocation:
    Account ID 1: Phases 1-8 (foundation, Firebase, Cloudflare setup)
    Account ID 2: Phases 9-16 (all game screens via Stitch + implementations)
    Account ID 3: Phases 17-24 (deploy, testing, polish)
    Account ID 4: Phases 25-30 (final polish, optimization, launch)
  How to switch:
    1. When "Rate limit reached" appears in Antigravity
    2. Go to Antigravity → Settings → Account → Switch Google account
    3. Select next Gemini Pro account
    4. Reopen the same workspace (your code is local, not tied to account)
    5. Continue with next phase — PRD is embedded in every prompt, no re-explaining needed
    6. If phase was interrupted mid-way: paste the same phase prompt again,
       agent will detect what exists and continue from where it stopped

Create docs/launch-checklist.md: complete checklist of 20 items to verify before sharing.

Run: git add -A && git commit -m "docs: monitoring setup, credit guide, launch checklist"
---

---
## PHASE 30 — Final deploy + launch
## ID4 | Token: LOW
---

PROMPT:
PRD: Production live. Full game flow working. Security headers present.
Free tier budgets well within limits.

TASK: Final production push and launch verification.

STEP 1: Push everything to production:
  git add -A && git commit -m "feat: Choose or Dare v1.0 complete" && git push origin main

STEP 2: Wait for GitHub Actions deploy to complete.
  Check: github.com/YOUR_USERNAME/choose-or-dare → Actions tab → should be green

STEP 3: Verify live site security headers:
  curl -I https://choose-or-dare.pages.dev | grep -E "X-Frame|X-Content|Content-Security"
  → All 3 must appear

STEP 4: Verify D1 card count in production:
  npx wrangler d1 execute choose-or-dare --remote --command="SELECT COUNT(*) FROM cards"
  → Must be 320

STEP 5: Verify Worker is live and responding:
  curl https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/health → OK
  curl https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev/api/leaderboard → JSON

STEP 6: Open live URL on real Android phone (Chrome):
  Complete this full flow on device:
  → Open site → See landing page
  → Sign in with Google → See home dashboard
  → Start New Game → Add 2 players → Select Friendly → Start
  → Place 2 fingers → Countdown → DARE
  → Card flips → Timer → Vote Done → Next round
  → Play 3 rounds → End Game
  → See result screen with leaderboard
  → View History → See the session

If anything fails: describe the issue and fix it.

STEP 7: Set Cloudflare notification alert for Workers > 80k/day (per docs/monitoring.md).

STEP 8: Create final summary:
  Live URL: https://choose-or-dare.pages.dev
  Worker URL: https://choose-or-dare-api.YOUR_SUBDOMAIN.workers.dev
  GitHub: https://github.com/YOUR_USERNAME/choose-or-dare
  D1 cards: 320 seeded
  Status: All 30 phases complete. Version 1.0 live.

git add -A && git commit -m "ops: v1.0 launched, monitoring configured" && git push
---

---
## QUICK REFERENCE CARD

ACCOUNT SWITCHING when rate limited:
  Antigravity → Settings → Switch Account → next Gemini Pro ID
  ID1: Phases 1-8 | ID2: Phases 9-16 | ID3: Phases 17-24 | ID4: Phases 25-30

DEPLOY FLOW:
  Push to main → GitHub Actions builds → Cloudflare Pages deploys (2 min)
  Worker changes → separate workflow deploys Worker automatically

FREE TIER LIMITS:
  CF Pages: unlimited | Firestore: 50k reads/day | Workers: 100k/day | D1: 5M reads/month
  Safe up to: 55 simultaneous game rooms, 220 players at once, 10k games/month

EMERGENCY FIXES:
  Worker error? → cd worker && npx wrangler tail (see live logs)
  D1 missing tables? → npx wrangler d1 execute choose-or-dare --remote --file=migrations/001_initial.sql
  Cards missing? → npx wrangler d1 execute choose-or-dare --remote --file=migrations/002_seed_cards.sql
  Firebase auth broken? → Check Authorized Domains in Firebase Console
  CORS error? → Check ALLOWED_ORIGIN Worker secret matches Pages URL exactly
