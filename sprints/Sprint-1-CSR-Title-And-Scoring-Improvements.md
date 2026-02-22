# Sprint 1: CSR Title Differentiation & Page Scoring Improvements

**Sprint Start**: 2026-02-21
**Priority**: HIGH - Affects every CSR/SPA site (React, Vue, Angular)
**Branch**: `feature/sprint-1-csr-improvements`
**Status**: PLANNED

---

## Problem Statement

When our product (llmtxtmastery.com) generates an llms.txt file for a client-side rendered (CSR) site, the output quality is poor:

1. **All pages show identical titles** because the HTML shell returns the same `<title>` tag for every route
2. **High-value pages (About, Docs, Blog) are excluded** or marked "lower relevance" because the quality scoring can't differentiate CSR pages

This was discovered by running our own validator against llmtxtmastery.com -- our product gave our own site a bad file.

### Evidence

Our own generated llms.txt for llmtxtmastery.com:
- 5 pages all titled "LLM.txt Mastery - AI-Ready Website Content Generator"
- `/about`, `/docs`, `/blog` marked "Excluded from main listing (lower relevance)"
- `/pricing` was the only included Resource (wrong choice)
- 11 pages found, only 4 analyzed, only 1 included

---

## Task 1: Differentiate Identical Titles on CSR Sites

### Problem
`server/services/openai.ts:97` extracts `<title>` from HTML. On CSR sites, every page returns the same shell `<title>`. The output becomes:
```
- [LLM.txt Mastery](https://example.com/about): ...
- [LLM.txt Mastery](https://example.com/docs): ...
- [LLM.txt Mastery](https://example.com/blog): ...
```
This is useless for AI models trying to understand site structure.

### Solution
Add a **title deduplication step** in the output formatting phase. When multiple pages share an identical title, generate differentiated titles from URL path segments.

### Files to Modify

**`server/routes.ts`** - Add new function after `enhancePageDescriptions` (line ~1693):

```typescript
/**
 * Detects and differentiates identical page titles using URL path context.
 * Critical for CSR/SPA sites where every page returns the same <title> tag.
 */
function differentiateIdenticalTitles(pages: SelectedPage[]): SelectedPage[] {
  // Group pages by title
  const titleGroups = new Map<string, SelectedPage[]>();
  pages.forEach(page => {
    const title = page.title?.trim() || '';
    if (!titleGroups.has(title)) titleGroups.set(title, []);
    titleGroups.get(title)!.push(page);
  });

  // Only process groups where 2+ pages share the same title
  const enhanced = pages.map(page => ({ ...page }));

  titleGroups.forEach((group, sharedTitle) => {
    if (group.length < 2) return; // Unique titles are fine

    group.forEach(page => {
      const idx = enhanced.findIndex(p => p.url === page.url);
      if (idx === -1) return;

      // Extract meaningful segment from URL path
      const pathSegment = extractTitleFromUrl(page.url);

      if (pathSegment && pathSegment.toLowerCase() !== sharedTitle.toLowerCase()) {
        // Format: "Path Segment - Original Title" or just "Path Segment" if title is generic
        enhanced[idx].title = `${pathSegment} - ${sharedTitle}`;
      }
    });
  });

  return enhanced;
}

/**
 * Extracts a human-readable title from a URL path segment.
 * e.g., "/about" -> "About", "/docs/getting-started" -> "Getting Started"
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(s => s.length > 0);
    if (segments.length === 0) return 'Home';

    // Use the last meaningful segment
    const lastSegment = segments[segments.length - 1];

    // Convert slug to title case: "getting-started" -> "Getting Started"
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return '';
  }
}
```

**`server/routes.ts`** - Call the new function in `generateLlmTxtContent` (line ~2500):

```typescript
// Phase 6: Apply content quality improvements before clustering
const enhancedPages = enhancePageDescriptions(selectedPages);

// Phase 7: Differentiate identical titles (critical for CSR/SPA sites)
const titleFixedPages = differentiateIdenticalTitles(enhancedPages);
```

Also apply to excluded pages in the Optional section (line ~2587):
```typescript
// Differentiate excluded page titles too
const titleFixedExcluded = differentiateIdenticalTitles(excludedPages);
```

### Expected Output After Fix
```
- [Pricing - LLM.txt Mastery](https://llmtxtmastery.com/pricing): ...
- [About - LLM.txt Mastery](https://llmtxtmastery.com/about): ...
- [Docs - LLM.txt Mastery](https://llmtxtmastery.com/docs): ...
- [Blog - LLM.txt Mastery](https://llmtxtmastery.com/blog): ...
```

### Acceptance Criteria
- [ ] Pages with identical titles get differentiated using URL path
- [ ] Homepage gets "Home - {Title}" treatment
- [ ] Pages with unique titles are NOT modified
- [ ] Both selected and excluded pages get title differentiation
- [ ] Build passes (`npm run build`)

---

## Task 2: Boost High-Value Paths for CSR Sites

### Problem
The auto-selection logic in `client/src/components/content-review.tsx:75` selects pages with `qualityScore >= 5`. On CSR sites, all pages get similar low scores because the crawler can't see real content -- just the React shell.

The scoring in `server/services/openai.ts:97-114` relies on HTML content (word count, headings, paragraphs). CSR pages have minimal HTML content, so they all score similarly low.

The Information Architecture scoring in `server/routes.ts:1498-1579` does check URL patterns (e.g., `/blog` gets Score 60), but this only affects **ordering**, not **selection**. Pages still need `qualityScore >= 5` to be auto-selected.

