# Handoff Notes

## Current State
**Completed**: Sprint 9 (Solo Migration) — merged to main, deployed to production 2026-03-20
**Next Sprint**: Sprint 11 (Cancellation Flow Fix) — HIGH PRIORITY, ready to start
**After That**: Sprint 10 (JS Rendering Quality Fix)
**Last Updated**: 2026-03-20
**Branch**: `main` is up to date with all Sprint 9 changes

---

## What Needs To Be Done Next: Sprint 11 (Cancellation Flow)

**Sprint doc**: `/sprints/Sprint-11-Cancellation-Flow-Fix.md`

### The Problems

1. **"Instant Cancel" button returns 400 error** when subscription was already cancelled via Stripe portal
   - File: `server/services/cancellation.ts` → `processSubscriptionCancellation()` (line 386)
   - It calls `stripe().subscriptions.list({ status: 'active' })` — finds nothing → throws error
   - Fix: handle the "already cancelled" case gracefully

2. **Tier doesn't downgrade after Stripe portal cancel** — webhook `customer.subscription.deleted` should fire `handleSubscriptionCancelled()` in `server/routes/stripe.ts` (line 865) which sets tier to 'starter', but either:
   - Webhook didn't fire (check Stripe webhook logs)
   - UI didn't refresh (cached user data)

3. **Inconsistent UI state** — "No active subscriptions" message appears but tier badge still shows Scale

4. **Downgrading to 'starter' is fundamentally wrong** — there is no real free account:
   - Starter shows on pricing but can't be selected for signup
   - Cancelled users should NOT get unlimited free analyses
   - Need a new state: 'cancelled' or 'inactive'
   - Within 30 days: instant refund + immediate access removal
   - After 30 days: access until end of billing period, then account deactivated

### Key Files for Sprint 11

| File | What to Change |
|------|---------------|
| `server/services/cancellation.ts` | Fix 400 error, implement two cancel paths (refund vs end-of-period) |
| `server/routes/cancellation.ts` | Error handling for already-cancelled subscriptions |
| `server/routes/stripe.ts:865` | `handleSubscriptionCancelled()` — change from 'starter' to 'cancelled' |
| `server/middleware/auth.ts` | Block 'cancelled' users from protected endpoints |
| `client/src/pages/dashboard.tsx` | Billing tab — show correct cancel state, remove confusing dual buttons |
| `client/src/pages/analyze.tsx` | Block cancelled users, show re-subscribe CTA |
| `shared/schema.ts:347` | Consider adding 'cancelled' to UserTier type |

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
- `createOneTimeCheckoutSession` still exists in `server/services/stripe.ts` for backward compat but is no longer called for new Solo signups
- The billing toggle on signup/dashboard/pricing all default to annual
- Stripe product names were updated in both test and live mode to "LLM.txt Mastery - Solo Plan"
