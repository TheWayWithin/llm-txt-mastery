# Progress Log - LLM.txt Mastery

## Latest: Sprint 9 — Solo Subscription Migration

**Date**: 2026-03-16
**Status**: Sprint 9 DEPLOYED TO STAGING, testing in progress

### What Happened

1. **Solo tier migrated from coffee credits to recurring subscription** — 27 backend files + 13 frontend files updated
2. **All 'coffee' tier references replaced with 'solo'** — backward compatible with existing DB records (reads handle both)
3. **New route `/api/stripe/create-solo-checkout`** registered (legacy `/create-coffee-checkout` kept as alias)
4. **Dashboard UI overhauled** — "Coffee Credits" → "Monthly Analyses", "0 credits" → "0/20 analyses", coffee icons → blue chart icons
5. **Bug found during testing: new Solo subscribers got 0 credits** — webhook checkout handler set `creditsRemaining: 0` for Solo (was written for Growth/Scale). Fixed to set 20 for Solo.
6. **Bug found: `Coffee is not defined` crash** — removed Coffee icon import but missed a reference in `AuthNav.getTierIcon()`. Fixed.
7. **Billing toggle added to signup page** — Monthly/Annual toggle with "Save 20%" badge, defaults to annual
8. **All pricing pages default to annual view** — landing page, pricing page, signup page
9. **Stripe test mode prices fixed** — Growth was $25 (should be $9.95), Scale was $99 (should be $19.95). Created new prices, archived old ones, updated Railway staging env vars.
10. **Upgrade flow fixed** — subscription-success page now detects authenticated users and auto-redirects to /analyze instead of showing verification email instructions
11. **Infinite refreshUser loop fixed** — subscription-success useEffect was re-triggering on every user state change. Added ref guard.
12. **Dashboard upgrade cards** — added billing toggle (Monthly/Annual), shows annual prices, passes billing preference to Stripe checkout
13. **Status card tier limit fix** — "Today's Usage 0/3" was hardcoded fallback; now shows tier-appropriate limit (Scale=100, Growth=35)

### Bugs Found During Testing

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| New Solo subscribers get 0 analyses | `handleCheckoutCompleted` subscription path sets `creditsRemaining: 0` | Set to 20 for Solo tier |
| `ReferenceError: Coffee is not defined` crash | Removed import but missed reference in `getTierIcon` | Replaced with BarChart3 |
| Stripe Growth shows $25 on checkout | Test mode price ID pointed to old $25 price | Created new $9.95 price, updated env var |
| Stripe Scale shows $99 on checkout | Test mode price ID pointed to old $99 price | Created new $19.95 price, updated env var |
| Upgrade shows "check your email" page | subscription-success page had no auth awareness | Detect authenticated user, redirect to /analyze |
| Infinite API refresh loop | `refreshUser` in useEffect dependency array | Added useRef guard, call once only |
| "Today's Usage 0/3" for Scale tier | Hardcoded fallback `|| 3` in status card | Use tier-appropriate default |
| Dashboard upgrades always monthly | No billing toggle, didn't pass billing to API | Added toggle, pass billing param |

### Issue Discovered: JS Rendering Quality Regression (Sprint 10)

**Severity**: High — Scale tier produces worse output than Solo tier

When "Enhanced JS Rendering" is enabled on a React SPA (llmtxtmastery.com), every page gets the same generic meta description. Root cause: `generateFallbackDescription()` in `openai.ts` returns the generic `<meta name="description">` tag when it's >30 chars, even for SPAs where it's the same for every route. Sprint 10 created to fix this and auto-detect JS rendering need.

---

## Previous: Sprint 1 — CSR Title & Scoring Improvements

**Date**: 2026-02-21
**Status**: ✅ COMPLETE — deployed to production via PR #9

### What Happened

1. **Validator scan of llmtxtmastery.com** revealed our own llms.txt file scored 80/100 with critical issues
2. **Deployed updated llms.txt** — commit `ad5ff71`, merged to main via PR #7
3. **Sprint 1 completed** — title dedup, CSR score boosting, grammar fix
4. **Deployed to production** — PR #9 merged, Railway deploy SUCCESS

---

## Previous: WordPress Framework Detection Fix

**Date**: December 17, 2025
**Status**: ✅ COMPLETE