### Solution
Two-part fix:

#### Part A: CSR-Aware Quality Score Boosting

When a site is detected as CSR (we already have this detection), boost quality scores for known high-value URL patterns.

**`server/services/openai.ts`** - Add CSR boost after base scoring (around line 170):

```typescript
/**
 * Boosts quality scores for high-value URL patterns on CSR sites
 * where content analysis is unreliable.
 */
function applyCSRQualityBoost(url: string, baseScore: number, isCSR: boolean): number {
  if (!isCSR) return baseScore;

  const urlLower = url.toLowerCase();
  const highValuePaths = [
    { pattern: /^\/$/, boost: 3 },           // Homepage
    { pattern: /\/about/, boost: 2 },         // About page
    { pattern: /\/docs/, boost: 2 },          // Documentation
    { pattern: /\/blog/, boost: 2 },          // Blog
    { pattern: /\/features/, boost: 2 },      // Features
    { pattern: /\/pricing/, boost: 1 },       // Pricing
    { pattern: /\/contact/, boost: 1 },       // Contact
    { pattern: /\/faq/, boost: 1 },           // FAQ
    { pattern: /\/getting-started/, boost: 2 }, // Getting started
    { pattern: /\/guides/, boost: 2 },        // Guides
  ];

  let boost = 0;
  const pathname = new URL(url).pathname;

  for (const { pattern, boost: pathBoost } of highValuePaths) {
    if (pattern.test(pathname)) {
      boost = Math.max(boost, pathBoost);
    }
  }

  // Also boost shallow pages (depth 1) - they're usually important
  const depth = pathname.split('/').filter(s => s.length > 0).length;
  if (depth <= 1) boost = Math.max(boost, 1);

  return Math.min(baseScore + boost, 10);
}
```

#### Part B: Pass CSR Detection to Analysis

The SPA detection result needs to flow into the page analysis pipeline so the quality boost can be applied.

**`server/services/sitemap-enhanced.ts`** - Pass `isCSR` flag to analysis functions.

**`server/services/openai.ts`** - Accept and use `isCSR` parameter in `generateHTMLAnalysis`.

### Expected Behavior After Fix

For a CSR React site like llmtxtmastery.com:
- Homepage (`/`): score boosted from ~4 to ~7 (auto-selected)
- About (`/about`): score boosted from ~3 to ~5 (auto-selected)
- Docs (`/docs`): score boosted from ~3 to ~5 (auto-selected)
- Blog (`/blog`): score boosted from ~3 to ~5 (auto-selected)
- Pricing (`/pricing`): score boosted from ~4 to ~5 (auto-selected)

All five pages now appear in Resources, not Optional.

### Acceptance Criteria
- [ ] CSR detection result is passed through the analysis pipeline
- [ ] High-value URL patterns get quality score boost on CSR sites
- [ ] Non-CSR sites are NOT affected (boost only applies when CSR detected)
- [ ] Auto-selection threshold (>= 5) now captures standard pages on CSR sites
- [ ] Build passes (`npm run build`)

---

## Testing Plan

### Manual Testing
1. Run analysis on llmtxtmastery.com (our own site) -- verify all 5 pages appear in Resources with differentiated titles
2. Run analysis on a known SSR site (e.g., nextjs.org) -- verify no changes to existing behavior
3. Run analysis on another CSR site (e.g., a Create React App site) -- verify improvements

### Automated Testing
- [ ] Unit test for `differentiateIdenticalTitles()` with identical and unique title inputs
- [ ] Unit test for `extractTitleFromUrl()` with various URL patterns
- [ ] Unit test for `applyCSRQualityBoost()` with CSR and non-CSR flags
- [ ] Integration test: full analysis of CSR site produces differentiated titles

---

## Deployment Plan

1. Create `feature/sprint-1-csr-improvements` branch from `develop`
2. Implement Task 1 (title differentiation)
3. Implement Task 2 (CSR quality boosting)
4. Build and test locally
5. Push to `develop` (auto-deploys to staging)
6. Test on staging with real CSR sites
7. PR to `main` (production)

---

## Task 3: Fix Plural Grammar ("1 pages")

### Problem
Two places output "X pages" without handling singular:
- **Line 1939**: `"featuring ${pageCount} pages"` in site description (blockquote)
- **Line 2575**: `"${totalFound} pages found, ${analyzed} analyzed, ${enhancedPages.length} included"` in metadata

Both produce "1 pages" when count is 1.

### Solution
Simple conditional pluralization at both locations.

### Files to Modify

**`server/routes.ts:1939`**:
```typescript
// Before:
let summary = `${domain} is a comprehensive website featuring ${pageCount} pages`;
// After:
let summary = `${domain} is a comprehensive website featuring ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
```

**`server/routes.ts:2575`**:
```typescript
// Before:
metadataBlock += `${totalFound} pages found, ${analyzed} analyzed, ${enhancedPages.length} included. `;
// After:
const pf = totalFound === 1 ? 'page' : 'pages';
const pa = analyzed === 1 ? 'page' : 'pages';
const pi = enhancedPages.length === 1 ? 'page' : 'pages';
metadataBlock += `${totalFound} ${pf} found, ${analyzed} ${pa} analyzed, ${enhancedPages.length} ${pi} included. `;
```

### Acceptance Criteria
- [ ] "1 page found" (not "1 pages found")
- [ ] "featuring 1 page" (not "featuring 1 pages")
- [ ] Plural still works correctly for counts > 1
- [ ] Build passes (`npm run build`)
