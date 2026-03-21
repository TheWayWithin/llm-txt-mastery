# Handoff Notes

## Current State
**Completed**: Sprint 11 Phases 1-3 (Cancellation Flow Fix) — committed on feature/cancellation-flow-fix
**Remaining**: Sprint 11 Phase 4 (Starter tier decision) + Phase 5 (testing) + merge to develop
**Next Sprint**: Sprint 10 (JS Rendering Quality Fix)
**Last Updated**: 2026-03-21
**Branch**: `feature/cancellation-flow-fix` (based on `develop`)

---

## What Was Done: Sprint 11 Phases 1-3

### Commit: `dd9f22d` — 16 files changed, 481 insertions, 372 deletions

**Backend Changes:**
1. Added `'cancelled'` to `UserTier` type in `shared/schema.ts`
2. Added cancelled tier to `TIER_LIMITS` (0 analyses, 0 pages, no features except read-only history)
3. Added cancelled tier to `API_TIER_LIMITS` (0 everything)
4. Auth middleware: cancelled tier at level -1 (blocks all tier-gated endpoints)
5. Rewrote `server/services/cancellation.ts`:
   - Two cancel paths: instant refund (30-day guarantee) vs cancel-at-period-end
   - `processSubscriptionCancellation` handles already-cancelled subscriptions gracefully (no more 400)
   - Sets tier to `'cancelled'` not `'starter'`
   - Returns `subscriptionEndsAt` for cancel-at-period-end flow
6. Updated `server/routes/cancellation.ts`: returns `subscriptionEndsAt`, better error for already-cancelled users
7. Updated `server/routes/stripe.ts`: webhook `handleSubscriptionCancelled` now sets `'cancelled'` tier
8. Updated `server/supabase.ts`: added `'cancelled'` to tier union types

**Frontend Changes:**
1. Updated `client/src/lib/auth-api.ts`: AuthUser tier includes 'cancelled'
2. Updated `client/src/lib/tier-utils.ts`: display name, description, color for cancelled
3. Updated `client/src/lib/validation-utils.ts`: validTiers, features, display names include cancelled
4. Updated `client/src/lib/analytics-utils.ts`: tier value maps include cancelled
5. Updated `client/src/hooks/useFlowStateMachine.ts`: UserTier includes cancelled
6. Updated `client/src/pages/dashboard.tsx`:
   - Cancelled tier icon (XCircle) and color (error red)
   - "Subscription Ended" card in Current Plan section
   - "Subscription Ended" state in Billing section with re-subscribe messaging
   - Replaced "Cancel Subscription (Instant)" button with CancellationButton component using in-app modal
7. Updated `client/src/components/CancellationModal.tsx`:
   - Uses `getApiBaseUrl()` for API calls
   - Shows cancel-at-period-end messaging (not just refund)
   - Shows `subscriptionEndsAt` date on completion
   - Calls `refreshUser()` after cancellation
   - Resets state when modal opens
8. Updated `client/src/pages/analyze.tsx`:
   - Blocks cancelled users with "Subscription Ended" banner and re-subscribe CTA
   - Prevents form submission for cancelled users
9. Updated `client/src/components/subscription-management.tsx`: handles cancelled tier in rawTier

---

## What Still Needs To Be Done

### Sprint 11 Phase 4: Starter Tier Decision (NEEDS USER INPUT)
- **Decision needed**: Keep Starter as limited free trial, or remove entirely?
- If keeping: make it a 7-day trial with clear expiry
- If removing: update pricing page, signup flow, all tier references
- This is a product/business decision — needs owner input

### Sprint 11 Phase 5: Testing
- Deploy to staging (merge feature branch to develop)
- Test all cancellation flows on staging with Stripe test mode
- Test re-subscribe after cancellation
- Verify webhook handling

### Merge Path
1. `feature/cancellation-flow-fix` -> `develop` (staging)
2. Test on staging
3. `develop` -> `main` (production)

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
- **NEW**: `cancelled` tier added — users downgrade to this instead of 'starter' on cancellation
- **NEW**: Cancel-at-period-end flow: subscription still active in Stripe until period ends, then `customer.subscription.deleted` webhook fires and sets tier to 'cancelled'
