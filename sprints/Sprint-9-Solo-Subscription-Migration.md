# Sprint 9: Solo Tier — Coffee Credits to Recurring Subscription Migration

**Date:** 2026-03-15
**Priority:** High
**Status:** Ready
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

- [ ] Remove "Premium Credits" / "0 credits left" display for Solo subscribers
- [ ] Remove "Another Coffee ($5)" button
- [ ] Remove "Go unlimited" link
- [ ] Show Solo subscription info like Growth/Scale (active subscription, manage billing, cancel)
- [ ] Show "20 analyses this month" with usage counter instead of credits
- [ ] Update `subscription-management.tsx` Solo section — remove coffee purchase buttons

### Phase 2: Usage Tracking (Backend)

- [ ] Solo monthly limit: 20 analyses/month (not credit-based)
- [ ] Monthly reset on billing cycle (same as Growth/Scale)
- [ ] Enforce 200 page limit per analysis for Solo
- [ ] Remove `creditsRemaining` dependency for Solo tier
- [ ] Update `server/services/usage.ts` to handle Solo as subscription tier

### Phase 3: Webhook & Checkout Cleanup

- [ ] Remove `createOneTimeCheckoutSession` usage for Solo (already done — verify)
- [ ] Update `handleCheckoutCompleted` — remove one-time coffee payment branch or gate it
- [ ] Update `handlePaymentSucceeded` — Solo renewal should reset monthly usage, not add credits
- [ ] Remove `productType: 'coffee'` references
- [ ] Verify Solo webhook flow matches Growth/Scale pattern

### Phase 4: Naming Cleanup

- [ ] Rename route `/api/stripe/create-coffee-checkout` to `/api/stripe/create-solo-checkout`
- [ ] Update frontend API calls to use new route name
- [ ] Replace "coffee" references in UI text with "Solo"
- [ ] Update success redirect from `/coffee-success` to `/subscription-success` (partially done)
- [ ] Remove coffee-specific success/cancel pages if they exist

### Phase 5: Testing

- [ ] Test Solo monthly signup → Stripe checkout → webhook → dashboard
- [ ] Test Solo annual signup → same flow
- [ ] Verify 20 analyses/month limit enforced
- [ ] Verify usage resets on renewal
- [ ] Verify upgrade from Solo to Growth works
- [ ] Verify downgrade handling (Growth → Solo)
- [ ] Verify cancellation flow

---

## Files Likely Affected

**Frontend:**
- `client/src/pages/dashboard.tsx` — credit display, coffee buttons
- `client/src/components/subscription-management.tsx` — Solo section
- `client/src/components/usage-display.tsx` — credit vs subscription display
- `client/src/components/tier-limits-display.tsx` — tier feature display
- `client/src/pages/signup.tsx` — Solo checkout flow
- `client/src/lib/stripe.ts` — `createCoffeeCheckoutSession` alias

**Backend:**
- `server/routes/stripe.ts` — checkout route, webhook handlers
- `server/services/stripe.ts` — `TIER_PRICES`, `createOneTimeCheckoutSession`
- `server/services/usage.ts` — usage tracking and limits
- `server/services/auth-storage.ts` — creditsRemaining field

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
