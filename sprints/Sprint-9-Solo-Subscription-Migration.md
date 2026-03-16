# Sprint 9: Solo Tier — Coffee Credits to Recurring Subscription Migration

**Date:** 2026-03-15
**Priority:** High
**Status:** IN PROGRESS
**Branch:** `feature/solo-subscription-migration`

---

## Problem Statement

Solo tier was originally a one-time "buy a coffee" model — pay $4.95, get 20 analysis credits, use them up. The entire UI and backend are built around this credit-depletion model.

Solo is now a **recurring monthly subscription** ($4.95/mo), but the codebase still treats it as credit-based. This creates:

- Dashboard shows "0 credits left" + "Another Coffee ($5)" button for active subscribers
- Usage tracking uses credit depletion instead of monthly limits
- Scans work even with 0 credits (no enforcement)
- Webhook handlers have special one-time payment logic for coffee
- "Coffee" naming throughout the codebase

## Goal

Make Solo work exactly like Growth/Scale: a recurring subscription with monthly analysis limits that reset each billing cycle. Remove all coffee/credit legacy code.

---

## Tasks

### Phase 1: Dashboard UI

- [x] Remove "Premium Credits" / "0 credits left" display for Solo subscribers — replaced with "Monthly Analyses"
- [x] Remove "Another Coffee ($5)" button — replaced with "Upgrade to Growth"
- [x] Remove "Go unlimited" link — replaced with "Manage Subscription"
- [x] Show Solo subscription info like Growth/Scale (active subscription, manage billing, cancel)
- [x] Show "20 analyses this month" with usage counter instead of credits
- [x] Update `subscription-management.tsx` Solo section — remove coffee purchase buttons

### Phase 2: Usage Tracking (Backend)

- [x] Solo monthly limit: 20 analyses/month (not credit-based) — already in TIER_LIMITS
- [x] Monthly reset on billing cycle (same as Growth/Scale) — handleSubscriptionRenewal updated
- [x] Enforce 200 page limit per analysis for Solo — already in TIER_LIMITS
- [x] Remove `creditsRemaining` dependency for Solo tier — backward compatible, reads both 'solo'/'coffee'
- [x] Update `server/services/usage.ts` to handle Solo as subscription tier

### Phase 3: Webhook & Checkout Cleanup

- [x] Remove `createOneTimeCheckoutSession` usage for Solo (verified — checkout uses `createCheckoutSession` subscription mode)
- [x] Update `handleCheckoutCompleted` — gated one-time branch for backward compat, new signups go through subscription path
- [x] Update `handlePaymentSucceeded` — Solo renewal resets monthly usage, handles both 'solo' and 'coffee' tiers
- [x] Legacy `productType: 'coffee'` kept for existing one-time credit DB records only
- [x] Solo webhook flow matches Growth/Scale pattern (subscription checkout → handleSubscriptionUpdate)

### Phase 4: Naming Cleanup

- [x] Rename route `/api/stripe/create-coffee-checkout` to `/api/stripe/create-solo-checkout` (both work, old is alias)
- [x] Update frontend API calls to use new route name (dashboard, signup, usage-display, tier-limits, DailyLimitModal)
- [x] Replace "coffee" references in UI text with "Solo"
- [x] Update success redirect from `/coffee-success` to `/subscription-success` (done)
- [x] Keep coffee-success/cancel pages for backward compatibility with bookmarked URLs

### Phase 5: Testing

- [ ] Test Solo monthly signup → Stripe checkout → webhook → dashboard
- [ ] Test Solo annual signup → same flow
- [ ] Verify 20 analyses/month limit enforced
- [ ] Verify usage resets on renewal
- [ ] Verify upgrade from Solo to Growth works
- [ ] Verify downgrade handling (Growth → Solo)
- [ ] Verify cancellation flow

---

## Files Modified

**Frontend (13 files):**
- `client/src/pages/dashboard.tsx` — endpoint updated to create-solo-checkout
- `client/src/pages/signup.tsx` — endpoint updated to create-solo-checkout
- `client/src/components/subscription-management.tsx` — Solo subscription UI, removed coffee purchase buttons
- `client/src/components/usage-display.tsx` — "Monthly Analyses" instead of "Premium Credits", removed coffee CTA
- `client/src/components/tier-limits-display.tsx` — endpoint updated
- `client/src/components/DailyLimitModal.tsx` — endpoint updated
- `client/src/components/content-analysis.tsx` — tier display name handles both solo/coffee
- `client/src/lib/tier-utils.ts` — backward compat (no changes needed, already handles both)
- `client/src/lib/stripe.ts` — already had create-solo-checkout (no changes needed)
- Test files (4 files) — updated tier: 'coffee' → tier: 'solo'

**Backend (14 files):**
- `server/routes/stripe.ts` — dual route registration, webhook tier writes changed to 'solo'
- `server/services/stripe.ts` — no changes needed (createOneTimeCheckoutSession kept for legacy)
- `server/services/usage.ts` — manual override, suggested upgrade, cost caps, renewal handler
- `server/services/cache.ts` — coffee entry marked as legacy alias
- `server/services/cancellation.ts` — handles both 'solo' and 'coffee'
- `server/services/sitemap-enhanced.ts` — filter message
- `server/services/sitemap.ts` — paid tier check includes 'solo'
- `server/services/demo-data.ts` — tier changed to 'solo'
- `server/routes.ts` — all coffee checks updated to solo || coffee
- `server/routes/auth.ts` — demo user, coffee login, admin credit reset
- `server/routes/simple-usage.ts` — tier check, limits map
- `server/routes/cancellation.ts` — refund policy applies_to
- `server/middleware/auth.ts` — tier levels, requireSoloAuth export
- `server/middleware/rateLimiter.ts` — solo tier config, normalization direction reversed
- `server/middleware/enhanced-bot-protection.ts` — rate limit check

---

## Out of Scope

- Migrating existing coffee credit users (they keep credits until used)
- Changing pricing amounts
- Annual billing changes (already working)

---

## Dependencies

- Stripe test mode Solo price is recurring (confirmed: `price_1TB1zqIiC84gpR8HHF8hJ5rF`)
- Stripe live mode Solo price is recurring (confirmed: `price_1S0lZnIiC84gpR8HCqUGxmaD`)
- Solo checkout already switched to subscription mode (done in this session)

## Backward Compatibility Notes

- All backend reads check `tier === 'solo' || tier === 'coffee'` for existing DB records
- Legacy route `/api/stripe/create-coffee-checkout` still works (alias to handler)
- TIER_LIMITS has both 'solo' and 'coffee' entries with identical values
- Coffee-success/cancel pages remain for bookmarked URLs
- `createCoffeeCheckoutSession` export kept as alias in client stripe.ts
