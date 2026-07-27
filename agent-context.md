# Agent Context - Web Infrastructure Assessment Mission

## Mission Objective
Investigate and implement critical web infrastructure files for llmtxtmastery.com:
- sitemap.xml (SEO discoverability)
- robots.txt (crawler management)
- Web server configuration (redirects, security, URL rewriting)

## Current State
- Production: https://llmtxtmastery.com (Netlify, main branch)
- Staging: https://develop--llm-txt-mastery.netlify.app (Netlify, develop branch)
- Frontend: React 18 + TypeScript + Vite (Netlify)
- Backend: Express.js on Railway
- Deployment: Auto-deploy from GitHub (main → production, develop → staging)

## Mission Scope
1. Assess current state of SEO/infrastructure files
2. Research best practices for SaaS applications
3. Determine implementation approach for Netlify + Railway architecture
4. Create deployment and maintenance plan
5. Provide actionable recommendations

## Known Constraints
- Netlify hosting (not Apache, so no .htaccess)
- Static frontend with SPA routing
- Separate backend on Railway
- Need staging and production configurations

## Accumulated Findings

### Web Infrastructure Assessment (2025-10-24)
**Specialist**: THE ARCHITECT

**Current State**:
- ❌ sitemap.xml MISSING - Search engines cannot discover pages
- ❌ robots.txt MISSING - No crawler control
- ❌ _headers MISSING - No security headers
- ✅ netlify.toml EXISTS - Basic config, needs SEO updates

**Impact**: SEO severely impacted, no search engine discoverability

**Root Cause**: Files don't exist, and SPA fallback would catch them anyway

**Solution Designed**: Three static files + netlify.toml updates with `force = true` redirects

**Architecture Document**: `web-infrastructure-assessment.md` (complete specifications)

**Application Routes Analyzed**: 11 public pages, 7 protected routes
- Public: /, /pricing, /validate, /analyze, /about, /docs, /blog, /contact, /privacy, /terms, /cookies
- Protected: /dashboard, /login, /signup, /analysis/:id, auth flows

## Critical Decisions

### Decision 1: Static Files vs Build-time Generation
**Choice**: Static files for MVP, build-time generation for future
**Rationale**: Faster implementation (< 1 hour vs 4-8 hours), sufficient for 11 pages
**Trade-off**: Manual maintenance for new pages (acceptable for current scale)

### Decision 2: Security-First Headers
**Choice**: Implement comprehensive security headers (_headers file)
**Rationale**: Prevent XSS, clickjacking, MIME attacks; align with existing CSP
**Compliance**: All headers work WITH security requirements, no compromises

### Decision 3: Netlify-Native Solution
**Choice**: Use `force = true` redirects in netlify.toml for SEO files
**Rationale**: Correct Netlify approach per official docs (not a workaround)
**Alternative Rejected**: Apache .htaccess (not supported on Netlify)

### Decision 4: robots.txt User Data Protection
**Choice**: Block /analysis/:id from crawlers
**Rationale**: Prevent user-specific analysis results from appearing in search results
**Security Benefit**: Protects user data privacy

## Dependencies & Blockers

### Ready for Implementation
- ✅ All architecture decisions complete
- ✅ All specifications documented
- ✅ Research complete (Netlify best practices)
- ✅ Routes analyzed (App.tsx)
- ✅ Implementation plan created (4 phases)

### Next Steps
- Awaiting @developer for file creation and deployment
- No blockers identified
- Estimated effort: 2-4 hours
- Priority: HIGH

---

## Migrated from handoff-notes.md (2026-05-07)

# Handoff Notes

## Current State
**Completed**: Sprint 15 (Generation Quality Overhaul) — all 6 phases + validator fix + dedup fix
**Status**: Deployed to production and staging (both aligned at commit `762bebb`)
**Next**: Sprint 10 (JS Rendering Quality Fix) or Sprint 14 (Drift Monitoring)
**Last Updated**: 2026-03-28
**Branch**: `main` and `develop` aligned

