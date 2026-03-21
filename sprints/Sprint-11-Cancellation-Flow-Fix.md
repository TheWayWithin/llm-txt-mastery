# Sprint 11: Cancellation & Refund Flow Overhaul

**Date:** 2026-03-20
**Priority:** High
**Status:** Ready
**Branch:** `feature/cancellation-flow-fix`

---

## Problem Statement

The cancellation flow is broken and the business logic is wrong:

1. **"Instant Cancel" button errors with 400** when subscription was already cancelled via Stripe portal — `processSubscriptionCancellation` looks for active subscriptions but finds none
2. **Stripe portal cancel UX is confusing** — user confirms cancel but lands on a page with only a "Don't Cancel" button and no clear exit
3. **Tier doesn't update after Stripe portal cancellation** — dashboard still shows Scale even after Stripe confirms cancel
4. **"No active subscriptions" but "You're Using Scale Plan"** — inconsistent state after cancellation
5. **Downgrade to "Starter" is wrong** — there is no real free account. Starter shows on pricing but can't be selected. Cancellation shouldn't create a zombie free account.

## Current (Wrong) Behavior

1. User cancels → tier set to 'starter' → user has a free account with 3 analyses/day forever
2. This is not the business model — there should be no free account post-cancellation

## Desired Behavior

### Path 1: Instant Refund (within 30 days of purchase)
- Full money back, no questions asked (30-day guarantee)
- Access removed **immediately**
- Account deactivated (not deleted — preserve for re-subscription)
- User sees: "Refund processed. Your access has ended."

### Path 2: Cancel Subscription (after 30 days, or user opts not to refund)
- Access continues until **end of current billing period**
- At period end: payment stops, account access removed
- User sees: "Your subscription will end on [date]. You'll have full access until then."

### Account After Cancellation
- Account is **deactivated**, not deleted
- User can log in but sees "Your subscription has ended" with option to re-subscribe
- No free tier access — no analyses, no file generation
- Historical analyses remain viewable (read-only)

---

## Tasks

### Phase 1: Fix Immediate Bugs

- [x] Fix "Instant Cancel" 400 error — handle case where Stripe subscription already cancelled
- [x] Fix tier not updating after Stripe portal cancel — webhook now sets 'cancelled' not 'starter'
- [x] Fix inconsistent state — "No active subscriptions" + "Scale Plan" shown simultaneously
- [x] Remove "Cancel Subscription (Instant)" duplicate button — replaced with in-app CancellationModal

### Phase 2: Implement Correct Cancellation Logic

- [x] **Refund path** (within 30 days): instant refund + immediate access revocation
- [x] **Cancel path** (after 30 days): cancel at period end via Stripe `cancel_at_period_end`
- [x] Create "cancelled" account state — added 'cancelled' to UserTier across 16 files
- [x] Add `subscriptionEndsAt` field — returned from API, shown in cancellation modal
- [x] Show message: "Your access ends on [date]" during cancel-at-period-end flow

### Phase 3: Post-Cancellation UX

- [x] Cancelled users can log in but see "Subscription Ended" screen on dashboard
- [x] Show re-subscribe CTA on dashboard and analyze page
- [x] Historical analyses remain viewable (read-only via fileHistory: true in cancelled tier)
- [ ] Remove Starter tier from pricing page (or clearly mark as "Free Trial" with limited scope)
- [x] Block analyze/generate endpoints for cancelled users (tier level -1 in auth middleware)

### Phase 4: Clean Up Starter Tier

- [x] Decide: 7-day free trial at Growth level with credit card required
- [x] Replaced Starter with "Free Trial" on pricing page and landing page
- [x] Signup flow: tier=trial routes through Growth checkout with trial_period_days: 7
- [x] Update cancellation downgrade path to use 'cancelled' instead of 'starter'

### Phase 5: Testing

- [ ] Test refund within 30 days — money back + immediate access loss
- [ ] Test cancel after 30 days — access until period end, then blocked
- [ ] Test re-subscribe after cancellation
- [ ] Test Stripe portal cancel → webhook → tier update
- [ ] Test "Instant Cancel" button when subscription already cancelled (no error)
- [ ] Verify no free analyses available after cancellation

---

## Files Likely Affected

**Backend:**
- `server/services/cancellation.ts` — `processSubscriptionCancellation()`, `requestCancellation()`
- `server/routes/cancellation.ts` — cancel endpoint error handling
- `server/routes/stripe.ts` — `handleSubscriptionCancelled()` webhook
- `server/middleware/auth.ts` — block cancelled users from protected endpoints
- `shared/schema.ts` — possibly add 'cancelled' to UserTier or add subscription status field

**Frontend:**
- `client/src/pages/dashboard.tsx` — billing tab cancellation UI
- `client/src/components/CancellationModal.tsx` — cancellation flow
- `client/src/pages/analyze.tsx` — block cancelled users
- `client/src/components/subscription-management.tsx` — show correct state

---

## Out of Scope

- Migrating existing cancelled users (handle on case-by-case basis)
- Changing refund policy (stays at 30 days)
- Automated win-back emails (future sprint)
- Partial refund calculations for mid-cycle cancellations

---

## Dependencies

- Stripe `cancel_at_period_end` API for graceful cancellation
- Webhook `customer.subscription.updated` with `cancel_at_period_end: true` for tracking
- Webhook `customer.subscription.deleted` for final access revocation
