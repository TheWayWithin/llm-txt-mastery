# Handoff Notes

## Current State
**Completed**: Sprint 11 (Cancellation Flow + 7-Day Free Trial) — merged to `develop`
**Status**: Deploying to staging for testing
**Next**: Test on staging, then merge `develop` → `main` for production
**After That**: Sprint 10 (JS Rendering Quality Fix)
**Last Updated**: 2026-03-21
**Branch**: `develop` (Sprint 11 merged)

---

## What To Test on Staging

### Cancellation Flows
1. **Cancel within 30 days** — should get instant refund, tier immediately set to `cancelled`
2. **Cancel after 30 days** — should set `cancel_at_period_end`, user keeps access until period ends
3. **Cancel already-cancelled subscription** — should show friendly "already cancelled" message (no 400 error)
4. **Stripe portal cancel** → webhook should set tier to `cancelled` (not `starter`)
5. **Cancelled user tries to analyze** — should see "Subscription Ended" banner, form blocked
6. **Cancelled user dashboard** — should see red "Subscription Ended" state, re-subscribe CTA
7. **Re-subscribe after cancellation** — pick a plan, go through checkout, tier should update

### Free Trial Flow
8. **Sign up via "Free Trial"** on pricing page → should go to `/signup?tier=trial`
9. **Stripe checkout** — should show $0.00 due today, card required, "7-day free trial" messaging
10. **After checkout** — user should have Growth tier (35 analyses, 500 pages)
11. **Check Stripe dashboard** — subscription should show `trialing` status with 7-day trial

### Staging URLs
- Frontend: https://develop--llm-txt-mastery.netlify.app
- Backend: https://llm-txt-mastery-staging.up.railway.app

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Any future expiry, any CVC

---

## What Was Built: Sprint 11

### Commit 1: Cancellation Flow Overhaul (16 files)
- `'cancelled'` tier with zero access across entire stack
- Two cancel paths: instant refund (30-day guarantee) vs cancel-at-period-end
- Fixed 400 error on already-cancelled subscriptions
- Webhook sets `'cancelled'` not `'starter'`
- Dashboard + analyze page block cancelled users with re-subscribe CTA
- In-app CancellationModal replaces confusing Stripe portal button

### Commit 2: 7-Day Free Trial (6 files)
- Starter replaced with "Free Trial" on pricing + landing page
- Credit card required, 7 days free, then $9.95/mo (Growth)
- Stripe `trial_period_days: 7` on subscription
- Signup page handles `tier=trial` → Growth checkout with trial flag

---

## Sprint 10 (JS Rendering Quality) — After Sprint 11

**Sprint doc**: `/sprints/Sprint-10-JS-Rendering-Quality-Fix.md`

**Problem**: Scale tier with "Enhanced JS Rendering" checkbox produces worse output than Solo without it. Every page on a React SPA gets the same generic meta description instead of unique AI descriptions.

**Root cause**: `generateFallbackDescription()` in `server/services/openai.ts:73-103` returns the generic `<meta name="description">` tag (>30 chars) for every SPA route.

**Key changes needed**:
- Remove checkbox, auto-detect from SPA detection
- Fix fallback: never return generic meta for SPAs
- Extract visible body text from rendered DOM
- Key files: `openai.ts`, `sitemap-enhanced.ts`, `browserRenderer.ts`, `analyze.tsx`

---

## Environment Reference

| Environment | Frontend | Backend | Deploys From |
|-------------|----------|---------|-------------|
| Production | https://llmtxtmastery.com | https://llm-txt-mastery-production.up.railway.app | `main` |
| Staging | https://develop--llm-txt-mastery.netlify.app | https://llm-txt-mastery-staging.up.railway.app | `develop` |

**Stripe test mode prices** (staging only):
- Solo monthly: `price_1TB1zqIiC84gpR8HHF8hJ5rF`
- Growth monthly: `price_1TBkXmIiC84gpR8H7tlgInp3`
- Scale monthly: `price_1TBlFrIiC84gpR8HGIBEzagu`

---

## Important Context

- The `coffee` tier still exists in the database for legacy users — all code handles both 'solo' and 'coffee' in reads
- `TIER_LIMITS` in `server/services/cache.ts` has both 'solo' and 'coffee' entries (identical values)
- Production Stripe prices are DIFFERENT from test prices — don't mix them up
- The billing toggle on signup/dashboard/pricing all default to annual
- **`cancelled` tier** — users downgrade to this instead of 'starter' on cancellation (level -1 in auth middleware)
- **Cancel-at-period-end** — subscription stays active in Stripe until period ends, then `customer.subscription.deleted` webhook fires and sets tier to 'cancelled'
- **7-day free trial** — uses Growth checkout with `trial_period_days: 7`, card collected upfront, $9.95/mo after trial
- **Starter tier still exists** in code as safety net for legacy/direct URL access, but removed from all pricing UI
