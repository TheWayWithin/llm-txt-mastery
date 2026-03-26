# Sprint 13: Benchmark Completion Polish

**Goal**: Close remaining gaps from the AI Search Arena benchmark improvement brief (LT-1, LT-2, LT-2B completion items) to push llms.txt Excellence score from ~7.0 to 7.5+. All items are frontend + minor backend work, no new infrastructure needed.

**Brief References**: LT-1, LT-2, LT-2B from `docs/Ideation/benchmark-improvement-brief.md`

**Estimated Effort**: 1–2 sessions

---

## Phase 1: Deployment UX Polish (LT-2B)

**Objective**: Make deployment frictionless with copy-to-clipboard and explicit scoring.

### Tasks

- [x] Add copy buttons to deployment code snippets (HTML `<link>` discovery tag, `robots.txt` directive) in `file-generation.tsx` ✅ 2026-03-25
- [x] Show explicit deployment score (X/5) in verification results instead of just per-check pass/fail ✅ 2026-03-25
- [x] Ensure verification checker returns scored result (e.g., "3/5 — Partially deployed") ✅ 2026-03-25

---

## Phase 2: Multi-Format Enhancements (LT-2)

**Objective**: Complete the multi-format experience with bulk download and comparison tools.

### Tasks

- [x] Add zip download button — download all 3 formats (`llms.txt`, `llms-full.txt`, `llms-mini.txt`) as a single `.zip` file ✅ 2026-03-25
- [x] Ensure token counts display on format cards from API `formats` response data ✅ (already implemented Sprint 12)
- [x] Add side-by-side format comparison preview showing what each format includes/excludes ✅ 2026-03-25

---

## Phase 3: Platform-Specific Deployment Guides (LT-2B)

**Objective**: Provide step-by-step deployment instructions for the top 6 website platforms.

### Tasks

- [x] Create platform-specific deployment instructions for top 6 platforms: ✅ 2026-03-25
  - **WordPress** — upload via Media/FTP, `header.php` or Yoast for `<link>` tag, Yoast for `robots.txt`
  - **Shopify** — Settings > Files, `theme.liquid` for `<link>` tag, app/redirect for `robots.txt`
  - **Squarespace** — Custom Files, Code Injection for `<link>` tag, SEO settings for `robots.txt`
  - **Wix** — Site Files, Custom Code for `<link>` tag, robots.txt Editor
  - **Webflow** — Assets panel, Custom Code for `<link>` tag, SEO for `robots.txt`
  - **Next.js** — `/public/llms.txt`, `_document.tsx` or `layout` for `<link>` tag, `/public/robots.txt`
- [x] Auto-detect platform from analysis SPA detection and show relevant guide first ✅ (already implemented Sprint 7)
- [x] Each guide has step-by-step numbered instructions with copy buttons for code snippets ✅ 2026-03-25

---

## Phase 4: Validator Quick Fix (LT-1)

**Objective**: Let users auto-correct common formatting issues directly from validator results.

### Tasks

- [x] Add "Quick Fix" button on validator results that auto-corrects formatting issues ✅ 2026-03-25
- [x] Quick fix should handle: missing H1 title, missing blockquote description, malformed list items ✅ 2026-03-25
- [x] Show before/after preview of fixes ✅ 2026-03-25
- [x] Download corrected file or copy to clipboard ✅ 2026-03-25

---

## Phase 5: Verification & Marketing

**Objective**: Ensure all new features are tested and documented.

### Tasks

- [ ] Playwright test plan for all new features (copy buttons, zip download, platform guides, quick fix)
- [x] Update `docs.tsx` with any new feature documentation ✅ 2026-03-25
- [x] Update `pricing.tsx` if any new tier-differentiating features added ✅ 2026-03-25

---

## Acceptance Criteria

- [x] All deployment snippets have one-click copy buttons ✅
- [x] Verification shows explicit X/5 deployment score ✅
- [x] Zip download works for all 3 formats ✅
- [x] Platform guides cover top 6 platforms with copy-paste code ✅
- [x] Quick fix handles common formatting issues with before/after preview ✅
- [ ] All changes pass Playwright verification

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js (minor endpoint additions for zip/scoring)
- **Infrastructure**: No new services — uses existing Netlify + Railway
- **Libraries**: JSZip (for zip download), existing clipboard API

## Benchmark Impact

| Metric | Before | Target |
|--------|--------|--------|
| llms.txt Excellence | ~7.0 | 7.5+ |
| Deployment UX friction | Manual copy | One-click |
| Format accessibility | Individual downloads | Zip bundle |
| Platform coverage | Generic instructions | 6 platform-specific guides |
