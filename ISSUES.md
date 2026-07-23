# llm-txt-mastery — Issue & Project Register

**This is the single source of truth for what is open in this repo.** One row per
issue/project. Detail lives in the linked doc; this file is the index the Mission
Control reconcile (`repo-reconcile.py`) reads and mirrors to the cockpit.

## ID convention (collision-safe)

Mission Control owns the bare `ISS-`/`PRJ-`/`T-` namespaces. **Every llm-txt-mastery ID
carries the `LTM-` prefix** so it can never collide with a Mission-Control-native
ID or another repo's. Raise issues here with `python3 ~/shared/scripts/repo-issue.py`.

---

## Open

| ID | Title | Status | Severity | Detail | MC-SYNC |
|----|-------|--------|----------|--------|---------|
| LTM-ISS-2 | Burn down the 261-error TS baseline (.tsc-baseline.txt) to zero and restore full tsc gate | Open | low | — | pending |
| LTM-ISS-1 | Pre-commit hook now catches ~40 pre-existing TypeScript errors blocking normal commits | ✅ Resolved 2026-07-23 — Commits unblocked: husky TS check now gates against committed error baseline (.tsc-baseline.txt, 261 pre-existing errors); new TS errors and secrets still blocked (all three hook tests proven), commit 2ff2639 | medium | — | pending |

## Recently closed

| ID | Title | Status | Commit | Detail |
|----|-------|--------|--------|--------|
