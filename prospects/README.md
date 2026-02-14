# Prospect System

Automated llms.txt prospecting pipeline for LLMtxt Mastery.

## How it works

1. **prospects.json** — Master prospect database with scan results, outreach status, and notes
2. **scan-prospects.js** — Scans prospect URLs for llms.txt files, categorizes results
3. **templates/** — Outreach templates by pitch bucket (with subject lines and DM versions)

## Prospect statuses
- `new` — Added but not scanned
- `scanned` — Scanned, has llms.txt analysis
- `drafted` — Outreach message drafted
- `sent` — Outreach sent
- `replied` — Got a response
- `converted` — Signed up / became customer
- `dead` — No response after follow-ups

## Pitch buckets (based on scan)
- `no-file` — No llms.txt found → "AI can't find you" pitch
- `broken` — File exists but serves HTML or wrong content → "AI models can't parse this"
- `weak` — File exists but minimal/wrong format (< 50 words or robots.txt copy) → "AI models need more context"
- `auto-generated` — Massive dump, no curation (> 10K words) → "AI models are truncating/skipping this"
- `decent` — Has a real file but could be better → "Small gaps limiting AI discoverability"
- `strong` — Good file (80+ score) → maintenance/automation pitch

## Pitch Templates

Located in `templates/` directory. Each template includes:
- **Email subject line** — Specific to the scan findings
- **Full email/DM version** — 3-5 sentences, "honest dev" tone
- **Twitter/X DM version** — Shorter, more casual version
- **Personalization placeholders** — `{{name}}`, `{{site}}`, `{{wordCount}}`, `{{issue}}`

### Template Files:
- **broken.md** — File serves HTML/robots.txt content instead of AI-readable text
- **weak.md** — File exists but minimal content (<50 words, missing structure)  
- **auto-generated.md** — Massive content dump (>10K words) that AI models truncate
- **decent.md** — Real file but missing key elements (headers, URLs, structure)
- **no-file.md** — No llms.txt at all ("invisible to AI search")
- **index.md** — Overview of all templates and usage guidelines

### Tone Guidelines:
- **Honest dev approach** — Self-deprecating about outreach, genuine about the product
- **Slightly alarming** — Point out real consequences without fearmongering
- **Value feedback** — Position as wanting their input, not just their money
- **Technical but accessible** — Use "AI models" not "LLMs"

## Outreach Tracking

Each prospect has enhanced `outreach` object with granular tracking:

### Core Fields:
- `status` — Pipeline stage (new → scanned → drafted → sent → replied → converted/dead)
- `pitch` — Bucket category for this prospect
- `channel` — Where they're active (twitter, linkedin, email)

### New Enhanced Fields:
- `method` — How we contacted them (email|dm|twitter-reply)
- `template` — Which template was used (broken|weak|auto-generated|decent|no-file)
- `sentAt` — ISO timestamp when outreach was sent
- `followUp1At` — First follow-up timestamp
- `followUp2At` — Second follow-up timestamp
- `repliedAt` — When they responded
- `replyType` — Response sentiment (positive|neutral|negative|none)
- `convertedAt` — When they signed up / became customer
- `notes` — Free-form notes about the interaction

### Example Tracking:
```json
"outreach": {
  "status": "replied",
  "pitch": "no-file",
  "channel": "twitter",
  "method": "dm",
  "template": "no-file", 
  "sentAt": "2026-02-05T10:30:00Z",
  "followUp1At": null,
  "followUp2At": null,
  "repliedAt": "2026-02-05T14:22:00Z",
  "replyType": "positive",
  "convertedAt": null,
  "notes": "Interested but wants to see demo first"
}
```

## Workflow

1. **Add prospects** to prospects.json (name, url, channel, handle)
2. **Run scanner:** `node scan-prospects.js` to scan and categorize
3. **Draft outreach** using templates + scan data with personalized placeholders:
   - `{{name}}` → First name (or full name for formal)
   - `{{site}}` → Domain only (no https://)
   - `{{wordCount}}` → Formatted with commas for large numbers
   - `{{issue}}` → Specific problem from scan results
4. **Send outreach** and update tracking fields (`method`, `sentAt`, etc.)
5. **Track responses** and update `repliedAt`, `replyType`, conversion status
6. **Follow up** as needed, tracking `followUp1At` and `followUp2At`

## Scanner Usage

```bash
# Scan all prospects
node scan-prospects.js

# Scan only new (unscanned) prospects  
node scan-prospects.js --only new

# Quick single-URL check
node scan-prospects.js --url https://example.com
```

## Current Bucket Distribution

Based on latest scan of 10 prospects:
- **no-file:** 6 prospects (60%) — Most common, use no-file.md template
- **broken:** 3 prospects (30%) — Use broken.md template
- **decent:** 1 prospect (10%) — Use decent.md template  
- **auto-generated:** 1 prospect (10%) — Use auto-generated.md template
- **weak:** 0 prospects (0%) — Use weak.md template

Most prospects fall into `no-file` or `broken` categories, making those templates most critical to optimize.