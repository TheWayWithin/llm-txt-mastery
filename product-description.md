# LLM.txt Mastery — Product Description

**Last Updated**: March 2026

---

## What It Is

LLM.txt Mastery is an AI-powered SaaS tool that analyzes websites and generates llms.txt files — structured text files that tell AI models like ChatGPT, Claude, and Perplexity what your site is about and which pages to reference.

**URL**: https://llmtxtmastery.com

## The Problem

AI search engines are answering users' questions without sending them to your website. 844,000+ sites have adopted the llms.txt standard to stay visible, but generating a high-quality file requires understanding the spec, evaluating page content, and optimizing for how AI models actually process information.

Free generators list every page equally — including your privacy policy. They don't detect JavaScript frameworks, can't evaluate content quality, and produce generic descriptions that all sound the same.

## What Makes Us Different

### Three Output Formats (Only Generator With All Three)

| Format | File | What It Does |
|--------|------|-------------|
| **Standard** | `llms.txt` | Structured page index with AI-optimised descriptions. The official format per llmstxt.org. |
| **Full** | `llms-full.txt` | Complete page content inline — real body text up to 4,000 chars per page. Used by Anthropic (481K tokens), Cloudflare (3.7M tokens), Vercel. |
| **Mini** | `llms-mini.txt` | Ultra-compact: top 5 pages in under 500 tokens. Purpose-built for AI agents that need fast site classification before deciding to fetch more. **No other generator produces this format.** |

### AI-Powered Quality Scoring

Every page gets an AI quality score (1-10) using MiniMax M2.5. The model evaluates content value for AI consumption — not just whether the page exists. Pages below the quality threshold are automatically excluded or moved to the Optional section.

### Validator with Compliance Grading

The only llms.txt validator with weighted composite scoring:
- **Spec Structure** (40%) — H1 title, blockquote, URL sections, descriptions
- **Content Quality** (30%) — descriptiveness, completeness, URL description ratio
- **Freshness** (20%) — HEAD requests to verify all listed URLs still respond
- **Size Optimization** (10%) — token count relative to context window fit

Grades: A (95%+), B (80-94%), C (60-79%), D (<60%)

### Smart Generation Features

- **Duplicate description prevention** — detects shared meta tags (common on SPAs) and generates unique descriptions per page
- **Body content extraction** — strips nav/footer/scripts, extracts main content area using cheerio
- **Site name in blockquote** — extracts brand name from `<title>` tag instead of saying "This page"
- **Content-type semantic tags** — `[article]`, `[guide]`, `[tool]`, `[product]`, `[informational]`, `[contact]` (max 2 per entry)
- **Legal page filtering** — Privacy/Terms/Cookies auto-moved to Optional section
- **SPA/JavaScript detection** — identifies React, Next.js, Vue, Angular, Gatsby, Astro frameworks
- **Platform deployment guides** — step-by-step for WordPress, Shopify, Squarespace, Wix, Webflow, Next.js

## Pricing

| Tier | Price | Analyses | Pages/Analysis | AI Analysis |
|------|-------|----------|----------------|-------------|
| **Starter** | Free | 3/day | 20 | Yes |
| **Solo** | $4.95/mo | 20/mo | 200 | Yes |
| **Growth** | $9.95/mo | 35/mo | 500 | Yes |
| **Scale** | $19.95/mo | 100/day | 1,000 | Yes + JS rendering |

7-day free trial available (Growth features, no charge).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, Drizzle ORM |
| Database | PostgreSQL via Neon (separate production/staging projects) |
| AI Model | MiniMax M2.5 via OpenRouter (OpenAI-compatible API) |
| Payments | Stripe (subscriptions + one-time credits) |
| Hosting | Netlify (frontend), Railway (backend) |
| Email | Resend |

## Architecture

- **Frontend**: React SPA on Netlify global CDN, auto-deploys from `main` branch
- **Backend**: Monolithic Express.js on Railway, auto-deploys from `main` branch
- **Database**: Neon PostgreSQL with 13+ tables, connection pooling, SSL required
- **Environments**: Production (`main` → llmtxtmastery.com) and Staging (`develop` → develop--llm-txt-mastery.netlify.app)

See `architecture.md` for complete system architecture documentation.

## Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `/` | Hero, how-it-works, format showcase, pricing, FAQ |
| Analyze | `/analyze` | Enter URL, run analysis, select pages, generate files |
| Validator | `/validator` | Validate existing llms.txt files with compliance grading |
| Dashboard | `/dashboard` | Usage stats, recent analyses, account management |
| Docs | `/docs` | Format explanations, compliance grading, deployment guides |
| Pricing | `/pricing` | 4-tier comparison with feature lists |

## Target Users

1. **SaaS founders** who want their product recommended by AI assistants
2. **Content marketers** optimizing for AI search visibility alongside traditional SEO
3. **Web developers** implementing llms.txt for clients
4. **SEO agencies** adding AI visibility as a service offering

## Competitive Landscape

| Competitor | llms.txt | llms-full.txt | llms-mini.txt | Validator | AI Quality Scoring |
|-----------|----------|---------------|---------------|-----------|-------------------|
| **LLM.txt Mastery** | Yes | Yes (real content) | **Yes (exclusive)** | Yes (A/B/C/D grading) | Yes (MiniMax M2.5) |
| Firecrawl | Yes | Yes | No | No | No |
| Mintlify | Yes (auto) | Yes (auto) | No | No | No |
| GitBook | Yes (auto) | Yes (auto) | No | No | No |
| Yoast SEO | Yes | No | No | No | No |
| LLMsTxtGenerator.de | Yes | Yes | No | No | No |

**Key differentiators**: llms-mini.txt format (exclusive), validator with compliance grading, AI quality scoring per page, three-format generation from single analysis, SPA/JavaScript framework detection.
