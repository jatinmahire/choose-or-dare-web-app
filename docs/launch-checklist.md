# Launch Checklist — Choose or Dare

Complete this checklist before sharing the app publicly. Check each item by testing on a real mobile device (not just browser dev tools).

**Target:** iOS Safari 16+, Chrome Android 108+

---

## Infrastructure

- [ ] **1. Cloudflare Worker deployed and responding**
  ```bash
  curl https://choose-or-dare.jatinmahire.workers.dev/health
  # Expected: {"status":"ok"}
  ```

- [ ] **2. Cloudflare Pages deployed with latest build**
  - Visit production URL and verify app loads
  - Check no old cached version is served (hard refresh Ctrl+Shift+R)

- [ ] **3. Worker environment variables set in CF dashboard**
  - `FIREBASE_PROJECT_ID` ✓
  - `FIREBASE_CLIENT_EMAIL` ✓
  - `FIREBASE_PRIVATE_KEY` ✓
  - `ALLOWED_ORIGIN` = your production Pages URL ✓

- [ ] **4. D1 database seeded with cards**
  ```bash
  cd worker
  npx wrangler d1 execute choose-or-dare-db --remote --command "SELECT COUNT(*) FROM cards"
  # Expected: count > 0
  ```

- [ ] **5. Firebase Auth → Authorized domains includes your Pages URL**
  - Firebase Console → Authentication → Settings → Authorized domains
  - Add: `choose-or-dare.pages.dev` (and any custom domain)

---

## Authentication

- [ ] **6. Google Sign-In works on iOS Safari**
  - Open app on iPhone → tap Sign in → Google redirect → returns signed in
  - Must NOT show "popup blocked" error (redirect flow already used ✓)

- [ ] **7. Google Sign-In works on Chrome Android**
  - Open app on Android → tap Sign in → completes successfully

- [ ] **8. Sign Out clears session and returns to landing**
  - Settings → Sign Out → lands on `/landing`
  - Back button does NOT go back to a protected page

- [ ] **9. Unauthenticated deep link redirects to landing**
  - Open `/#/home` directly in a private browser window → should redirect to `/#/`

---

## Core Game Flow

- [ ] **10. Full game flow end-to-end (happy path)**
  - Sign in → Home → Setup (3 players, Friendly) → Start Game
  - Finger picker → all 3 fingers down → countdown → winner selected
  - Winner taps TRUTH → card loads → tap to reveal → "Answered" → next round
  - Repeat for DARE → timer runs → voting panel → Submit → next round
  - After 3+ rounds → "End Game" button appears → tap → confirm → Result screen
  - Result screen shows summary → Home button → history shows session

- [ ] **11. Card loads within 3 seconds on 4G**
  - Watch the skeleton loading state — should resolve quickly
  - If card fails: retry button appears ✓

- [ ] **12. Skip card works and loads a different card**
  - Tap SKIP → new card loads (different from previous)
  - Used card IDs passed in `usedIds` param ✓

---

## Mobile UX

- [ ] **13. No horizontal scroll on any screen**
  - Slowly scroll right on every page — nothing should overflow

- [ ] **14. No content hidden behind iOS home indicator**
  - Bottom nav clears the home indicator bar on iPhone
  - Bottom sheet / vote panel has correct `env(safe-area-inset-bottom)` padding

- [ ] **15. Landscape shows rotation prompt (not broken layout)**
  - Rotate device → "Rotate Your Phone" overlay appears
  - Rotate back → overlay hides, app continues

- [ ] **16. App is installable as PWA**
  - Chrome Android: 3-dot menu → "Add to Home screen" → installs
  - iOS Safari: Share → "Add to Home Screen" → installs
  - Installed app shows purple splash screen (not white flash)

---

## Performance

- [ ] **17. First paint < 3 seconds on 4G (cold load)**
  - Open app in Incognito on mobile → measure time to see content
  - Init spinner should appear within 500ms, content within 3s

- [ ] **18. No console errors on any page**
  - Connect phone to Chrome DevTools (chrome://inspect)
  - Navigate through: landing → home → setup → game → card → result → history
  - Zero red errors in console (warnings acceptable)

---

## Security

- [ ] **19. Security headers present on Worker responses**
  ```bash
  curl -I https://choose-or-dare.jatinmahire.workers.dev/health
  # Must include:
  # X-Frame-Options: DENY
  # X-Content-Type-Options: nosniff
  # Referrer-Policy: strict-origin-when-cross-origin
  ```

- [ ] **20. Unauthenticated API calls return 401**
  ```bash
  curl -X POST https://choose-or-dare.jatinmahire.workers.dev/api/save-session \
    -H "Content-Type: application/json" \
    -d '{"test":1}'
  # Expected: {"error":"Unauthorized"} with status 401
  ```

---

## Monitoring Setup

- [ ] Cloudflare email alert: Worker Error Rate > 1% _(see docs/monitoring.md)_
- [ ] Cloudflare email alert: Worker Requests > 80,000/day
- [ ] Weekly calendar reminder to check D1 write volume
- [ ] Weekly calendar reminder to check Firestore read volume

---

## Pre-Share Checklist Summary

```
Infrastructure:  □ Worker health  □ Pages deploy  □ Env vars  □ D1 seeded  □ Auth domains
Auth:            □ iOS sign-in    □ Android sign-in  □ sign-out  □ deep link guard
Game flow:       □ Full E2E       □ Card loads        □ Skip works
Mobile UX:       □ No overflow    □ Safe areas        □ Landscape  □ PWA install
Performance:     □ Cold FCP < 3s  □ Zero console errors
Security:        □ Headers        □ 401 on unauth
Monitoring:      □ CF alert 1     □ CF alert 2        □ Calendar reminders
```

**When all 20 items are checked:** share the link! 🎉

---

## Share Link Template

```
🎮 Choose or Dare — mobile party game
Play it: https://choose-or-dare.pages.dev

Works on any phone. No app install needed.
Sign in with Google → gather your friends → fingers down → someone gets chosen!

Truth or Dare, but actually fun.
```
