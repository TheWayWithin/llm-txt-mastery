# Prospect System

Automated llms.txt prospecting pipeline for LLMtxt Mastery.

## How it works

1. **prospects.json** — Master prospect database with scan results, outreach status, and notes
2. **scan-prospects.js** — Scans prospect URLs for llms.txt files, categorizes results
3. **templates/** — Outreach templates by pitch bucket

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
- `broken` — File exists but serves HTML or wrong content
- `weak` — File exists but minimal/wrong format (< 50 words or robots.txt copy)
- `auto-generated` — Massive dump, no curation (> 10K words)
- `decent` — Has a real file but could be better
- `strong` — Good file (80+ score) → maintenance/automation pitch

## Workflow
1. Add prospects to prospects.json (name, url, channel, handle)
2. Run `node scan-prospects.js` to scan and categorize
3. Draft outreach using templates + scan data
4. Track status through pipeline
