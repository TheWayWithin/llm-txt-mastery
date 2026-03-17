# Handoff Notes

## Current State
**Active Sprint**: Sprint 9 (Solo Migration) — deployed to staging, tested, ready for production merge
**Next Sprint**: Sprint 10 (JS Rendering Quality Fix) — planned, ready to start
**Last Updated**: 2026-03-16
**Branch**: `develop` (all Sprint 9 changes merged)

---

## Sprint 9: What's Done

Solo tier fully migrated from coffee credits to recurring subscription. All 'coffee' references replaced with 'solo' across 27+ files. Tested on staging with real Stripe test checkouts.

**Key changes:**
- Route: `/api/stripe/create-solo-checkout` (old `/create-coffee-checkout` kept as alias)
- All tier writes → 'solo', all reads handle both 'solo' and 'coffee' for backward compat
- Dashboard shows "Monthly Analyses" / "0/20 analyses" — no more "Coffee Credits" / "0 credits"
- Billing toggle on signup + dashboard + pricing — all default to annual
- Upgrade flow redirects to /analyze (not verification page)
- Stripe test mode prices fixed: Growth $9.95, Scale $19.95

**What remains for Sprint 9:**
- Merge develop → main for production deployment
- Quick smoke test on production after deploy

---

## Sprint 10: JS Rendering Quality Fix (Ready to Start)

**Problem**: Scale tier with JS rendering produces worse output than Solo without it. Every page on a React SPA gets the same generic meta description.

**Root cause**: `generateFallbackDescription()` in `openai.ts:73-103` returns the generic `<meta name="description">` tag (>30 chars) even though it's the same for every SPA route. The AI generates good unique descriptions, but filler phrase detection replaces them with this generic fallback.

**Plan** (Sprint doc: `/sprints/Sprint-10-JS-Rendering-Quality-Fix.md`):
1. Remove "Enhanced JS Rendering" checkbox — auto-detect from SPA detection
2. Fix fallback: never return generic meta for SPAs
3. Extract visible body text from rendered DOM for AI analysis
4. Scale output must be >= Solo quality on same site

**Key files:**
- `server/services/openai.ts` — `generateFallbackDescription()` (line 73), `generateAIAnalysis()` (line 318), filler detection (line 428)
- `server/services/sitemap-enhanced.ts` — JS rendering decision (line 114)
- `server/services/browserRenderer.ts` — DOM text extraction needed
- `client/src/pages/analyze.tsx` — remove checkbox

---

## Environment Notes

- **Staging frontend**: Netlify auto-deploys from `develop`
- **Staging backend**: Railway auto-deploys from `develop` (staging environment)
- **Production**: Both deploy from `main`
- **Stripe test prices** (staging):
  - Solo monthly: `price_1TB1zqIiC84gpR8HHF8hJ5rF`
  - Growth monthly: `price_1TBkXmIiC84gpR8H7tlgInp3` (new, was $25)
  - Scale monthly: `price_1TBlFrIiC84gpR8HGIBEzagu` (new, was $99)

---

## Warnings

- The `coffee` tier still exists in the database for legacy users — all code handles both 'solo' and 'coffee' in reads
- `TIER_LIMITS` in `cache.ts` has both 'solo' and 'coffee' entries (identical values)
- Production Stripe prices are DIFFERENT from test prices — don't mix them up
- The `createOneTimeCheckoutSession` function still exists in `stripe.ts` for backward compat but is no longer called for new Solo signups
