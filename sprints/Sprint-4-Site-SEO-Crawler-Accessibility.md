# Sprint 4: Site SEO & Crawler Accessibility

**Sprint Start**: 2026-02-22
**Priority**: HIGH - Our own site is a poor showcase of our product
**Branch**: `feature/sprint-4-site-seo-crawler-accessibility`
**Status**: PLANNED

---

## Problem Statement

llmtxtmastery.com is a React SPA (Vite + React 18) with **client-side rendering only**. When crawlers (Google, ChatGPT, our own tool) fetch any page, they receive a near-empty HTML shell. This means:

1. Our own product generates poor llms.txt for our own site
2. Search engines may not index page-specific content
3. AI systems can't read our pages without JS execution

Additionally, 62% of pages lack page-specific SEO metadata, the sitemap is incomplete, and the deployed llms.txt is severely outdated.

### Evidence

**What crawlers see on any page** (the HTML shell):
- Generic `<title>` and `<meta description>` from `client/index.html`
- Empty `<div id="root"></div>`
- No page-specific content until JavaScript executes

**SEO coverage gaps:**
- 15 of 24 pages have NO page-specific title/description
- Critical feature pages `/analyze` and `/validate` use generic site-wide meta
- Sitemap missing `/validator` page entirely

---

## Scope

### Task 1: Add `useSEO()` to all public pages

**Why**: 9 pages already use `useSEO()` but 15 don't. While this only helps JS-capable crawlers, it's a quick win.

**File**: `client/src/hooks/useSEO.ts` (already exists, lines 1-47)
**Pattern**: Each page calls `useSEO({ title, description })` which updates `document.title`, meta description, og:title, og:description.

**Pages that already have it (9):**
- `/` (home.tsx, line 71-74)
- `/pricing` (pricing.tsx, line 10-13)
- `/about` (about.tsx, line 8-11)
- `/docs` (docs.tsx)
- `/contact` (contact.tsx)
- `/blog` (blog.tsx)
- `/dashboard` (dashboard.tsx)
- `/validator` (validator.tsx, line 170)
- `/analysis/:id` (analysis-detail.tsx)

**Pages that need it added (public-facing only):**

| Page | File | Title | Description |
|------|------|-------|-------------|
| `/analyze` | `client/src/pages/analyze.tsx` | "Analyze Your Website - LLM.txt Mastery" | "Analyze your website's AI readiness. Discover all pages, assess content quality, and generate an optimized llms.txt file." |
| `/validate` | `client/src/pages/validate.tsx` | "Validate Your llms.txt - LLM.txt Mastery" | "Check your llms.txt file against the official specification. Get actionable feedback to improve AI discoverability." |
| `/terms` | `client/src/pages/terms.tsx` | "Terms of Service - LLM.txt Mastery" | "Terms of service for LLM.txt Mastery." |
| `/privacy` | `client/src/pages/privacy.tsx` | "Privacy Policy - LLM.txt Mastery" | "Privacy policy for LLM.txt Mastery." |
| `/cookies` | `client/src/pages/cookies.tsx` | "Cookie Policy - LLM.txt Mastery" | "Cookie policy for LLM.txt Mastery." |
| `/login` | `client/src/pages/login.tsx` | "Log In - LLM.txt Mastery" | "Log in to your LLM.txt Mastery account." |
| `/signup` | `client/src/pages/signup.tsx` | "Sign Up - LLM.txt Mastery" | "Create your free LLM.txt Mastery account." |

Skip transient pages (`/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/coffee-success`, `/subscription-success`, `/subscription-cancel`) -- crawlers won't index these.

**Implementation**: Add `useSEO({ title: "...", description: "..." })` call at top of each component, matching the pattern in `home.tsx`.

---

### Task 2: Update sitemap.xml

**File**: `client/public/sitemap.xml` (83 lines)

**Current issues:**
- Missing `/validator` page (feature page, should be priority 0.9)
- All `<lastmod>` dates are `2025-10-24` (stale)
- Missing `/privacy-policy` alias (defined in App.tsx line 48)

**Changes:**
1. Add `/validator` entry with priority 0.9, changefreq weekly
2. Update all `<lastmod>` dates to current date
3. No need to add `/privacy-policy` alias (redirects to `/privacy`)

---

### Task 3: Update the deployed llms.txt

**File**: `client/public/llms.txt` (18 lines)

