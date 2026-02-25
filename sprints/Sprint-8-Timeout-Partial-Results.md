# Sprint 8: Timeout Partial Results & 403 Fast-Fail

## Problem

Analyzing sites like **react.dev** returns **0 pages** despite successfully analyzing 10 of 23 discovered pages. The user sees "Fallback Selection Applied" with 0 pages.

### Root Cause (Two compounding issues)

1. **403 retry waste**: `fetchPageContent()` retries 3 times on HTTP 403 responses (exponential backoff: 2s, 4s delays). Then `processBatchWithCache()` fallback calls `fetchPageContent()` AGAIN (3 more retries). Each blocked page = **6 fetch attempts** with delays. For 13 blocked pages on react.dev, this consumes most of the 8-minute timeout budget.

2. **Timeout discards all results**: `analyzeDiscoveredPagesWithCache()` wraps analysis in `Promise.race` with an 8-minute timeout. When the timeout fires, the catch block returns `pages: []`, **losing all successfully analyzed pages**.

### Impact

- Sites with partial bot protection (some pages return 403) get 0 results
- react.dev: 10/23 pages analyzed successfully (scores 7-9), all discarded by timeout
- User sees misleading "no pages met quality threshold" message

## Fix

### 1. Fast-fail on HTTP 403 in `fetchPageContent`

**File**: `server/services/sitemap.ts`

Added `HTTP 403` to the "don't retry" error list alongside `ENOTFOUND` and `ECONNREFUSED`. A 403 is an explicit access denial - retrying with different user agents won't change the server's authorization decision.

**Time saved per blocked page**: ~6-21 seconds (eliminates retry delays)

### 2. Skip fallback for 403 errors in `processBatchWithCache`

**File**: `server/services/sitemap-enhanced.ts`

When the initial fetch fails with 403, the fallback attempt (line 498+) would just hit 403 again. Now checks if the error contains "403" and skips the fallback entirely.

**Time saved per blocked page**: ~15-45 seconds (eliminates redundant fallback fetch + retries)

### 3. Soft time budget check in batch loop

**File**: `server/services/sitemap-enhanced.ts`

Added a time budget parameter to `performPageAnalysisWithCache()`. Before each batch group, checks if 80% of the time budget has been consumed. If so, stops processing and returns whatever pages have been successfully analyzed.

This is a **soft deadline** that fires before the hard `Promise.race` timeout, allowing the function to:
- Return partial results through the normal code path (dedup, filter, sort)
- Log exactly how many pages were preserved vs remaining
- Avoid the catch block that returns `pages: []`

## Time Budget Math (react.dev example)

**Before fix** (13 blocked pages):
- Per page: 3 retries (2s+4s backoff) + fallback (3 more retries) = ~30-60s
- Total: 13 × ~45s = ~585s > 480s timeout → timeout fires → 0 pages returned

**After fix** (13 blocked pages):
- Per page: 1 attempt, immediate fail on 403, no fallback = ~1-2s
- Total: 13 × ~1.5s = ~20s
- Remaining budget: ~460s for analyzing the 10 accessible pages
- Result: 10 pages returned with scores 7-9

## Files Modified

- `server/services/sitemap.ts` - Added 403 to no-retry error list
- `server/services/sitemap-enhanced.ts` - Added soft time budget check, skip fallback for 403, pass timeout to inner function

## Verification

After deployment:

- [ ] react.dev analysis returns ~10 pages (not 0)
- [ ] No "Fallback Selection Applied" for react.dev
- [ ] Railway logs show `Skipping fallback for [url] - access denied (403)` for blocked pages
- [ ] Railway logs show `Time budget X% used` if soft deadline fires
- [ ] Sites without 403 issues still work normally (no regression)
