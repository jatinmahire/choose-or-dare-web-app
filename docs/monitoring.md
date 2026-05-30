# Monitoring & Alerting Guide

Choose or Dare — Free Tier Limits + Alert Setup

---

## Free Tier Budget Summary

| Service | Free Limit | Alert Threshold (80%) | Action if Exceeded |
|---|---|---|---|
| Cloudflare Workers | 100,000 req/day | 80,000 req/day | Upgrade to $5/mo Workers Paid |
| Cloudflare D1 | 5,000,000 reads/month | 4,000,000 reads/month | Enable D1 paid ($0.001/100k reads) |
| Cloudflare D1 writes | 100,000 writes/day | 80,000 writes/day | Monitor weekly |
| Firebase Firestore reads | 50,000 reads/day | 40,000 reads/day | Switch to Firebase Blaze |
| Firebase Firestore writes | 20,000 writes/day | 16,000 writes/day | Monitor game session frequency |
| Firebase Auth | Unlimited (Spark) | N/A | No action needed |
| Cloudflare Pages | Unlimited requests | N/A | No action needed |

---

## Cloudflare Alerts (Exact Steps)

### Alert 1 — Worker Error Rate > 1%

Catches crashes, 500s, unhandled exceptions before users notice.

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Click **Notifications** in the left sidebar
3. Click **Create notification**
4. Select type: **Workers → Error Rate**
5. Set threshold: **1%** (any 1-minute window)
6. Notification method: **Email** → enter your address
7. Filter to your Worker: `choose-or-dare` (select from dropdown)
8. Name: `CoD Worker Error Rate Alert`
9. Click **Save**

> **Why 1%:** At 100k req/day, 1% = 1,000 errors. Even 0.5% is worth investigating.

---

### Alert 2 — Worker Requests > 80,000/day

Warns before hitting the 100k/day free limit.

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Click **Notifications** → **Create notification**
3. Select type: **Workers → Total Requests**
4. Set threshold: **80,000 requests per day**
5. Notification method: **Email**
6. Worker: `choose-or-dare`
7. Name: `CoD Worker Request Limit Warning`
8. Click **Save**

> **Note:** If this alert fires, check if any route is being abused. The IP rate limiter (50 req/min) in `worker/src/index.js` should contain bursts.

---

### Alert 3 — D1 Write Volume (Manual Weekly Check)

D1 doesn't have native alert webhooks yet. Check manually:

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Navigate to **Storage & Databases → D1**
3. Select database: `choose-or-dare-db`
4. Click **Metrics** tab
5. Check **Writes per day** over the last 7 days
6. **Alert yourself if** writes consistently exceed 80,000/day

> **Tip:** Set a Google Calendar weekly reminder every Sunday to check D1 metrics.

---

### Checking Cloudflare Analytics

**Worker request breakdown:**
```
dash.cloudflare.com → Workers & Pages → choose-or-dare (Worker) → Analytics
```

Key metrics to watch:
- **Requests** — total volume
- **Errors** — count + rate (target < 0.1%)
- **CPU time** — target < 10ms p99 (free tier limit: 10ms CPU/request)
- **Subrequests** — D1 queries per request

---

## Firebase Console Monitoring

### Firestore Usage Check

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
2. Select your project (e.g. `choose-or-dare`)
3. Navigate to **Build → Firestore Database**
4. Click the **Usage** tab
5. Check **Reads**, **Writes**, **Deletes** — compare to daily limits

**Baseline expectations for this app:**
- Each game session = ~5–20 Firestore writes (room create + finger positions + votes + delete)
- Each game session = ~10–50 Firestore reads (room listen + votes listen)
- **100 daily active games** ≈ 5,000 reads/day — safely within 50k limit

### Firebase Budget Alert (for Blaze plan, if upgraded)

1. **Firebase Console → Project settings → Usage and billing**
2. Click **Modify plan** if still on Spark
3. On Blaze plan: **Google Cloud Console → Billing → Budgets & alerts**
4. Create budget: **$1/month** → alert at 50% ($0.50) and 100% ($1.00)
5. This catches unexpected cost spikes before they compound

---

## Free Tier Upgrade Decision Guide

### Upgrade Workers ($5/month Workers Paid)
**When:** Workers requests consistently > 80,000/day for 3+ consecutive days

**What you get:**
- 10,000,000 requests/month (vs 100k/day)
- 30ms CPU time (vs 10ms)
- No cold starts
- Workers KV included

**How to upgrade:**
1. dash.cloudflare.com → Workers & Pages → Plans
2. Select **Workers Paid** ($5/month)
3. No code changes required — same deployment

---

### Upgrade Firebase (Blaze pay-as-you-go)
**When:** Firestore reads consistently > 40,000/day

**What you get:**
- Pay only for what you use above free limits
- Firestore: $0.06/100k reads above 50k/day
- At 100k reads/day → ~$3/month extra
- Cloud Functions (not currently used)

**How to upgrade:**
1. Firebase Console → Project settings → Usage and billing
2. Click **Upgrade to Blaze**
3. Link a billing account
4. Set a budget alert at $5/month

---

## Worker Rate Limiter Reference

The Worker has a built-in in-memory rate limiter (`worker/src/index.js`):

| Key | Limit | Window |
|---|---|---|
| `ip:<ip>` | 50 req | 1 minute |
| `save:<uid>` | 10 saves | 1 hour |
| `read:<uid>` | 200 reads | 1 hour |
| `clear:<uid>` | 5 clears | 1 hour |

> **Note:** In-memory means per-Worker-instance. Under high traffic Cloudflare spins up multiple instances — a distributed rate limiter (Workers KV or Durable Objects) would be needed for strict enforcement at scale. At free tier volumes this is sufficient.

---

## Log Monitoring (Cloudflare Workers Tail)

To stream live Worker logs during testing:

```bash
npx wrangler tail choose-or-dare --format=pretty
```

Useful filters:
```bash
# Show only errors
npx wrangler tail choose-or-dare --status=error

# Show specific route
npx wrangler tail choose-or-dare --search="/api/save-session"
```

---

## Recommended Monitoring Schedule

| Frequency | Action |
|---|---|
| Daily (automatic) | Cloudflare email alert if errors > 1% or requests > 80k |
| Weekly (manual) | Check D1 write volume in CF dashboard |
| Weekly (manual) | Check Firestore reads in Firebase Console |
| Monthly | Review overall costs (Cloudflare + Firebase billing) |
| On alert | Run `npx wrangler tail` to investigate live errors |