**Current state**: Only lists `/pricing` as a resource. Severely outdated.

**Action**: Replace with the latest generated output from the tool (the file at `docs/Ideation/llms.txt` is newer but still imperfect). Ideally regenerate after Sprint 5 program fixes are deployed, then copy the output here.

**Interim fix**: Manually write a proper llms.txt that accurately represents the site:

```markdown
# LLM.txt Mastery

> LLM.txt Mastery is an AI-powered tool that analyzes websites and generates optimized llms.txt files following the llmstxt.org specification. It discovers pages via sitemap crawling, scores content quality with AI, and produces structured files that help LLMs understand your site.

## Resources

- [Analyze Your Website](https://llmtxtmastery.com/analyze): Enter any URL to analyze your website's pages, assess AI readiness, and generate a structured llms.txt file.
- [Validate Your llms.txt](https://llmtxtmastery.com/validate): Check an existing llms.txt file against the official specification and get actionable improvement suggestions.
- [Pricing](https://llmtxtmastery.com/pricing): Free tier with 20 pages per analysis. Paid tiers (Coffee/Growth/Scale) unlock more pages, AI-enhanced descriptions, and advanced features.
- [Documentation](https://llmtxtmastery.com/docs): Guides on the llms.txt format, how to implement it, and best practices for AI visibility.
- [Blog](https://llmtxtmastery.com/blog): Articles about AI readiness, llms.txt adoption, and making your website discoverable by LLMs.
- [About](https://llmtxtmastery.com/about): Mission, team, and the story behind LLM.txt Mastery.

## Optional

- [llms.txt Specification](https://llmstxt.org/): Official llmstxt.org format specification
- [Terms of Service](https://llmtxtmastery.com/terms): Legal terms for using LLM.txt Mastery
- [Privacy Policy](https://llmtxtmastery.com/privacy): How we handle your data
```

---

### Task 4: Add static meta tags for CSR fallback

**File**: `client/index.html` (lines 28-61)

**Why**: The `useSEO()` hook only works after React hydrates. Crawlers that don't execute JS (most of them) only see the static `index.html` meta tags. Currently these are generic site-wide defaults. We can't set per-page tags without SSR, but we can make the defaults more descriptive.

**Current** (line 30-33):
```html
<meta name="description" content="Transform your website into AI-ready content with our intelligent LLMs.txt file generator. Free analysis with premium AI-enhanced features.">
```

**This is actually fine** as a site-wide default. No change needed here -- the `useSEO()` additions in Task 1 handle per-page specifics for JS-capable crawlers.

---

### Task 5 (Optional/Future): Pre-rendering

**Context**: Full SSR (Next.js migration) is a major effort. A lighter option is **Netlify pre-rendering** or a Vite pre-render plugin.

**Netlify pre-rendering**: Add to `netlify.toml`:
```toml
[build.processing]
  [build.processing.html]
    pretty_urls = true

# Enable Netlify prerendering for bots
[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "all"
```

Netlify has a built-in prerendering feature (paid add-on) that serves pre-rendered HTML to bots. Alternatively, use a Vite plugin like `vite-plugin-prerender` for static pre-rendering of key routes at build time.

**Decision**: Park this for now. Tasks 1-4 provide the most value for the effort.

---

## Verification

- [ ] All 7 public pages have `useSEO()` with unique title/description
- [ ] `sitemap.xml` includes `/validator` and has fresh `<lastmod>` dates
- [ ] `client/public/llms.txt` is a proper, hand-crafted file representing the site
- [ ] Run our own tool against llmtxtmastery.com -- descriptions should be more specific (meta tags now available)
- [ ] Check Google Search Console after deploy for improved indexing

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/pages/analyze.tsx` | Add `useSEO()` call |
| `client/src/pages/validate.tsx` | Add `useSEO()` call |
| `client/src/pages/terms.tsx` | Add `useSEO()` call |
| `client/src/pages/privacy.tsx` | Add `useSEO()` call |
| `client/src/pages/cookies.tsx` | Add `useSEO()` call |
| `client/src/pages/login.tsx` | Add `useSEO()` call |
| `client/src/pages/signup.tsx` | Add `useSEO()` call |
| `client/public/sitemap.xml` | Add /validator, update lastmod dates |
| `client/public/llms.txt` | Replace with proper hand-crafted content |