---

## What Was Built: Sprint 15

### Summary
Complete overhaul of llms.txt generation quality — switched LLM model, fixed duplicate descriptions, added real body content to llms-full.txt, fixed blockquote to use site names, cleaned semantic tags, auto-filtered legal pages, and fixed validator scoring bugs.

### Key Changes
| Phase | What | Key Files |
|-------|------|-----------|
| 1 | LLM model `gpt-4o-mini` → `minimax/minimax-m2.5` | Railway env vars (both envs) |
| 2 | Restored dedup guidance in AI prompt | `server/services/openai.ts` |
| 3 | `bodyContent` extraction for llms-full.txt | `shared/schema.ts`, `server/services/sitemap-enhanced.ts`, `server/routes.ts` |
| 4 | Blockquote uses site name from `<title>` | `server/routes.ts` |
| 5 | Semantic tags rewrite (content-type only, max 2) | `server/routes.ts` |
| 6 | Legal pages auto-filtered to Optional | `server/routes.ts` |
| Fix | Validator freshness/size scoring proportional | `server/services/validation.ts` |
| Fix | Post-generation dedup for remaining duplicates | `server/routes.ts` |

### Test Results
- **New feature tests**: 7/7 PASS
- **Regression tests**: 10/10 PASS
- **Cross-site quality**: Tested Next.js SSR, Static/Marketing, Minimal marketing sites
- **Test suite**: `tests/generation-quality.test.ts` (reusable, run with `npx tsx tests/generation-quality.test.ts staging`)

---

## Recently Completed

### Sprint 13 — Benchmark Completion Polish (2026-03-25) ✅
- Copy buttons for deployment snippets, zip download, format comparison
- Platform guides (WordPress, Shopify, Squarespace, Wix, Webflow, Next.js)
- Validator Quick Fix (auto-correct missing H1/blockquote/malformed list items)
- Commits: `0f29d2b`, `aa1d938` (usage bug fix)

### Usage Display Bug Fix (2026-03-26) ✅
- Solo tier showed 37/20 analyses — capped creditsRemaining at tier limit via `Math.min()`

---

## Queued Sprints

| Sprint | Status | Priority |
|--------|--------|----------|
| 10: JS Rendering Quality Fix | READY | HIGH |
| 14: Drift Monitoring | Planned | MEDIUM |

---

## Environment Reference

| Environment | Frontend | Backend | Deploys From |
|-------------|----------|---------|-------------|
| Production | https://llmtxtmastery.com | https://llm-txt-mastery-production.up.railway.app | `main` |
| Staging | https://develop--llm-txt-mastery.netlify.app | https://llm-txt-mastery-staging.up.railway.app | `develop` |

---

## Important Context

- **MiniMax M2.5** (`minimax/minimax-m2.5`) is the production LLM model — accessed via OpenRouter, same API shape as OpenAI
- **`bodyContent`** field is optional on DiscoveredPage/SelectedPage — backward compatible with existing analyses
- **Content extraction** uses cheerio to strip nav/footer/script/style, takes main content area, truncates to 4000 chars
- **Semantic tags** now URL-path-based: `[article]`, `[guide]`, `[tool]`, `[product]`, `[informational]`, `[contact]`, `[educational]`
- **Legal filtering** uses URL pattern matching: `/privacy`, `/terms`, `/cookies`, `/legal`, `/tos`, `/gdpr`, `/disclaimer`, `/imprint`
- **Validator freshness** is now proportional (19/20 = 95%, not binary 0/100)
- **Post-generation dedup** strips parenthetical context and structured-items suffixes before comparing descriptions
- **Test account**: `jamie.watters.mail@icloud.com` / `Qwerty123!` (Solo tier)
- The `coffee` tier still exists in DB for legacy users — code handles both `solo` and `coffee`
- **`cancelled` tier** — users downgrade to this on cancellation
