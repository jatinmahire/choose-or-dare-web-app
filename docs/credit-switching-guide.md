# How to Use 4 Gemini Pro Accounts with Antigravity

A practical guide for completing large AI-assisted projects across multiple Gemini credit cycles.

---

## Why Multiple Accounts?

Antigravity has a token/credit limit per session. For large builds like Choose or Dare
(30 phases, full-stack PWA), one Gemini Pro credit cycle isn't enough. The solution:
split the phases across 4 accounts, each picking up exactly where the last left off.

**Key insight:** Your code lives on your local machine and GitHub — not in Antigravity.
Switching accounts never loses any work.

---

## Phase Allocation

| Account | Phases | Focus Area | Approx Token Cost |
|---|---|---|---|
| **Account 1** | Phases 1–8 | Foundation: Vite setup, Firebase auth, Cloudflare Worker scaffold, D1 schema, Firestore rules | HIGH |
| **Account 2** | Phases 9–16 | All game screens via Stitch MCP: landing, home, setup, game, card, result, history, stats, leaderboard, settings | HIGH |
| **Account 3** | Phases 17–24 | Deploy pipeline, service worker/offline, UI polish (Stitch review), Worker endpoints, error handling | MEDIUM |
| **Account 4** | Phases 25–30 | Performance optimization, iOS Safari fixes, E2E testing, monitoring docs, launch checklist | LOW-MEDIUM |

---

## How to Switch Accounts

### Step 1 — Recognize When to Switch
You'll see one of these signals:
- Banner: **"Rate limit reached — try again later"**
- Responses become very short or cut off mid-implementation
- Antigravity stops calling tools and only gives text answers
- Error: **"Context window full"** or **"Token limit exceeded"**

### Step 2 — Save Your Progress
Before switching, make sure all work is committed:
```bash
git add -A
git commit -m "wip: phase X in progress"
git push origin master:main
```

### Step 3 — Switch Google Account in Antigravity
1. Open Antigravity
2. Click your **profile avatar** (top-right corner)
3. Click **Settings → Account**
4. Click **Sign out**
5. Sign in with your **next Gemini Pro Google account**

### Step 4 — Reopen the Same Workspace
1. In Antigravity: **Open Workspace** (or File → Open Folder)
2. Navigate to: `D:\My Projects\choose or dare web app`
3. Open the workspace — all your files are there, unchanged

### Step 5 — Continue the Next Phase
Paste the next phase prompt from your PRD. The prompt is self-contained:
```
PHASE [N] — [Title]
PRD: ...
TASK: ...
```

The agent will:
1. Read the existing codebase to understand current state
2. Skip anything already implemented
3. Implement only what's missing

**No re-explaining needed.** The PRD is embedded in every prompt.

---

## If a Phase Was Interrupted Mid-Way

If you switched accounts mid-phase (e.g. phase 14 half done):

1. **Paste the same phase prompt again** on the new account
2. The agent reads existing files first
3. It detects what's already been done (e.g. "file exists, skipping creation")
4. It continues from where it stopped

**Example prompt addition for interrupted phases:**
```
Note: This phase was partially completed. Please audit existing files first
and only implement what's missing. Do not overwrite working code.
```

---

## Workspace Context Recovery

If the new account session seems confused about the codebase, help it orient:

```
This is a mobile party game web app (Choose or Dare).
Stack: Vite + vanilla JS SPA, hash-based router, Firebase Auth (Google),
Firestore (ephemeral rooms), Cloudflare Worker (D1 REST API), CF Pages (hosting).
Entry: src/main.js → router.js → pages/*.js
Worker: worker/src/index.js → routes/*.js
Current state: [describe what's done]
```

---

## Account Usage Tips

### Maximize Each Account's Credits
- **Batch phase prompts:** If a phase is marked `Token: LOW`, you can sometimes
  combine phases 24+25 into one session
- **Skip verbosity:** Add `"Be concise. No explanations unless I ask."` to prompts
- **Avoid re-reads:** If you've already read a file this session, don't ask again

### Preserve Context Across Sessions
The `docs/` folder in this repo serves as persistent memory:
- `docs/monitoring.md` — infrastructure reference
- `docs/launch-checklist.md` — what's done, what's left
- This file — account rotation reference

Point the new agent to these docs:
```
Read docs/launch-checklist.md to understand current project status.
```

---

## GitHub as the Source of Truth

Every completed phase is committed with a detailed message. To review what's been done:

```bash
git log --oneline -20
```

Sample output:
```
b5e16ee fix: end-to-end test pass — Firestore roomId + XSS fix (Phase 28)
9ca2445 fix: iOS Safari compatibility — AudioContext, viewport, focus-visible (Phase 27)
e9f1edc perf: PWA icons, bundle optimization, OG tags (Phase 26)
34e4090 fix: error handling + loading states everywhere (Phase 25)
...
```

Share the git log with the new agent to give it instant context:
```bash
git log --oneline -30 | clip   # copies to clipboard (Windows)
```

---

## Emergency Recovery

**If you lose the PRD/phase list:**
The full prompt for each phase is in the git commit message — check with:
```bash
git log --format="%s%n%b" | head -200
```

**If the codebase is broken:**
```bash
git log --oneline -10  # find last working commit
git checkout <sha> -- src/  # restore just src/ from that commit
```

**If Cloudflare Pages deploy fails:**
```bash
npm run build
npx wrangler pages deploy dist --project-name=choose-or-dare
```

**If the Worker deploy fails:**
```bash
cd worker
npx wrangler deploy
```
