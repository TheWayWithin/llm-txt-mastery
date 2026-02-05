# LLMtxt Mastery Pitch Templates

Pitch templates organized by scan result bucket. Each template follows the "honest dev" tone: slightly alarming but helpful, not salesy.

## Template Overview

### 1. `broken.md` — File exists but broken
**When to use:** File serves HTML, robots.txt content, or wrong content type
**Key angle:** "AI models literally can't parse this"
**Placeholders:** `{{name}}`, `{{site}}`, `{{issue}}`
**Example issues:** "HTML homepage", "robots.txt content", "wrong site's content"

### 2. `weak.md` — File exists but minimal
**When to use:** File exists but <50 words, no structure, missing headers
**Key angle:** "AI models need more structured context"  
**Placeholders:** `{{name}}`, `{{site}}`, `{{wordCount}}`, `{{issue}}`
**Example issues:** "no headers", "missing key URLs", "only basic info"

### 3. `auto-generated.md` — Massive content dump
**When to use:** File >10K words, clearly auto-generated
**Key angle:** "AI models are truncating/skipping this massive file"
**Placeholders:** `{{name}}`, `{{site}}`, `{{wordCount}}`
**Key insight:** More content can actually hurt AI discoverability

### 4. `decent.md` — Good file but improvable
**When to use:** Real content, proper structure, but missing key elements
**Key angle:** "Small gaps that limit AI discoverability"
**Placeholders:** `{{name}}`, `{{site}}`, `{{wordCount}}`, `{{issue}}`
**Example issues:** "missing H1 header", "only 2 URLs linked", "could add structured sections"

### 5. `no-file.md` — No llms.txt at all
**When to use:** No file found at any standard path
**Key angle:** "Invisible to AI search — like the fastest-growing search paradigm"
**Placeholders:** `{{name}}`, `{{site}}`
**Most common scenario:** 90%+ of sites fall into this bucket

## Usage Notes

### Tone Guidelines
- **Honest dev approach:** Self-deprecating about outreach, genuine about the product
- **Slightly alarming:** Point out the real consequences, but don't fearmongerer
- **Value feedback:** Position as wanting their input, not just their money
- **Technical but accessible:** Use terms like "AI models" not "LLMs"

### Personalization Tips
- **{{name}}:** Use first name only for DMs, full name for formal emails
- **{{site}}:** Always use just the domain (no https://)
- **{{issue}}:** Be specific based on scan results
- **{{wordCount}}:** Include comma separators for large numbers (195,000 not 195000)

### Platform Variations
- **Email:** Use full subject line and email version
- **Twitter/X DM:** Use shorter DM version, more casual tone
- **LinkedIn:** Use email version but professional greeting

## Integration with Outreach Tracking

Templates link to the `outreach.template` field in prospects.json:
- `broken` → broken.md
- `weak` → weak.md  
- `auto-generated` → auto-generated.md
- `decent` → decent.md
- `no-file` → no-file.md

## Bucket Distribution (Current Prospects)
Based on latest scan results:
- **no-file:** 6 prospects (60%)
- **decent:** 1 prospect (10%) 
- **broken:** 3 prospects (30%)
- **auto-generated:** 1 prospect (10%)
- **weak:** 0 prospects (0%)

Most prospects fall into no-file or broken categories, making those templates most important to nail.