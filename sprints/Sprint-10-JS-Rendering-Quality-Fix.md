# Sprint 10: JS Rendering Auto-Detection & Analysis Quality Fix

**Date:** 2026-03-16
**Priority:** High
**Status:** Ready
**Branch:** `feature/js-rendering-quality-fix`

---

## Problem Statement

Scale tier's "Enhanced JS Rendering" checkbox produces worse output than Solo tier without it. When JS rendering is enabled on llmtxtmastery.com (a React SPA):

- Every page gets the **same generic meta description** instead of unique AI-generated descriptions
- Quality score drops from 9/10 (Solo) to 8/10 (Scale with JS rendering)
- The file is essentially useless — identical verbiage for 12 different pages

Additionally, the user has to manually select "Enhanced JS Rendering" via a checkbox — Scale tier should auto-detect whether a site needs JS rendering and apply it automatically.

## Root Cause Analysis

### Why JS Rendering Produces Worse Output

1. **Meta tag extraction from `<head>` is unchanged by JS rendering** — React SPAs have a single generic `<meta name="description">` in the HTML shell that doesn't change per route
2. **Content is still detected as "thin"** — even after JS rendering, the extracted text sample may not be rich enough
3. **Fallback logic in `generateFallbackDescription()`** (`openai.ts:73-103`) returns the generic meta description if it's >30 chars, even when it's been identified as generic
4. **Filler phrase detection** (`openai.ts:428-432`) sometimes triggers on AI responses, causing good descriptions to be replaced with the generic fallback

### Why Solo Tier Works Better

Solo tier (no JS rendering) goes through the same thin content + generic meta detection, but:
- The AI response doesn't trigger filler phrase detection
- URL-path-based descriptions are kept
- The fallback to generic meta is NOT triggered

### The Checkbox Problem

Users shouldn't have to decide whether their site needs JS rendering. The system already has SPA detection (`spaDetection` in sitemap results) — this should drive the rendering decision automatically.

---

## Goal

1. Scale tier auto-detects if a site needs JS rendering (no checkbox)
2. JS-rendered pages produce equal or better quality descriptions than non-JS
3. Generic meta descriptions are never used as page descriptions for SPAs
4. The rendered DOM body text is used for AI analysis, not just meta tags

---

## Tasks

### Phase 1: Auto-Detection (Remove Checkbox)

- [ ] Remove "Enhanced JS Rendering" checkbox from analyze page UI
- [ ] Scale tier automatically enables JS rendering when SPA/CSR is detected
- [ ] Use existing `spaDetection` from sitemap discovery to drive rendering decision
- [ ] If sitemap discovery finds SSR/SSG content, skip JS rendering (faster, better quality)
- [ ] Log rendering decision in analysis metadata for debugging

### Phase 2: Fix AI Description Quality for JS-Rendered Pages

- [ ] **Fix `generateFallbackDescription()`** (`openai.ts:73-103`): When meta is generic, NEVER return it — force URL-path-based description instead
- [ ] **Fix filler phrase detection** (`openai.ts:428-432`): Don't replace AI descriptions with generic meta fallback
- [ ] **Extract visible body text from rendered DOM** instead of relying on meta tags for content sampling
- [ ] Increase content sample size for JS-rendered pages (rendered DOM has more content)
- [ ] Improve generic meta detection patterns to catch more site-wide descriptions

### Phase 3: Content Extraction Improvements

- [ ] Extract `document.title` from rendered page (may differ from HTML shell `<title>`)
- [ ] Extract visible text from rendered `<main>`, `<article>`, or `<body>` for AI analysis
- [ ] Use heading hierarchy (h1, h2, h3) from rendered DOM as content signals
- [ ] For SPAs, use URL path segments as stronger signal for page identity (existing logic in Sprint 1 title dedup)

### Phase 4: Testing

- [ ] Test llmtxtmastery.com (React SPA) — each page should have unique description
- [ ] Test a SSR site (e.g. WordPress) — should NOT use JS rendering, quality should be unchanged
- [ ] Test a Next.js SSR site — should detect SSR and skip unnecessary JS rendering
- [ ] Compare output quality: Scale tier should be >= Solo tier quality on same site
- [ ] Verify JS render quota is only consumed when rendering actually happens

---

## Files Likely Affected

**Frontend:**
- `client/src/pages/analyze.tsx` — remove JS rendering checkbox, auto-detect logic
- `client/src/components/content-analysis.tsx` — remove JS rendering toggle references

**Backend:**
- `server/services/openai.ts` — fix `generateFallbackDescription()`, fix filler detection, improve content extraction
- `server/services/sitemap-enhanced.ts` — auto-detect JS rendering need from SPA detection
- `server/services/sitemap.ts` — `fetchPageContentEnhanced()` improvements
- `server/services/browserRenderer.ts` — extract visible text + dynamic title from rendered page
- `server/routes.ts` — remove `enhancedRendering` checkbox dependency, use auto-detection

---

## Key Code Locations

| Component | File | Lines | Issue |
|-----------|------|-------|-------|
| Fallback description | `openai.ts` | 73-103 | Returns generic meta when it shouldn't |
| Filler phrase check | `openai.ts` | 428-432 | Replaces good AI descriptions with generic fallback |
| AI analysis core | `openai.ts` | 318-457 | Content sampling and prompt strategy |
| JS rendering decision | `sitemap-enhanced.ts` | 114-118 | Hardcoded to checkbox, should use auto-detect |
| Enhanced fetch | `sitemap.ts` | 1229-1285 | Fetch content via browser or HTTP |
| Browser renderer | `browserRenderer.ts` | 192-280 | Gets DOM but doesn't extract visible text |
| Analyze endpoint | `routes.ts` | 486 | `jsRenderingEnabled = enhancedRendering && tier === 'scale'` |

---

## Out of Scope

- Changing JS render monthly quota (stays at 100/month)
- Adding JS rendering to Growth tier
- Changing pricing or tier limits
- Backward compatibility with existing analyses (they keep current descriptions)

---

## Success Criteria

1. llmtxtmastery.com analyzed with Scale tier produces **unique descriptions per page** (not generic meta)
2. Scale tier output quality >= Solo tier output quality on the same site
3. No "Enhanced JS Rendering" checkbox — auto-detection only
4. SSR/SSG sites are NOT unnecessarily JS-rendered (faster analysis)
5. JS render quota only consumed when auto-detection determines rendering is needed
